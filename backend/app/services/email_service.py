"""
Transactional Email Service for HavenStay Hotel Booking Backend.
Handles asynchronous email delivery via Resend, SendGrid, or Mock provider,
database logging in `email_notifications`, rate-limiting, and retry with exponential backoff.
"""

import re
import uuid
import asyncio
import logging
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from datetime import datetime, timezone, timedelta
from typing import Optional, Dict, Any, List

import httpx
from sqlalchemy import select, and_
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import EmailNotification, Booking, Hotel, Room, User
from app.services import email_templates

logger = logging.getLogger("email_service")
logger.setLevel(logging.INFO)

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")


# ----------------------------------------------------------------------
# Providers
# ----------------------------------------------------------------------
class EmailProviderBase:
    async def send(self, to_email: str, subject: str, html_content: str, text_content: str) -> str:
        raise NotImplementedError


class SmtpEmailProvider(EmailProviderBase):
    """
    Standard SMTP email provider with TLS / SSL support (e.g. Gmail App Passwords,
    Brevo, Outlook, or custom SMTP mail servers). Runs safely in an async threadpool.
    """
    def __init__(
        self,
        host: str,
        port: int,
        user: Optional[str],
        password: Optional[str],
        from_email: str,
        use_tls: bool = True,
        use_ssl: bool = False
    ):
        self.host = host
        self.port = port
        self.user = user
        self.password = password
        self.from_email = from_email
        self.use_tls = use_tls
        self.use_ssl = use_ssl

    def _sync_send(self, to_email: str, subject: str, html_content: str, text_content: str) -> str:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = self.from_email
        msg["To"] = to_email
        msg_id = f"smtp_{uuid.uuid4().hex[:14]}"
        msg["Message-ID"] = f"<{msg_id}@{self.host or 'havenstay.local'}>"

        part_text = MIMEText(text_content, "plain", "utf-8")
        part_html = MIMEText(html_content, "html", "utf-8")
        msg.attach(part_text)
        msg.attach(part_html)

        sender_clean = self.from_email.split("<")[-1].replace(">", "").strip() if "<" in self.from_email else self.from_email

        if self.use_ssl:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(self.host, self.port, context=context, timeout=15) as server:
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(sender_clean, [to_email], msg.as_string())
        else:
            with smtplib.SMTP(self.host, self.port, timeout=15) as server:
                if self.use_tls:
                    context = ssl.create_default_context()
                    server.starttls(context=context)
                if self.user and self.password:
                    server.login(self.user, self.password)
                server.sendmail(sender_clean, [to_email], msg.as_string())

        logger.info(f"[SmtpEmailProvider] Delivered email to {to_email} via {self.host}:{self.port} (ID: {msg_id})")
        return msg_id

    async def send(self, to_email: str, subject: str, html_content: str, text_content: str) -> str:
        return await asyncio.to_thread(self._sync_send, to_email, subject, html_content, text_content)


