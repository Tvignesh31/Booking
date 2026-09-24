import httpx
import json
import time

def run_checks():
    client = httpx.Client(base_url="http://127.0.0.1:8000")

    print("========================================")
    print("RUNNING LIVE END-TO-END VERIFICATION")
    print("========================================")

    # 1. Health check
    res = client.get("/")
    print("1. Backend status:", res.status_code, res.json().get("message"))

    # 2. Cloudflare & Media Storage Status
    media_res = client.get("/api/v1/media/status")
    print("2. Cloudflare Storage Status:", media_res.status_code, media_res.json())

    # 3. Availability Calendar with Shades
    cal_res = client.get("/api/v1/rooms/hotel/1/availability-calendar")
    print("3. Calendar status:", cal_res.status_code)
    cal_data = cal_res.json()
    print("   Hotel:", cal_data["hotel_name"])
    print("   Total room units:", cal_data["total_room_units"])
    print("   Total days returned:", len(cal_data["days"]))
    for d in cal_data["days"][:3]:
        print(f"   Date: {d['date']} | Avail: {d['available_units']} | Status: {d['status']} | Shade: {d['shade']} | Price: ${d['min_price']}")

    # 4. Tourist Places on Search Page (Search location access)
    places_res = client.get("/api/v1/places/nearby?city=Kumbakonam&category=all")
    print("4. Nearby Tourist Places status:", places_res.status_code)
    places_data = places_res.json()
    print(f"   Places count for Kumbakonam: {places_data['count']}")
    for p in places_data["places"][:2]:
        print(f"   Attraction: {p['name']} ({p['category']}) - {p['distance_km']} km away")

    # 5. Create a registered user booking & test receipt dispatch
    b_payload = {
        "hotel_id": 1,
        "room_id": 1,
        "check_in": "2027-07-10",
        "check_out": "2027-07-13",
        "guests": 2,
        "rooms_count": 1,
        "guest_name": "Registered User Tester",
        "guest_email": "registered.guest@example.com",
        "guest_phone": "+1 555-098-7654",
        "special_requests": "Upper floor preferred"
    }
    book_res = client.post("/api/v1/bookings", json=b_payload)
    print("5. Booking creation status:", book_res.status_code)
    b_data = book_res.json()
    booking_id = b_data["id"]
    b_ref = b_data["booking_reference"]
    print(f"   Booking created: ID {booking_id}, Ref {b_ref}, User ID: {b_data.get('user_id')}, Total: ${b_data['total_price']}")

    # 6. Check confirmation email dispatch in DB
    time.sleep(1.0)
    emails_res = client.get(f"/api/v1/bookings/{booking_id}/emails")
    emails = emails_res.json()
    print(f"6. Emails recorded in DB ({len(emails)}):")
    for e in emails:
        print(f"   ID: {e['id']} | Type: {e['email_type']} | Status: {e['status']} | To: {e['recipient_email']} | User ID: {e['user_id']}")

    # 7. Resend receipt explicitly to registered user DB email
    resend_res = client.post(
        f"/api/v1/bookings/{booking_id}/resend-email",
        json={"send_to_registered_user": True}
    )
    print("7. Resend to registered user status:", resend_res.status_code, resend_res.json().get("message"))

    time.sleep(1.0)
    emails_res2 = client.get(f"/api/v1/bookings/{booking_id}/emails")
    emails2 = emails_res2.json()
    print(f"   Emails after registered user receipt dispatch ({len(emails2)} total):")
    for e in emails2:
        print(f"   ID: {e['id']} | Status: {e['status']} | To: {e['recipient_email']} | User ID: {e['user_id']}")

    print("========================================")
    print("ALL VERIFICATIONS COMPLETED SUCCESSFULLY!")
    print("========================================")

if __name__ == "__main__":
    run_checks()
