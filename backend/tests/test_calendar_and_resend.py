import pytest
import httpx
import asyncio
from app.main import app

@pytest.mark.asyncio
async def test_availability_calendar_shades_and_inventory():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Get first hotel
        res = await client.get("/api/v1/hotels/search")
        assert res.status_code == 200
        hotel = res.json()[0]
        hotel_id = hotel["id"]

        # Call availability-calendar
        cal_res = await client.get(f"/api/v1/rooms/hotel/{hotel_id}/availability-calendar")
        assert cal_res.status_code == 200
        data = cal_res.json()
        assert data["hotel_id"] == hotel_id
        assert len(data["days"]) > 0
        assert len(data["room_categories"]) > 0

        # Verify day schema and shades
        first_day = data["days"][0]
        assert "date" in first_day
        assert "status" in first_day
        assert "shade" in first_day
        assert "available_units" in first_day
        assert "min_price" in first_day
        assert first_day["shade"] in ["green", "amber", "orange", "red", "disabled"]

@pytest.mark.asyncio
async def test_booking_resend_email_and_history():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create user & token
        signup = await client.post("/api/v1/auth/signup", json={
            "name": "Resend Tester",
            "email": "resend_tester_2026@example.com",
            "password": "Password123!"
        })
        token = signup.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Get hotel and room
        hotel_res = await client.get("/api/v1/hotels/search")
        hotel = hotel_res.json()[0]
        room_res = await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")
        room = room_res.json()[0]

        # Book
        b_res = await client.post("/api/v1/bookings", json={
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2027-04-10",
            "check_out": "2027-04-12",
            "guests": 2,
            "guest_name": "Resend Tester",
            "guest_email": "resend_tester_2026@example.com"
        }, headers=headers)
        assert b_res.status_code == 201
        booking = b_res.json()
        booking_id = booking["id"]

        # Wait for async background task
        await asyncio.sleep(0.3)

        # Trigger resend email
        resend_res = await client.post(f"/api/v1/bookings/{booking_id}/resend-email", json={
            "recipient_email": "corrected_email@example.com"
        })
        assert resend_res.status_code == 200
        resend_data = resend_res.json()
        assert resend_data["success"] is True
        assert resend_data["recipient_email"] == "corrected_email@example.com"

        # Wait for async background task
        await asyncio.sleep(0.3)

        # Retrieve booking emails history
        emails_res = await client.get(f"/api/v1/bookings/{booking_id}/emails")
        assert emails_res.status_code == 200
        emails = emails_res.json()
        assert len(emails) >= 2
        assert any(e["recipient_email"] == "corrected_email@example.com" for e in emails)
