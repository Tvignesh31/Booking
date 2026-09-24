import pytest
import httpx
import uuid
import asyncio
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.main import app
from app.core.config import settings
from app.core.database import AsyncSessionLocal
from app.models import EmailNotification, Booking, User, Hotel, Room
from app.services.email_service import is_valid_email, is_rate_limited, execute_email_send, mock_provider_instance

@pytest.mark.asyncio
async def test_admin_seeded_email():
    """Verify administrator user is seeded with thiruganamthiruganam2185@gmail.com"""
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(User).where(User.email == "thiruganamthiruganam2185@gmail.com"))
        admin = res.scalars().first()
        assert admin is not None
        assert admin.role == "admin"


@pytest.mark.asyncio
async def test_booking_creation_triggers_confirmation_email():
    """Verify that creating a booking queues and sends a confirmation email, logged in DB"""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create test user
        test_email = f"guest_{uuid.uuid4().hex[:8]}@example.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Sarah Connor",
            "email": test_email,
            "password": "Password123!",
            "phone": "+1 555-010-9988"
        })
        assert signup_res.status_code == 200
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get hotel and room
        hotel_res = await client.get("/api/v1/hotels/search")
        hotel = hotel_res.json()[0]
        room_res = await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")
        room = room_res.json()[0]

        # Book room
        payload = {
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2027-01-10",
            "check_out": "2027-01-13",
            "guests": 2,
            "rooms_count": 1,
            "guest_name": "Sarah Connor",
            "guest_email": test_email
        }
        res = await client.post("/api/v1/bookings", json=payload, headers=headers)
        assert res.status_code == 201
        booking_data = res.json()
        booking_id = booking_data["id"]

        # Allow FastAPI background task to complete
        await asyncio.sleep(0.3)

        # Verify email notification logged in database
        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking_id,
                EmailNotification.email_type == "booking_confirmed"
            )
            notif_res = await db.execute(query)
            notif = notif_res.scalars().first()
            assert notif is not None
            assert notif.recipient_email == test_email
            assert notif.status in ("sent", "queued")
            assert notif.provider_message_id is not None


@pytest.mark.asyncio
async def test_booking_cancellation_triggers_cancellation_email():
    """Verify that cancelling a booking dispatches a cancellation email and logs it"""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        test_email = f"guest_{uuid.uuid4().hex[:8]}@example.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Kyle Reese",
            "email": test_email,
            "password": "Password123!"
        })
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        hotel = (await client.get("/api/v1/hotels/search")).json()[0]
        room = (await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")).json()[0]

        book_res = await client.post("/api/v1/bookings", json={
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2027-02-01",
            "check_out": "2027-02-04",
            "guests": 1,
            "rooms_count": 1,
            "guest_name": "Kyle Reese",
            "guest_email": test_email
        }, headers=headers)
        booking = book_res.json()

        # Cancel the booking
        cancel_res = await client.patch(f"/api/v1/bookings/{booking['id']}/cancel", headers=headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        await asyncio.sleep(0.3)

        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking["id"],
                EmailNotification.email_type == "booking_cancelled"
            )
            res = await db.execute(query)
            notif = res.scalars().first()
            assert notif is not None
            assert notif.recipient_email == test_email
            assert notif.status in ("sent", "queued")


@pytest.mark.asyncio
async def test_booking_modification_triggers_modified_email():
    """Verify that modifying a booking via PATCH /bookings/{id} sends booking_modified email"""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        test_email = f"guest_{uuid.uuid4().hex[:8]}@example.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "John Connor",
            "email": test_email,
            "password": "Password123!"
        })
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        hotel = (await client.get("/api/v1/hotels/search")).json()[0]
        room = (await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")).json()[0]

        book_res = await client.post("/api/v1/bookings", json={
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2027-03-01",
            "check_out": "2027-03-03",
            "guests": 1,
            "rooms_count": 1,
            "guest_name": "John Connor",
            "guest_email": test_email
        }, headers=headers)
        booking = book_res.json()

        # Modify dates and guests
        mod_payload = {
            "check_in": "2027-03-02",
            "check_out": "2027-03-06",
            "guests": 2,
            "adults": 2,
            "special_requests": "High floor requested"
        }
        mod_res = await client.patch(f"/api/v1/bookings/{booking['id']}", json=mod_payload, headers=headers)
        assert mod_res.status_code == 200
        updated = mod_res.json()
        assert updated["check_in"] == "2027-03-02"
        assert updated["check_out"] == "2027-03-06"
        assert updated["nights"] == 4
        assert updated["guests"] == 2

        await asyncio.sleep(0.3)

        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking["id"],
                EmailNotification.email_type == "booking_modified"
            )
            res = await db.execute(query)
            notif = res.scalars().first()
            assert notif is not None
            assert notif.status in ("sent", "queued")


