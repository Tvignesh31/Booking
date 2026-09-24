import pytest
import httpx
import uuid
from app.main import app

@pytest.mark.asyncio
async def test_admin_portal_flow():
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        # 1. Login as Admin
        admin_login = await client.post("/api/v1/auth/login", json={
            "email": "admin@hotelbooking.com",
            "password": "AdminPass123!"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}

        # 2. Get Admin Stats
        stats_res = await client.get("/api/v1/admin/stats", headers=admin_headers)
        assert stats_res.status_code == 200
        stats = stats_res.json()
        assert "total_hotels" in stats
        assert "total_revenue" in stats
        assert "total_users" in stats

        # 3. Read Registration Settings
        reg_get = await client.get("/api/v1/admin/registration-settings", headers=admin_headers)
        assert reg_get.status_code == 200
        assert reg_get.json()["allow_open_registration"] is True

        # 4. Update Registration Settings (require phone, min password 8)
        reg_update = await client.put("/api/v1/admin/registration-settings", json={
            "allow_open_registration": True,
            "require_phone": True,
            "require_email_verification": False,
            "min_password_length": 8,
            "default_role": "user",
            "allow_guest_checkout": True,
            "send_welcome_email": True,
            "maintenance_mode": False,
            "terms_version": "2026.3"
        }, headers=admin_headers)
        assert reg_update.status_code == 200
        assert reg_update.json()["require_phone"] is True
        assert reg_update.json()["min_password_length"] == 8

        # 5. Verify Registration Process Rejection when Phone is missing
        test_email = f"guest_nophone_{uuid.uuid4().hex[:6]}@test.com"
        fail_signup = await client.post("/api/v1/auth/signup", json={
            "name": "No Phone User",
            "email": test_email,
            "password": "StrongPassword123!"
        })
        assert fail_signup.status_code == 400
        assert "phone number is required" in fail_signup.json()["detail"].lower()

        # Verify Signup with valid phone and password >= 8
        succ_signup = await client.post("/api/v1/auth/signup", json={
            "name": "Valid Phone User",
            "email": test_email,
            "password": "StrongPassword123!",
            "phone": "+1 555-432-9876"
        })
        assert succ_signup.status_code == 200

        # Reset registration settings back to open/lenient
        await client.put("/api/v1/admin/registration-settings", json={
            "allow_open_registration": True,
            "require_phone": False,
            "require_email_verification": False,
            "min_password_length": 6,
            "default_role": "user",
            "allow_guest_checkout": True,
            "send_welcome_email": True,
            "maintenance_mode": False,
            "terms_version": "2026.2"
        }, headers=admin_headers)

        # 6. User Management: List users and update user role
        users_res = await client.get("/api/v1/admin/users", headers=admin_headers)
        assert users_res.status_code == 200
        users = users_res.json()
        assert len(users) >= 2
        target_user = [u for u in users if u["email"] == test_email][0]

        # Promote user to manager
        patch_res = await client.patch(f"/api/v1/admin/users/{target_user['id']}", json={
            "role": "admin"
        }, headers=admin_headers)
        assert patch_res.status_code == 200
        assert patch_res.json()["role"] == "admin"

        # 7. Hotel Updation: Get a hotel and update its name & amenities
        hotels_res = await client.get("/api/v1/hotels/search")
        assert len(hotels_res.json()) > 0
        hotel = hotels_res.json()[0]

        update_hotel_res = await client.put(f"/api/v1/hotels/{hotel['id']}", json={
            "name": f"{hotel['name']} (Renovated & Updated)",
            "star_rating": 4.8,
            "eco_certified": True
        }, headers=admin_headers)
        assert update_hotel_res.status_code == 200
        assert "Renovated & Updated" in update_hotel_res.json()["name"]

        # 8. Room Updation: Update room base price and total units
        rooms_res = await client.get(f"/api/v1/rooms/hotel/{hotel['id']}")
        assert len(rooms_res.json()) > 0
        room = rooms_res.json()[0]

        update_room_res = await client.put(f"/api/v1/rooms/{room['id']}", json={
            "base_price": 249.99,
            "total_units": 10
        }, headers=admin_headers)
        assert update_room_res.status_code == 200
        assert update_room_res.json()["base_price"] == 249.99
        assert update_room_res.json()["total_units"] == 10

        # 9. Live Web Activities: Check activities feed
        activities_res = await client.get("/api/v1/admin/activities", headers=admin_headers)
        assert activities_res.status_code == 200
        activities = activities_res.json()
        assert len(activities) > 0
        assert any("Renovated & Updated" in a["title"] or "Updated" in a["title"] or "User" in a["title"] for a in activities)
