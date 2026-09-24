import pytest
import httpx
import uuid
from app.main import app

@pytest.mark.asyncio
async def test_root():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        assert "Responsible" in response.json()["app"]

@pytest.mark.asyncio
async def test_hotel_search():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Search all
        response = await client.get("/api/v1/hotels/search")
        assert response.status_code == 200
        hotels = response.json()
        assert len(hotels) > 0
        
        # Search by city
        res_ny = await client.get("/api/v1/hotels/search?city=New%20York")
        assert res_ny.status_code == 200
        ny_hotels = res_ny.json()
        assert len(ny_hotels) >= 1
        assert any("New York" in h["city"] for h in ny_hotels)

@pytest.mark.asyncio
async def test_auth_and_booking_flow():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Register new user
        test_email = f"testuser_{uuid.uuid4().hex[:8]}@test.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Jordan Lee",
            "email": test_email,
            "password": "Password123!",
            "phone": "+1 555-901-2234"
        })
        assert signup_res.status_code == 200
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        # Check me
        me_res = await client.get("/api/v1/auth/me", headers=headers)
        assert me_res.status_code == 200
        assert me_res.json()["name"] == "Jordan Lee"

        # Get first hotel and room
        hotels_res = await client.get("/api/v1/hotels/search")
        hotel = hotels_res.json()[0]
        rooms_res = await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")
        assert len(rooms_res.json()) > 0
        room = rooms_res.json()[0]

        # Book room with transparent itemized price
        booking_payload = {
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": "2026-10-01",
            "check_out": "2026-10-04",
            "guests": 2,
            "rooms_count": 1,
            "guest_name": "Jordan Lee",
            "guest_email": test_email,
            "guest_phone": "+1 555-901-2234",
            "special_requests": "Quiet room please"
        }
        book_res = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
        assert book_res.status_code == 201
        booking = book_res.json()
        assert booking["nights"] == 3
        assert booking["total_price"] > 0
        assert "pricing_promise" in booking["itemized_breakdown"]

        # Check my bookings
        my_res = await client.get("/api/v1/bookings/me", headers=headers)
        assert my_res.status_code == 200
        assert len(my_res.json()) >= 1
        assert my_res.json()[0]["booking_reference"] == booking["booking_reference"]

        # Cancel booking
        cancel_res = await client.patch(f"/api/v1/bookings/{booking['id']}/cancel", headers=headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"

@pytest.mark.asyncio
async def test_nearby_places():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Fetch nearby attractions in New York
        res = await client.get("/api/v1/places/nearby?lat=40.7580&lng=-73.9855&category=all")
        assert res.status_code == 200
        data = res.json()
        assert "places" in data
        assert len(data["places"]) > 0
        first_place = data["places"][0]
        assert "name" in first_place
        assert "distance_km" in first_place
        assert "category" in first_place

        # Test category filter
        monuments_res = await client.get("/api/v1/places/nearby?lat=40.7580&lng=-73.9855&category=monuments")
        assert monuments_res.status_code == 200
        monuments = monuments_res.json()["places"]
        assert len(monuments) > 0
        assert all(p["category"] == "monuments" for p in monuments)

@pytest.mark.asyncio
async def test_payment_intent_and_verification():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # Create user and booking
        test_email = f"payer_{uuid.uuid4().hex[:8]}@test.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Alex Payer",
            "email": test_email,
            "password": "Password123!"
        })
        token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}

        hotels_res = await client.get("/api/v1/hotels/search")
        hotel = hotels_res.json()[0]
        rooms_res = await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")
        room = rooms_res.json()[0]

        # Use dynamic future dates to prevent inventory collisions across repeated test runs
        random_day = (uuid.uuid4().int % 20) + 1
        booking_payload = {
            "hotel_id": hotel["id"],
            "room_id": room["id"],
            "check_in": f"2028-05-{random_day:02d}",
            "check_out": f"2028-05-{random_day+2:02d}",
            "guests": 2,
            "rooms_count": 1,
            "guest_name": "Alex Payer",
            "guest_email": test_email
        }
        book_res = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
        assert book_res.status_code == 201
        booking = book_res.json()

        # Create Payment Intent
        intent_res = await client.post("/api/v1/payments/create-intent", json={"booking_id": booking["id"]})
        assert intent_res.status_code == 200
        intent = intent_res.json()
        assert "order_id" in intent
        assert intent["amount"] > 0
        assert "payment_methods_supported" in intent

        # Verify Payment (Simulate gateway callback / verification)
        verify_res = await client.post("/api/v1/payments/verify", json={
            "booking_id": booking["id"],
            "razorpay_order_id": intent["order_id"],
            "razorpay_payment_id": "pay_test_998877",
            "payment_method": "upi"
        })
        assert verify_res.status_code == 200
        verify_data = verify_res.json()
        assert verify_data["success"] is True
        assert verify_data["status"] == "captured"
        assert verify_data["booking_status"] == "confirmed"

        # Check Payment Status
        status_res = await client.get(f"/api/v1/payments/{booking['id']}/status")
        assert status_res.status_code == 200
        status_data = status_res.json()
        assert status_data["is_paid"] is True