class ResendEmailProvider(EmailProviderBase):
    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email
        self.endpoint = "https://api.resend.com/emails"

    async def send(self, to_email: str, subject: str, html_content: str, text_content: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "from": self.from_email,
            "to": [to_email],
            "subject": subject,
            "html": html_content,
            "text": text_content
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(self.endpoint, json=payload, headers=headers)
            if res.status_code >= 400:
                raise RuntimeError(f"Resend API error ({res.status_code}): {res.text}")
            data = res.json()
            return data.get("id", f"resend_{uuid.uuid4().hex[:12]}")


class SendGridEmailProvider(EmailProviderBase):
    def __init__(self, api_key: str, from_email: str):
        self.api_key = api_key
        self.from_email = from_email
        self.endpoint = "https://api.sendgrid.com/v3/mail/send"

    async def send(self, to_email: str, subject: str, html_content: str, text_content: str) -> str:
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        payload = {
            "personalizations": [{"to": [{"email": to_email}]}],
            "from": {"email": self.from_email.split("<")[-1].replace(">", "").strip() if "<" in self.from_email else self.from_email},
            "subject": subject,
            "content": [
                {"type": "text/plain", "value": text_content},
                {"type": "text/html", "value": html_content}
            ]
        }
        async with httpx.AsyncClient(timeout=10.0) as client:
            res = await client.post(self.endpoint, json=payload, headers=headers)
            if res.status_code >= 400:
                raise RuntimeError(f"SendGrid API error ({res.status_code}): {res.text}")
            msg_id = res.headers.get("x-message-id", f"sg_{uuid.uuid4().hex[:12]}")
            return msg_id


class MockEmailProvider(EmailProviderBase):
    """
    In-memory / console provider used strictly in development or testing environments,
    or when no provider credentials are configured.
    """
    sent_messages: List[Dict[str, Any]] = []

    async def send(self, to_email: str, subject: str, html_content: str, text_content: str) -> str:
        msg_id = f"mock_{uuid.uuid4().hex[:16]}"
        record = {
            "id": msg_id,
            "to": to_email,
            "subject": subject,
            "html": html_content,
            "text": text_content,
            "sent_at": datetime.now(timezone.utc)
        }
        self.sent_messages.append(record)

        is_production = (getattr(settings, "ENVIRONMENT", "development") or "development").lower() in ("production", "prod")
        if is_production:
            logger.critical(
                f"[EMAIL_ALERT_CRITICAL] MockEmailProvider was invoked to send an email in PRODUCTION environment! "
                f"Recipient: {to_email}, Subject: '{subject}'. NO REAL EMAIL HAS BEEN DELIVERED."
            )
        else:
            logger.warning(
                f"[MOCK_EMAIL_SIMULATED] Simulated email to {to_email}: '{subject}' (ID: {msg_id}) - "
                f"Running in {getattr(settings, 'ENVIRONMENT', 'development')} mode. No real network dispatch occurred."
            )
        return msg_id


def validate_sender_domain(from_email: str, provider_name: str) -> tuple[bool, str]:
    """
    Validates that the sender domain in EMAIL_FROM is not an unverified local domain
    like @havenstay.local or @localhost when using real providers (Resend / SendGrid),
    which causes mail delivery APIs to fail with 403 / 422 errors.
    """
    clean_sender = from_email.split("<")[-1].replace(">", "").strip() if "<" in from_email else from_email.strip()
    if "@" in clean_sender:
        domain = clean_sender.split("@")[-1].lower()
        unverified_domains = {"havenstay.local", "localhost", "example.com", "test.com", "local", "invalid"}
        if domain in unverified_domains:
            msg = (
                f"[EMAIL_DOMAIN_UNVERIFIED] Sender address '{from_email}' uses an unverified/local domain '{domain}'. "
                f"Public email providers like {provider_name.capitalize()} strictly require a verified custom domain, "
                f"or 'onboarding@resend.dev' for Resend testing. Emails sent from this address will fail delivery."
            )
            logger.warning(msg)
            return False, msg
    return True, "Domain valid"


# Active provider factory
mock_provider_instance = MockEmailProvider()

def get_email_provider() -> EmailProviderBase:
    provider_name = (settings.EMAIL_PROVIDER or "mock").lower().strip()
    env = (getattr(settings, "ENVIRONMENT", "development") or "development").lower().strip()
    is_production = env in ("production", "prod")

    # 1. SMTP Provider
    if provider_name == "smtp":
        if not settings.SMTP_HOST or not settings.SMTP_USER:
            error_msg = (
                f"[EMAIL_CONFIG_ERROR] EMAIL_PROVIDER is set to 'smtp', but SMTP_HOST or SMTP_USER is missing or empty."
            )
            logger.error(error_msg)
            if is_production:
                raise RuntimeError(
                    f"Production email configuration error: EMAIL_PROVIDER='smtp' requires valid SMTP_HOST and SMTP_USER. "
                    f"Refusing silent fallback to mock provider in production."
                )
            logger.warning(
                f"[EMAIL_FALLBACK] Falling back to MockEmailProvider because SMTP credentials are missing in {getattr(settings, 'ENVIRONMENT', 'development')}."
            )
            return mock_provider_instance

        validate_sender_domain(settings.EMAIL_FROM, "smtp")
        return SmtpEmailProvider(
            host=settings.SMTP_HOST,
            port=settings.SMTP_PORT,
            user=settings.SMTP_USER,
            password=settings.SMTP_PASSWORD,
            from_email=settings.EMAIL_FROM,
            use_tls=settings.SMTP_USE_TLS,
            use_ssl=settings.SMTP_USE_SSL
        )

    # 2. Resend Provider
    if provider_name == "resend":
        api_key = (settings.EMAIL_API_KEY or "").strip()
        is_invalid_key = (
            not api_key
            or len(api_key) < 8
            or api_key.startswith(("placeholder", "your-", "mock_", "test_"))
            or api_key == "re_placeholder"
        )
        if is_invalid_key:
            error_msg = (
                f"[EMAIL_CONFIG_ERROR] EMAIL_PROVIDER is set to 'resend', but EMAIL_API_KEY is missing, empty, or a placeholder."
            )
            logger.error(error_msg)
            if is_production:
                raise RuntimeError(
                    f"Production email configuration error: EMAIL_PROVIDER='resend' requires a valid Resend API key (starts with 're_'). "
                    f"Refusing silent fallback to mock provider in production."
                )
            logger.warning(
                f"[EMAIL_FALLBACK] Falling back to MockEmailProvider because Resend API key is missing or invalid in {getattr(settings, 'ENVIRONMENT', 'development')}. "
                f"Real emails WILL NOT be sent."
            )
            return mock_provider_instance

        validate_sender_domain(settings.EMAIL_FROM, "resend")
        return ResendEmailProvider(api_key=api_key, from_email=settings.EMAIL_FROM)

    # 3. SendGrid Provider
    if provider_name == "sendgrid":
        api_key = (settings.EMAIL_API_KEY or "").strip()
        is_invalid_key = (
            not api_key
            or len(api_key) < 8
            or api_key.startswith(("placeholder", "your-", "mock_", "test_"))
            or api_key == "SG.placeholder"
        )
        if is_invalid_key:
            error_msg = (
                f"[EMAIL_CONFIG_ERROR] EMAIL_PROVIDER is set to 'sendgrid', but EMAIL_API_KEY is missing, empty, or a placeholder."
            )
            logger.error(error_msg)
            if is_production:
                raise RuntimeError(
                    f"Production email configuration error: EMAIL_PROVIDER='sendgrid' requires a valid SendGrid API key (starts with 'SG.'). "
                    f"Refusing silent fallback to mock provider in production."
                )
            logger.warning(
                f"[EMAIL_FALLBACK] Falling back to MockEmailProvider because SendGrid API key is missing or invalid in {getattr(settings, 'ENVIRONMENT', 'development')}. "
                f"Real emails WILL NOT be sent."
            )
            return mock_provider_instance

        validate_sender_domain(settings.EMAIL_FROM, "sendgrid")
        return SendGridEmailProvider(api_key=api_key, from_email=settings.EMAIL_FROM)

    # 4. Explicit Mock Provider
    if provider_name == "mock":
        if is_production:
            logger.critical(
                "[EMAIL_CONFIG_CRITICAL] EMAIL_PROVIDER is configured to 'mock' in PRODUCTION environment! "
                "No real confirmation emails will reach customers."
            )
            raise RuntimeError(
                "Production email configuration error: EMAIL_PROVIDER='mock' cannot be used in a production environment. "
                "Please configure 'resend', 'sendgrid', or 'smtp' with valid credentials."
            )
        logger.info(f"[EMAIL_CONFIG] Using MockEmailProvider for {getattr(settings, 'ENVIRONMENT', 'development')} environment.")
        return mock_provider_instance

    # 5. Unknown Provider
    logger.error(f"[EMAIL_CONFIG_ERROR] Unknown EMAIL_PROVIDER: '{provider_name}'.")
    if is_production:
        raise RuntimeError(f"Unknown email provider '{provider_name}' in production environment.")
    return mock_provider_instance


def check_email_provider_at_startup():
    """
    Validates active email provider configuration on application startup.
    In production: refuses to boot or raises critical exception if using mock provider
    or if credentials/domains are misconfigured.
    In development/test: logs a clear diagnostic status message.
    """
    provider_name = (settings.EMAIL_PROVIDER or "mock").lower().strip()
    env = (getattr(settings, "ENVIRONMENT", "development") or "development").lower().strip()
    is_production = env in ("production", "prod")

    logger.info(
        f"[STARTUP_EMAIL_CHECK] Booting with EMAIL_ENABLED={settings.EMAIL_ENABLED}, "
        f"EMAIL_PROVIDER='{provider_name}', ENVIRONMENT='{settings.ENVIRONMENT}', "
        f"EMAIL_FROM='{settings.EMAIL_FROM}'"
    )

    if not settings.EMAIL_ENABLED:
        logger.warning(
            "[STARTUP_EMAIL_CHECK] EMAIL_ENABLED is set to FALSE. All transactional emails will be recorded as 'skipped' and not sent."
        )
        return

    try:
        resolved_provider = get_email_provider()
        provider_class_name = resolved_provider.__class__.__name__

        if isinstance(resolved_provider, MockEmailProvider):
            if is_production:
                logger.critical(
                    "[STARTUP_EMAIL_CHECK CRITICAL] Application is configured to run in PRODUCTION but email provider resolved to MockEmailProvider! Real emails WILL NOT be sent."
                )
                raise RuntimeError(
                    "Production boot blocked: Email provider resolved to MockEmailProvider. "
                    "Ensure EMAIL_PROVIDER is set to a real provider ('resend', 'sendgrid', 'smtp') and valid credentials are provided."
                )
            else:
                logger.warning(
                    f"[STARTUP_EMAIL_CHECK] Active Provider: {provider_class_name} (Simulation mode for {settings.ENVIRONMENT}). Real emails will NOT be sent."
                )
        else:
            logger.info(
                f"[STARTUP_EMAIL_CHECK] Active Provider: {provider_class_name} successfully resolved for {provider_name}."
            )

        validate_sender_domain(settings.EMAIL_FROM, provider_name)

    except Exception as exc:
        logger.error(f"[STARTUP_EMAIL_CHECK ERROR] Email service validation failure: {exc}")
        if is_production:
            raise


# ----------------------------------------------------------------------
# Validation & Anti-Abuse Rate Limiting
# ----------------------------------------------------------------------
def is_valid_email(email: str) -> bool:
    if not email or len(email) > 254:
        return False
    return bool(EMAIL_REGEX.match(email.strip()))


async def is_rate_limited(db, booking_id: Optional[int], recipient_email: str, email_type: str) -> bool:
    """
    Checks if a notification of the same type for this booking & recipient was already sent
    within the configured cooldown window (e.g. 1 minute) to prevent abuse or spamming.
    """
    if not booking_id:
        return False

    cooldown_seconds = max(10, settings.EMAIL_RATE_LIMIT_MINUTES * 60)
    cutoff = datetime.now(timezone.utc) - timedelta(seconds=cooldown_seconds)

    query = select(EmailNotification).where(
        and_(
            EmailNotification.booking_id == booking_id,
            EmailNotification.recipient_email == recipient_email.lower().strip(),
            EmailNotification.email_type == email_type,
            EmailNotification.status.in_(["sent", "queued", "delivered"]),
            EmailNotification.created_at >= cutoff
        )
    )
    result = await db.execute(query)
    existing = result.scalars().first()
    return existing is not None


# ----------------------------------------------------------------------
# Core Background Task with Exponential Backoff
# ----------------------------------------------------------------------
async def execute_email_send(
    booking_id: Optional[int],
    user_id: Optional[int],
    recipient_email: str,
    email_type: str,
    subject: str,
    html_content: str,
    text_content: str,
    bypass_rate_limit: bool = False
):
    """
    Executes in a background task with an isolated database session.
    Retries transient errors with exponential backoff up to settings.EMAIL_MAX_RETRIES.
    Guarantees that no exception ever leaks out to affect callers.
    """
    cleaned_email = recipient_email.strip().lower()

    async with AsyncSessionLocal() as db:
        try:
            # 1. Validation check
            if not is_valid_email(cleaned_email):
                logger.warning(f"Invalid recipient email format rejected: {cleaned_email}")
                failed_record = EmailNotification(
                    booking_id=booking_id,
                    user_id=user_id,
                    email_type=email_type,
                    recipient_email=cleaned_email,
                    subject=subject,
                    html_content=html_content,
                    status="failed",
                    error_message="Invalid recipient email syntax format"
                )
                db.add(failed_record)
                await db.commit()
                return

            # 2. Rate limit / spam check (can be bypassed for explicit user resend)
            if not bypass_rate_limit and await is_rate_limited(db, booking_id, cleaned_email, email_type):
                logger.warning(f"Suppressed duplicate {email_type} email to {cleaned_email} for booking {booking_id} (Rate limited)")
                return

            # 3. Create initial queued record with rendered preview content
            notification = EmailNotification(
                booking_id=booking_id,
                user_id=user_id,
                email_type=email_type,
                recipient_email=cleaned_email,
                subject=subject,
                html_content=html_content,
                status="queued"
            )
            db.add(notification)
            await db.commit()
            await db.refresh(notification)

            # Check if email sending is disabled
            if not settings.EMAIL_ENABLED:
                notification.status = "skipped"
                notification.error_message = "Email sending is disabled (EMAIL_ENABLED=False). Dispatch was skipped."
                notification.provider_message_id = f"disabled_{uuid.uuid4().hex[:8]}"
                notification.sent_at = None
                await db.commit()
                logger.info(f"Skipped dispatching {email_type} to {cleaned_email} (EMAIL_ENABLED=False, status='skipped')")
                return

            # 4. Resolve provider safely
            try:
                provider = get_email_provider()
            except Exception as prov_exc:
                logger.critical(
                    f"[EMAIL_ALERT_CRITICAL] Cannot resolve email provider for {email_type} to {cleaned_email}: {prov_exc}"
                )
                notification.status = "failed"
                notification.error_message = f"Email provider configuration error: {prov_exc}"
                await db.commit()
                return

            max_retries = max(1, settings.EMAIL_MAX_RETRIES)
            backoff = 1.0

            last_error = None
            for attempt in range(max_retries):
                try:
                    notification.retry_count = attempt
                    msg_id = await provider.send(
                        to_email=cleaned_email,
                        subject=subject,
                        html_content=html_content,
                        text_content=text_content
                    )
                    # Success
                    notification.status = "sent"
                    notification.provider_message_id = msg_id
                    notification.sent_at = datetime.now(timezone.utc)
                    notification.error_message = None
                    await db.commit()

                    if isinstance(provider, MockEmailProvider):
                        logger.warning(
                            f"[MOCK_EMAIL_DISPATCHED] {email_type} to {cleaned_email} was captured by MockEmailProvider "
                            f"(Msg ID: {msg_id}). NO REAL EMAIL WAS DISPATCHED TO CUSTOMER."
                        )
                    else:
                        logger.info(f"Successfully dispatched {email_type} to {cleaned_email} via {provider.__class__.__name__} (Msg ID: {msg_id})")
                    return
                except Exception as exc:
                    last_error = str(exc)
                    logger.warning(f"Email attempt {attempt + 1}/{max_retries} failed for {cleaned_email}: {exc}")
                    if attempt < max_retries - 1:
                        await asyncio.sleep(backoff)
                        backoff *= settings.EMAIL_RETRY_BACKOFF_FACTOR

            # If all retries exhausted, mark as failed and log CRITICAL alert
            notification.status = "failed"
            notification.error_message = f"Failed after {max_retries} attempts: {last_error}"
            await db.commit()
            logger.critical(
                f"[EMAIL_ALERT_CRITICAL] All {max_retries} delivery attempts exhausted for {email_type} "
                f"to '{cleaned_email}' (Booking ID: {booking_id}). Error: {last_error}"
            )

        except Exception as e:
            logger.exception(f"Unexpected fatal error inside execute_email_send: {e}")


# ----------------------------------------------------------------------
# Public Dispatch Helpers
# ----------------------------------------------------------------------
def dispatch_booking_confirmation(background_tasks, booking: Booking, hotel: Hotel, room: Room):
    subject, html_content, text_content = email_templates.render_booking_confirmation(booking, hotel, room)
    background_tasks.add_task(
        execute_email_send,
        booking_id=booking.id,
        user_id=booking.user_id,
        recipient_email=booking.guest_email,
        email_type="booking_confirmed",
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )


def dispatch_resend_booking_email(
    background_tasks,
    booking: Booking,
    hotel: Hotel,
    room: Room,
    recipient_override: Optional[str] = None
):
    target_recipient = recipient_override or booking.guest_email
    subject, html_content, text_content = email_templates.render_booking_confirmation(booking, hotel, room)
    background_tasks.add_task(
        execute_email_send,
        booking_id=booking.id,
        user_id=booking.user_id,
        recipient_email=target_recipient,
        email_type="booking_confirmed",
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        bypass_rate_limit=True
    )


def dispatch_booking_cancellation(background_tasks, booking: Booking, hotel: Hotel, room: Room):
    subject, html_content, text_content = email_templates.render_booking_cancellation(booking, hotel, room)
    background_tasks.add_task(
        execute_email_send,
        booking_id=booking.id,
        user_id=booking.user_id,
        recipient_email=booking.guest_email,
        email_type="booking_cancelled",
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )


def dispatch_payment_failed(background_tasks, booking: Booking, hotel: Hotel, room: Room, reason: Optional[str] = None):
    subject, html_content, text_content = email_templates.render_payment_failed(booking, hotel, room, reason)
    background_tasks.add_task(
        execute_email_send,
        booking_id=booking.id,
        user_id=booking.user_id,
        recipient_email=booking.guest_email,
        email_type="payment_failed",
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )


def dispatch_booking_modified(background_tasks, booking: Booking, hotel: Hotel, room: Room, previous_details: Optional[Dict[str, Any]] = None):
    subject, html_content, text_content = email_templates.render_booking_modified(booking, hotel, room, previous_details)
    background_tasks.add_task(
        execute_email_send,
        booking_id=booking.id,
        user_id=booking.user_id,
        recipient_email=booking.guest_email,
        email_type="booking_modified",
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )


def dispatch_checkin_reminder(background_tasks, booking: Booking, hotel: Hotel, room: Room):
    subject, html_content, text_content = email_templates.render_checkin_reminder(booking, hotel, room)
    background_tasks.add_task(
        execute_email_send,
        booking_id=booking.id,
        user_id=booking.user_id,
        recipient_email=booking.guest_email,
        email_type="checkin_reminder",
        subject=subject,
        html_content=html_content,
        text_content=text_content
    )