@pytest.mark.asyncio
async def test_payment_failure_triggers_payment_failed_email():
    """Verify that failed payment verification logs and triggers payment_failed email"""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        test_email = f"payer_fail_{uuid.uuid4().hex[:8]}@example.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Declined Payer",
            "email": test_email,
            "password": "Password123!"
        })
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        hotel = (await client.get("/api/v1/hotels/search")).json()[0]
        room = (await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")).json()[0]

        book_res = await client.post("/api/v1/bookings", json={
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2027-04-10",
            "check_out": "2027-04-12",
            "guests": 1,
            "rooms_count": 1,
            "guest_name": "Declined Payer",
            "guest_email": test_email
        }, headers=headers)
        booking = book_res.json()

        # Simulate invalid signature payment verification
        verify_res = await client.post("/api/v1/payments/verify", json={
            "booking_id": booking["id"],
            "razorpay_order_id": "order_real_signature_check",
            "razorpay_payment_id": "pay_failed_12345",
            "razorpay_signature": "invalid_bogus_signature",
            "payment_method": "card"
        })
        assert verify_res.status_code == 200
        assert verify_res.json()["success"] is False

        await asyncio.sleep(0.3)

        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking["id"],
                EmailNotification.email_type == "payment_failed"
            )
            res = await db.execute(query)
            notif = res.scalars().first()
            assert notif is not None
            assert notif.status in ("sent", "queued")


@pytest.mark.asyncio
async def test_email_rate_limiting_anti_spam():
    """Verify that rapid repeated sends to same email & booking are suppressed"""
    async with AsyncSessionLocal() as db:
        unique_email = f"spam_target_{uuid.uuid4().hex[:8]}@test.com"
        
        # Directly call execute_email_send
        await execute_email_send(
            booking_id=99999,
            user_id=None,
            recipient_email=unique_email,
            email_type="booking_cancelled",
            subject="Cancelled 1",
            html_content="<p>Test</p>",
            text_content="Test"
        )

        # Immediately call again with same booking_id and email_type
        await execute_email_send(
            booking_id=99999,
            user_id=None,
            recipient_email=unique_email,
            email_type="booking_cancelled",
            subject="Cancelled 2 (Spam attempt)",
            html_content="<p>Test</p>",
            text_content="Test"
        )

        # Should only have 1 entry created
        query = select(EmailNotification).where(
            EmailNotification.booking_id == 99999,
            EmailNotification.recipient_email == unique_email
        )
        res = await db.execute(query)
        rows = res.scalars().all()
        assert len(rows) == 1


@pytest.mark.asyncio
async def test_email_provider_webhook_delivery():
    """Verify that /internal/notifications/email-webhook updates notification delivery and bounce status"""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create a test notification record
        async with AsyncSessionLocal() as db:
            mock_id = f"resend_test_{uuid.uuid4().hex[:10]}"
            notif = EmailNotification(
                booking_id=1,
                email_type="booking_confirmed",
                recipient_email="delivered_user@test.com",
                status="sent",
                provider_message_id=mock_id
            )
            db.add(notif)
            await db.commit()
            await db.refresh(notif)
            notif_id = notif.id

        # Post delivery webhook
        webhook_payload = {
            "type": "email.delivered",
            "data": {
                "email_id": mock_id,
                "recipient": "delivered_user@test.com"
            }
        }
        res = await client.post("/internal/notifications/email-webhook", json=webhook_payload)
        assert res.status_code == 200
        assert res.json()["updated_count"] >= 1

        # Check DB status is updated to delivered
        async with AsyncSessionLocal() as db:
            updated_notif = await db.get(EmailNotification, notif_id)
            assert updated_notif.status == "delivered"


@pytest.mark.asyncio
async def test_batch_checkin_reminders():
    """Verify that /internal/notifications/send-reminders finds upcoming stays and queues reminders"""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create a booking checking in tomorrow
        tomorrow = (datetime.now(timezone.utc).date() + timedelta(days=1)).strftime("%Y-%m-%d")
        three_days = (datetime.now(timezone.utc).date() + timedelta(days=3)).strftime("%Y-%m-%d")
        test_email = f"reminder_guest_{uuid.uuid4().hex[:8]}@example.com"

        hotel = (await client.get("/api/v1/hotels/search")).json()[0]
        room = (await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")).json()[0]

        book_res = await client.post("/api/v1/bookings", json={
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": tomorrow,
            "check_out": three_days,
            "guests": 1,
            "rooms_count": 1,
            "guest_name": "Reminder Guest",
            "guest_email": test_email
        })
        assert book_res.status_code == 201
        booking = book_res.json()

        # Trigger batch reminder endpoint
        rem_res = await client.post("/internal/notifications/send-reminders")
        assert rem_res.status_code == 200
        data = rem_res.json()
        assert data["status"] == "success"
        assert data["reminders_queued"] >= 1

        await asyncio.sleep(0.3)

        # Verify reminder email notification in DB
        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking["id"],
                EmailNotification.email_type == "checkin_reminder"
            )
            res = await db.execute(query)
            notif = res.scalars().first()
            assert notif is not None
            assert notif.status in ("sent", "queued")


