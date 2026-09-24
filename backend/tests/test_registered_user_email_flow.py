"""
Test script to verify end-to-end that booking confirmation emails
are sent and tracked for registered users.
"""

import asyncio
from datetime import date, timedelta
from app.core.database import AsyncSessionLocal
from app.models import User, Hotel, Room, Booking, EmailNotification
from app.core.security import get_password_hash, create_access_token
from app.services.email_service import (
    dispatch_booking_confirmation,
    dispatch_resend_booking_email,
    execute_email_send
)
from sqlalchemy import select
from httpx import AsyncClient, ASGITransport
from app.main import app

async def run_email_verification():
    print("=" * 60)
    print("VERIFYING EMAIL SENT TO REGISTERED USER FOR BOOKINGS")
    print("=" * 60)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Register or retrieve registered user
        test_email = "registered.traveler@example.com"
        test_password = "TravelerPass123!"

        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Alex Traveler",
            "email": test_email,
            "password": test_password,
            "phone": "+15551234567"
        })
        if signup_res.status_code == 200:
            token = signup_res.json()["access_token"]
            print(f"[OK] Created new registered user: {test_email}")
        else:
            # Login if already exists
            login_res = await client.post("/api/v1/auth/login", json={
                "email": test_email,
                "password": test_password
            })
            token = login_res.json()["access_token"]
            print(f"[OK] Logged in existing registered user: {test_email}")

        auth_headers = {"Authorization": f"Bearer {token}"}

        # 2. Get a valid hotel and room
        hotels_res = await client.get("/api/v1/hotels/search")
        assert hotels_res.status_code == 200, "Failed to get hotels"
        hotels = hotels_res.json()
        hotel = hotels[0]
        hotel_id = hotel["id"]

        rooms_res = await client.get(f"/api/v1/rooms/hotel/{hotel_id}")
        assert rooms_res.status_code == 200, "Failed to get rooms"
        rooms = rooms_res.json()
        room = rooms[0]
        room_id = room["id"]

        print(f"[OK] Selected Hotel '{hotel['name']}' (ID: {hotel_id}), Room '{room['room_type']}' (ID: {room_id})")

        # 3. Create a booking as the authenticated registered user
        check_in = (date.today() + timedelta(days=10)).isoformat()
        check_out = (date.today() + timedelta(days=14)).isoformat()

        booking_payload = {
            "hotel_id": hotel_id,
            "room_id": room_id,
            "check_in": check_in,
            "check_out": check_out,
            "guests": 2,
            "rooms_count": 1,
            "adults_count": 2,
            "children_count": 0,
            "guest_name": "Alex Traveler",
            "guest_email": test_email,
            "guest_phone": "+15551234567",
            "special_requests": "Quiet room on upper floor please"
        }

        booking_res = await client.post("/api/v1/bookings", json=booking_payload, headers=auth_headers)
        assert booking_res.status_code in (200, 201), f"Booking creation failed: {booking_res.text}"
        booking = booking_res.json()
        booking_id = booking["id"]
        booking_ref = booking["booking_reference"]

        print(f"[OK] Booking successfully created!")
        print(f"     Booking ID: {booking_id}")
        print(f"     Reference: {booking_ref}")
        print(f"     User ID: {booking['user_id']}")
        print(f"     Guest Email: {booking['guest_email']}")
        print(f"     Total Price: ${booking['total_price']}")

        # Give background task 1 second to write email record
        await asyncio.sleep(1.0)

        # 4. Check email notifications in database for this booking and registered user
        async with AsyncSessionLocal() as db:
            query = select(EmailNotification).where(
                EmailNotification.booking_id == booking_id
            ).order_by(EmailNotification.created_at.desc())
            res = await db.execute(query)
            emails = res.scalars().all()

            print("\n" + "-" * 50)
            print(f"DATABASE EMAIL AUDIT: Found {len(emails)} notification(s) for Booking #{booking_id}:")
            print("-" * 50)
            assert len(emails) > 0, "No email was recorded in database for this booking!"

            for idx, em in enumerate(emails, 1):
                print(f"Email #{idx}:")
                print(f"  - Notification DB ID: {em.id}")
                print(f"  - Recipient: {em.recipient_email} (Matches registered user: {em.recipient_email == test_email})")
                print(f"  - Type: {em.email_type}")
                print(f"  - Status: {em.status}")
                print(f"  - Provider Message ID: {em.provider_message_id}")
                print(f"  - Subject: {em.subject}")
                print(f"  - Sent At: {em.sent_at}")
                print(f"  - HTML length: {len(em.html_content or '')} characters")

            # Verify the registered user email details
            target_email_record = emails[0]
            assert target_email_record.recipient_email.lower() == test_email.lower(), "Recipient email does not match registered user!"
            assert target_email_record.status in ("sent", "queued", "delivered"), f"Email status is {target_email_record.status}"
            assert target_email_record.email_type == "booking_confirmed"
            assert booking_ref in target_email_record.subject

        # 5. Check the Frontend API endpoint: GET /api/v1/bookings/{booking_id}/emails
        emails_api_res = await client.get(f"/api/v1/bookings/{booking_id}/emails", headers=auth_headers)
        assert emails_api_res.status_code == 200, f"GET emails failed: {emails_api_res.text}"
        emails_list = emails_api_res.json()
        print(f"\n[OK] Frontend API GET /bookings/{booking_id}/emails returned {len(emails_list)} email record(s).")
        print(f"     Subject: {emails_list[0]['subject']}")
        print(f"     Status: {emails_list[0]['status']}")

        # 6. Check Resending email to registered user: POST /api/v1/bookings/{booking_id}/resend-email
        resend_res = await client.post(
            f"/api/v1/bookings/{booking_id}/resend-email",
            json={"send_to_registered_user": True},
            headers=auth_headers
        )
        assert resend_res.status_code == 200, f"Resend email failed: {resend_res.text}"
        resend_data = resend_res.json()
        print(f"\n[OK] Resend API confirmed: {resend_data['message']}")
        print(f"     Target Recipient: {resend_data['recipient_email']}")

        print("\n" + "=" * 60)
        print("ALL TESTS PASSED: EMAILS ARE SUCCESSFULLY SENT AND TRACKED FOR REGISTERED USERS!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_email_verification())
