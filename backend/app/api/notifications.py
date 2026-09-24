"""
API Router for Email Notification Webhooks, Audit Logs, and Batch Reminders.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Request, BackgroundTasks, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from sqlalchemy.orm import selectinload

from pydantic import BaseModel
from app.core.database import get_db, AsyncSessionLocal
from app.core.config import settings
from app.models import EmailNotification, Booking, Hotel, Room
from app.schemas import EmailNotificationResponse, EmailWebhookEvent
from app.services.email_service import dispatch_checkin_reminder, execute_email_send

router = APIRouter(prefix="/internal/notifications", tags=["notifications"])


@router.post("/email-webhook")
async def email_provider_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Callback endpoint for transactional email providers (SendGrid, Resend, etc.)
    to notify delivery, bounce, or failure events and update notification statuses.
    """
    try:
        data = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    # SendGrid sends a JSON array of events; Resend sends a single event object
    events = data if isinstance(data, list) else [data]
    updated_count = 0

    for item in events:
        event_type = (item.get("type") or item.get("event") or "").lower()
        
        # Extract message ID
        provider_msg_id = (
            item.get("data", {}).get("email_id")
            or item.get("sg_message_id")
            or item.get("message_id")
            or item.get("id")
        )

        if provider_msg_id and "." in str(provider_msg_id) and "filter" in str(provider_msg_id):
            # SendGrid message IDs sometimes append filter/send suffixes like "msgid.filterdrecv-..."
            provider_msg_id = provider_msg_id.split(".")[0]

        if not provider_msg_id:
            continue

        # Look for matching notification
        query = select(EmailNotification).where(
            EmailNotification.provider_message_id.like(f"%{provider_msg_id}%")
        )
        res = await db.execute(query)
        notification = res.scalars().first()

        if notification:
            if any(term in event_type for term in ["delivered", "email.delivered"]):
                notification.status = "delivered"
            elif any(term in event_type for term in ["bounce", "bounced", "email.bounced", "dropped"]):
                notification.status = "bounced"
                notification.error_message = item.get("reason") or "Bounced by provider"
            elif any(term in event_type for term in ["failed", "complaint", "spamreport"]):
                notification.status = "failed"
                notification.error_message = item.get("reason") or "Delivery failed or spam complaint"
            
            notification.updated_at = datetime.now(timezone.utc)
            updated_count += 1

    await db.commit()
    return {"status": "success", "events_processed": len(events), "updated_count": updated_count}


@router.get("", response_model=List[EmailNotificationResponse])
async def list_notifications(
    booking_id: Optional[int] = Query(None),
    email_type: Optional[str] = Query(None),
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    skip: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Lists logged email notifications for audit and troubleshooting.
    """
    query = select(EmailNotification).order_by(EmailNotification.created_at.desc())

    if booking_id:
        query = query.where(EmailNotification.booking_id == booking_id)
    if email_type:
        query = query.where(EmailNotification.email_type == email_type)
    if status_filter:
        query = query.where(EmailNotification.status == status_filter)

    query = query.offset(skip).limit(limit)
    res = await db.execute(query)
    return res.scalars().all()


@router.get("/{notification_id}", response_model=EmailNotificationResponse)
async def get_notification_detail(
    notification_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch a single email notification record by ID.
    """
    record = await db.get(EmailNotification, notification_id)
    if not record:
        raise HTTPException(status_code=404, detail="Notification not found")
    return record


@router.post("/send-reminders")
async def trigger_checkin_reminders(
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Batch job to find upcoming stays checking in between 24 and 48 hours from today,
    and queue check-in reminder emails for guests who have not yet received one.
    """
    today = datetime.now(timezone.utc).date()
    target_date_1 = (today + timedelta(days=1)).strftime("%Y-%m-%d")
    target_date_2 = (today + timedelta(days=2)).strftime("%Y-%m-%d")

    # Find active confirmed bookings checking in tomorrow or day after tomorrow
    query = (
        select(Booking)
        .where(
            and_(
                Booking.status == "confirmed",
                Booking.check_in.in_([target_date_1, target_date_2])
            )
        )
        .options(selectinload(Booking.hotel), selectinload(Booking.room))
    )
    result = await db.execute(query)
    upcoming_bookings = result.scalars().all()

    reminders_queued = 0
    for b in upcoming_bookings:
        # Check if reminder already sent for this booking
        existing_res = await db.execute(
            select(EmailNotification).where(
                and_(
                    EmailNotification.booking_id == b.id,
                    EmailNotification.email_type == "checkin_reminder"
                )
            )
        )
        if not existing_res.scalars().first():
            dispatch_checkin_reminder(background_tasks, b, b.hotel, b.room)
            reminders_queued += 1

    return {
        "status": "success",
        "target_dates": [target_date_1, target_date_2],
        "eligible_bookings_found": len(upcoming_bookings),
        "reminders_queued": reminders_queued
    }


class TestEmailRequest(BaseModel):
    recipient_email: str


@router.post("/test-email")
async def send_test_email(
    payload: TestEmailRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Triggers a test email delivery to verify SMTP or API provider configuration.
    """
    subject = "HavenStay Hotel Booking - Test Delivery Confirmation"
    html_content = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <h2 style="color: #0f172a; margin-bottom: 8px;">HavenStay Email System Check</h2>
        <p style="color: #475569; font-size: 15px; line-height: 1.5;">
            This is a test notification confirming that your HavenStay booking email dispatch pipeline is operating smoothly.
        </p>
        <div style="margin: 20px 0; padding: 16px; background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; color: #166534;">
            <strong>✓ Delivery Service Active</strong><br>
            Provider configured: <code>{settings.EMAIL_PROVIDER.upper()}</code><br>
            Recipient: <code>{payload.recipient_email}</code>
        </div>
        <p style="color: #64748b; font-size: 13px;">
            Sent automatically by HavenStay Responsible Hotel Booking Platform.
        </p>
    </div>
    """
    text_content = f"HavenStay Email System Check: Test notification confirming email dispatch pipeline is operational for {payload.recipient_email}."

    background_tasks.add_task(
        execute_email_send,
        booking_id=None,
        user_id=None,
        recipient_email=payload.recipient_email,
        email_type="test_email",
        subject=subject,
        html_content=html_content,
        text_content=text_content,
        bypass_rate_limit=True
    )

    return {
        "success": True,
        "message": f"Test email queued for {payload.recipient_email}",
        "provider": settings.EMAIL_PROVIDER
    }