@pytest.mark.asyncio
async def test_email_failure_does_not_break_booking(monkeypatch):
    """Verify that if email sending fails or throws, booking status is still updated successfully"""
    # Mock provider.send to always raise an unhandled network error
    async def failing_send(*args, **kwargs):
        raise ConnectionResetError("Connection abruptly terminated by provider")

    monkeypatch.setattr(mock_provider_instance, "send", failing_send)

    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        hotel = (await client.get("/api/v1/hotels/search")).json()[0]
        room = (await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")).json()[0]

        test_email = f"fail_safe_{uuid.uuid4().hex[:8]}@example.com"
        book_res = await client.post("/api/v1/bookings", json={
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2027-08-01",
            "check_out": "2027-08-04",
            "guests": 1,
            "rooms_count": 1,
            "guest_name": "Resilient Guest",
            "guest_email": test_email
        })
        assert book_res.status_code == 201
        booking = book_res.json()

        # Cancel booking - even though email provider fails, API responds 200 and booking status is cancelled
        cancel_res = await client.patch(f"/api/v1/bookings/{booking['id']}/cancel")
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

        # Wait for retries to exhaust
        await asyncio.sleep(0.5)

        # Check notification row in DB is marked failed with error message
        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking["id"],
                EmailNotification.email_type == "booking_cancelled"
            )
            res = await db.execute(query)
            notif = res.scalars().first()
            assert notif is not None
            assert notif.status == "failed"
            assert "Connection abruptly terminated" in (notif.error_message or "")


@pytest.mark.asyncio
async def test_email_disabled_records_skipped_status(monkeypatch):
    """Verify that when EMAIL_ENABLED is False, notification status is 'skipped' (not 'sent')"""
    monkeypatch.setattr(settings, "EMAIL_ENABLED", False)

    unique_email = f"disabled_{uuid.uuid4().hex[:8]}@example.com"
    await execute_email_send(
        booking_id=8888,
        user_id=1,
        recipient_email=unique_email,
        email_type="booking_confirmed",
        subject="Disabled Email Test",
        html_content="<p>Test</p>",
        text_content="Test"
    )

    async with AsyncSessionLocal() as db:
        query = select(EmailNotification).where(
            EmailNotification.booking_id == 8888,
            EmailNotification.recipient_email == unique_email
        )
        res = await db.execute(query)
        notif = res.scalars().first()
        assert notif is not None
        assert notif.status == "skipped"
        assert "disabled" in (notif.error_message or "").lower()
        assert notif.sent_at is None


def test_production_refuses_fallback_to_mock(monkeypatch):
    """Verify that in production, get_email_provider() raises RuntimeError instead of falling back to mock"""
    from app.services.email_service import get_email_provider

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "resend")
    monkeypatch.setattr(settings, "EMAIL_API_KEY", None)

    with pytest.raises(RuntimeError) as exc_info:
        get_email_provider()

    assert "Refusing silent fallback to mock provider in production" in str(exc_info.value)


def test_production_refuses_mock_provider(monkeypatch):
    """Verify that in production, explicit EMAIL_PROVIDER='mock' is refused"""
    from app.services.email_service import get_email_provider

    monkeypatch.setattr(settings, "ENVIRONMENT", "production")
    monkeypatch.setattr(settings, "EMAIL_PROVIDER", "mock")

    with pytest.raises(RuntimeError) as exc_info:
        get_email_provider()

    assert "cannot be used in a production environment" in str(exc_info.value)


def test_sender_domain_validation():
    """Verify that validate_sender_domain flags local/unverified domains"""
    from app.services.email_service import validate_sender_domain

    valid, msg = validate_sender_domain("HavenStay <notifications@havenstay.local>", "resend")
    assert not valid
    assert "uses an unverified/local domain" in msg

    valid_prod, _ = validate_sender_domain("HavenStay <bookings@havenstayhotels.com>", "resend")
    assert valid_prod

