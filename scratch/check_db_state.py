import sqlite3

con = sqlite3.connect('backend/hotel_booking.db')
cur = con.cursor()
users = cur.execute("SELECT id, email, name, role FROM users").fetchall()
print("Registered users in DB:")
for u in users:
    print(u)

bookings = cur.execute("SELECT id, booking_reference, user_id, guest_name, guest_email, status, total_price FROM bookings ORDER BY id DESC LIMIT 5").fetchall()
print("\nRecent bookings in DB:")
for b in bookings:
    print(b)
