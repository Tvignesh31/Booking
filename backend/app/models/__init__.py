import datetime
from sqlalchemy import Column, Integer, String, Text, Float, DateTime, ForeignKey, Boolean, JSON
from sqlalchemy.orm import relationship
from app.core.database import Base

def utc_now():
    return datetime.datetime.now(datetime.timezone.utc)

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    phone = Column(String(50), nullable=True)
    role = Column(String(50), default="user", nullable=False)  # "user" or "admin"
    created_at = Column(DateTime, default=utc_now)

    bookings = relationship("Booking", back_populates="user", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="user", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("EmailNotification", back_populates="user", cascade="all, delete-orphan")


class Hotel(Base):
    __tablename__ = "hotels"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    description = Column(Text, nullable=False)
    address = Column(String(255), nullable=False)
    city = Column(String(100), nullable=False, index=True)
    country = Column(String(100), nullable=False, index=True)
    latitude = Column(Float, nullable=False, index=True)
    longitude = Column(Float, nullable=False, index=True)
    star_rating = Column(Float, default=4.0)
    guest_rating = Column(Float, default=4.5)
    reviews_count = Column(Integer, default=0)
    amenities = Column(JSON, default=list)  # ["WiFi", "Pool", "Breakfast", "Spa", etc.]
    images = Column(JSON, default=list)     # list of image URLs
    featured_image = Column(String(500), nullable=True)
    cancellation_policy = Column(String(255), default="Free cancellation up to 48 hours before check-in")
    eco_certified = Column(Boolean, default=False)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now)

    rooms = relationship("Room", back_populates="hotel", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="hotel", cascade="all, delete-orphan")
    favorites = relationship("Favorite", back_populates="hotel", cascade="all, delete-orphan")
    bookings = relationship("Booking", back_populates="hotel", cascade="all, delete-orphan")


class Room(Base):
    __tablename__ = "rooms"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_type = Column(String(100), nullable=False)  # e.g. "Deluxe King Room"
    description = Column(Text, nullable=False)
    bed_configuration = Column(String(100), default="1 King Bed")
    max_occupancy = Column(Integer, default=2)
    base_price = Column(Float, nullable=False)  # price per night in USD
    taxes_and_fees = Column(Float, default=0.12)  # percentage, e.g. 0.12 (12%)
    amenities = Column(JSON, default=list)  # ["Free WiFi", "Air Conditioning", "Balcony"]
    total_units = Column(Integer, default=5)
    photos = Column(JSON, default=list)
    free_cancellation = Column(Boolean, default=True)
    breakfast_included = Column(Boolean, default=False)

    hotel = relationship("Hotel", back_populates="rooms")
    bookings = relationship("Booking", back_populates="room")
    availabilities = relationship("RoomAvailability", back_populates="room", cascade="all, delete-orphan")


class RoomAvailability(Base):
    __tablename__ = "room_availability"

    id = Column(Integer, primary_key=True, index=True)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    date = Column(String(20), nullable=False, index=True)  # YYYY-MM-DD
    available_units = Column(Integer, default=5)
    price_override = Column(Float, nullable=True)

    room = relationship("Room", back_populates="availabilities")


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    booking_reference = Column(String(50), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # optional if guest booking
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    room_id = Column(Integer, ForeignKey("rooms.id"), nullable=False)
    check_in = Column(String(20), nullable=False)   # YYYY-MM-DD
    check_out = Column(String(20), nullable=False)  # YYYY-MM-DD
    guests = Column(Integer, default=1)
    adults_count = Column(Integer, default=1)
    children_count = Column(Integer, default=0)
    children_ages = Column(JSON, default=list)
    rooms_count = Column(Integer, default=1)
    nights = Column(Integer, default=1)
    
    # Transparent pricing itemization (Responsible Design: zero hidden fees)
    base_total = Column(Float, nullable=False)
    taxes_total = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    itemized_breakdown = Column(JSON, default=dict)
    
    status = Column(String(50), default="confirmed")  # "confirmed", "cancelled", "completed"
    payment_status = Column(String(50), default="paid")  # "unpaid", "paid", "refunded"
    
    # Guest details
    guest_name = Column(String(255), nullable=False)
    guest_email = Column(String(255), nullable=False)
    guest_phone = Column(String(50), nullable=True)
    special_requests = Column(Text, nullable=True)
    
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="bookings")
    hotel = relationship("Hotel", back_populates="bookings")
    room = relationship("Room", back_populates="bookings")
    payments = relationship("Payment", back_populates="booking", cascade="all, delete-orphan")
    notifications = relationship("EmailNotification", back_populates="booking", cascade="all, delete-orphan")


class Payment(Base):
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id"), nullable=False)
    gateway = Column(String(50), default="razorpay")  # "razorpay", "stripe"
    gateway_order_id = Column(String(100), nullable=True)
    gateway_payment_id = Column(String(100), nullable=True)
    gateway_signature = Column(String(255), nullable=True)
    amount = Column(Float, nullable=False)
    currency = Column(String(10), default="INR")
    payment_method = Column(String(50), default="card")  # "card", "upi", "netbanking", "wallet"
    status = Column(String(50), default="pending")  # "pending", "captured", "failed", "refunded"
    created_at = Column(DateTime, default=utc_now)

    booking = relationship("Booking", back_populates="payments")


class NearbyPlaceCache(Base):
    __tablename__ = "nearby_places_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(100), unique=True, index=True, nullable=False)
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    radius_km = Column(Float, default=15.0)
    category = Column(String(50), default="all")
    response_json = Column(JSON, nullable=False)
    fetched_at = Column(DateTime, default=utc_now)


class Review(Base):
    __tablename__ = "reviews"

    id = Column(Integer, primary_key=True, index=True)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    rating = Column(Float, nullable=False)
    title = Column(String(255), nullable=True)
    comment = Column(Text, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    hotel = relationship("Hotel", back_populates="reviews")
    user = relationship("User", back_populates="reviews")


class Favorite(Base):
    __tablename__ = "favorites"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    hotel_id = Column(Integer, ForeignKey("hotels.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now)

    user = relationship("User", back_populates="favorites")
    hotel = relationship("Hotel", back_populates="favorites")


class EmailNotification(Base):
    __tablename__ = "email_notifications"

    id = Column(Integer, primary_key=True, index=True)
    booking_id = Column(Integer, ForeignKey("bookings.id", ondelete="CASCADE"), nullable=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    email_type = Column(String(50), nullable=False, index=True)  # "booking_confirmed", "booking_cancelled", "payment_failed", "booking_modified", "checkin_reminder"
    recipient_email = Column(String(255), nullable=False, index=True)
    subject = Column(String(500), nullable=True)
    html_content = Column(Text, nullable=True)
    status = Column(String(50), default="queued", nullable=False, index=True)  # "queued", "sent", "failed", "delivered", "bounced"
    provider_message_id = Column(String(255), nullable=True, index=True)
    error_message = Column(Text, nullable=True)
    retry_count = Column(Integer, default=0)
    sent_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=utc_now)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    booking = relationship("Booking", back_populates="notifications")
    user = relationship("User", back_populates="notifications")


class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(JSON, nullable=False)
    description = Column(String(255), nullable=True)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)


class AuditActivity(Base):
    __tablename__ = "audit_activities"

    id = Column(Integer, primary_key=True, index=True)
    activity_type = Column(String(50), nullable=False, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    actor_email = Column(String(255), nullable=True)
    ip_address = Column(String(50), nullable=True)
    meta_data = Column(JSON, default=dict)
    created_at = Column(DateTime, default=utc_now)

