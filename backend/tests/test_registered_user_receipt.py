import pytest
from httpx import AsyncClient, ASGITransport
from app.main import app
from app.core.database import AsyncSessionLocal
from app.models import User, Hotel, Room, Booking, EmailNotification
from sqlalchemy import select

@pytest.mark.asyncio
async def test_registered_user_receipt_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        # 1. Test Places Nearby with City
        res_places = await ac.get("/api/v1/places/nearby?city=Kumbakonam&category=all")
        assert res_places.status_code == 200
        places_data = res_places.json()
        assert "places" in places_data
        assert len(places_data["places"]) > 0

        # 2. Get a hotel and room for booking test
        res_hotels = await ac.get("/api/v1/hotels/search")
        assert res_hotels.status_code == 200
        hotels = res_hotels.json()
        assert len(hotels) > 0
        hotel = hotels[0]

        res_rooms = await ac.get(f"/api/v1/rooms/hotel/{hotel['id']}")
        assert res_rooms.status_code == 200
        rooms = res_rooms.json()
        assert len(rooms) > 0
        room = rooms[0]

        # 3. Create a registered user in DB
        async with AsyncSessionLocal() as session:
            # Check if test user exists
            user_res = await session.execute(select(User).where(User.email == "registered.guest@example.com"))
            reg_user = user_res.scalars().first()
            if not reg_user:
                reg_user = User(
                    email="registered.guest@example.com",
                    hashed_password="dummy_hashed_password",
                    name="Registered Test Guest",
                    role="guest"
                )
                session.add(reg_user)
                await session.commit()
                await session.refresh(reg_user)
            reg_user_id = reg_user.id

        # 4. Create booking with matching guest email (unauthenticated)
        # It should automatically link to reg_user_id!
        booking_payload = {
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2026-11-10",
            "check_out": "2026-11-12",
            "guests": 2,
            "rooms_count": 1,
            "guest_name": "Registered Test Guest",
            "guest_email": "registered.guest@example.com",
            "guest_phone": "+1234567890"
        }
        res_booking = await ac.post("/api/v1/bookings", json=booking_payload)
        assert res_booking.status_code == 201
        booking_data = res_booking.json()
        assert booking_data["user_id"] == reg_user_id

        # 5. Test resend email targeting registered user
        res_resend = await ac.post(
            f"/api/v1/bookings/{booking_data['id']}/resend-email",
            json={"send_to_registered_user": True}
        )
        assert res_resend.status_code == 200
        resend_data = res_resend.json()
        assert resend_data["success"] is True
        assert resend_data["recipient_email"] == "registered.guest@example.com"
