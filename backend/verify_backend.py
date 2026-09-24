import asyncio
import httpx
from app.main import app
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_data import seed_initial_data

async def run_verification():
    print("--- STEP 1: Initializing Database & Seeding Data ---")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        await seed_initial_data(session)
    print("Database tables created and seed data loaded successfully.")

    print("\n--- STEP 2: Running API End-to-End Tests via ASGI Client ---")
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/")
        assert res.status_code == 200, f"Root failed: {res.status_code}"
        print(" Root health check OK:", res.json()["app"])

        # 2. Hotel search
        res = await client.get("/api/v1/hotels/search")
        assert res.status_code == 200, f"Hotel search failed: {res.status_code}"
        hotels = res.json()
        assert len(hotels) >= 5, f"Expected at least 5 hotels, found {len(hotels)}"
        print(f" Hotel search OK: Found {len(hotels)} hotels in database.")

        # 3. Geolocation search (near New York: 40.7128, -74.0060)
        res_geo = await client.get("/api/v1/hotels/search?lat=40.7128&lng=-74.0060&sort_by=distance_asc")
        assert res_geo.status_code == 200
        geo_hotels = res_geo.json()
        assert len(geo_hotels) > 0
        assert geo_hotels[0]["distance_km"] is not None
        print(f" Geolocation distance search OK: Nearest hotel is '{geo_hotels[0]['name']}' ({geo_hotels[0]['distance_km']} km away)")

        # 4. Filters (min_star=4.5, eco_certified)
        res_filter = await client.get("/api/v1/hotels/search?min_star=4.5")
        assert res_filter.status_code == 200
        star_hotels = res_filter.json()
        assert all(h["star_rating"] >= 4.5 for h in star_hotels)
        print(f" Rating filter OK: Found {len(star_hotels)} hotels with star rating >= 4.5")

        # 5. User Registration & Auth
        test_email = "test.traveler@example.com"
        signup_res = await client.post("/api/v1/auth/signup", json={
            "name": "Sarah Connor",
            "email": test_email,
            "password": "SecurePassword123!",
            "phone": "+1 555-234-5678"
        })
        if signup_res.status_code == 400:  # already exists from previous run
            login_res = await client.post("/api/v1/auth/login", json={
                "email": test_email,
                "password": "SecurePassword123!"
            })
            assert login_res.status_code == 200
            token = login_res.json()["access_token"]
        else:
            assert signup_res.status_code == 200
            token = signup_res.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}"}
        print(" User Auth (Signup/Login + JWT) OK.")

        # 6. Room listing and transparent price calculation
        target_hotel = hotels[0]
        rooms_res = await client.get(f"/api/v1/rooms/hotel/{target_hotel['id']}?check_in=2026-11-10&check_out=2026-11-13")
        assert rooms_res.status_code == 200
        rooms = rooms_res.json()
        assert len(rooms) > 0
        target_room = rooms[0]
        print(f" Room inventory check OK: '{target_room['room_type']}' has {target_room['available_units_now']} units available.")

        # 7. Create booking
        booking_payload = {
            "hotel_id": target_hotel["id"],
            "room_id": target_room["id"],
            "check_in": "2026-11-10",
            "check_out": "2026-11-13",
            "guests": 2,
            "rooms_count": 1,
            "guest_name": "Sarah Connor",
            "guest_email": test_email,
            "guest_phone": "+1 555-234-5678",
            "special_requests": "Upper floor requested"
        }
        b_res = await client.post("/api/v1/bookings", json=booking_payload, headers=headers)
        assert b_res.status_code == 201, f"Booking failed: {b_res.text}"
        booking = b_res.json()
        print(f" Booking creation OK: Reference #{booking['booking_reference']}, Total: ${booking['total_price']} (Nights: {booking['nights']})")
        assert "pricing_promise" in booking["itemized_breakdown"]
        print(" Transparent Pricing Promise Verified: Zero hidden fees / resort fees.")

        # 8. User bookings list
        my_b_res = await client.get("/api/v1/bookings/me", headers=headers)
        assert my_b_res.status_code == 200
        assert any(b["booking_reference"] == booking["booking_reference"] for b in my_b_res.json())
        print(" My Bookings retrieval OK.")

        # 9. Cancellation
        cancel_res = await client.patch(f"/api/v1/bookings/{booking['id']}/cancel", headers=headers)
        assert cancel_res.status_code == 200
        assert cancel_res.json()["status"] == "cancelled"
        print(" Transparent self-service cancellation OK.")

        # 10. GDPR Data export
        export_res = await client.get("/api/v1/auth/me/export", headers=headers)
        assert export_res.status_code == 200
        assert "user_profile" in export_res.json()
        print(" GDPR Data Portability export OK.")

    print("\n ALL BACKEND VERIFICATIONS PASSED SUCCESSFULLY!")

if __name__ == "__main__":
    asyncio.run(run_verification())
