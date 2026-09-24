from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime

# --- User Schemas ---
class UserBase(BaseModel):
    name: str
    email: EmailStr
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None

class UserResponse(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    role: str
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# --- Room Schemas ---
class RoomBase(BaseModel):
    room_type: str
    description: str
    bed_configuration: str = "1 King Bed"
    max_occupancy: int = 2
    base_price: float
    taxes_and_fees: float = 0.12
    amenities: List[str] = []
    total_units: int = 5
    photos: List[str] = []
    free_cancellation: bool = True
    breakfast_included: bool = False

class RoomCreate(RoomBase):
    pass

class RoomResponse(RoomBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hotel_id: int
    available_units_now: Optional[int] = None
    total_price_estimate: Optional[float] = None


# --- Review Schemas ---
class ReviewCreate(BaseModel):
    rating: float = Field(..., ge=1.0, le=5.0)
    title: Optional[str] = None
    comment: str

class ReviewResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    hotel_id: int
    user_id: int
    user_name: Optional[str] = "Verified Guest"
    rating: float
    title: Optional[str] = None
    comment: str
    created_at: datetime


# --- Hotel Schemas ---
class HotelBase(BaseModel):
    name: str
    description: str
    address: str
    city: str
    country: str
    latitude: float
    longitude: float
    star_rating: float = 4.0
    amenities: List[str] = []
    images: List[str] = []
    featured_image: Optional[str] = None
    cancellation_policy: str = "Free cancellation up to 48 hours before check-in"
    eco_certified: bool = False

class HotelCreate(HotelBase):
    rooms: Optional[List[RoomCreate]] = []

class HotelResponse(HotelBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    guest_rating: float
    reviews_count: int
    distance_km: Optional[float] = None
    starting_price: Optional[float] = None
    rooms: Optional[List[RoomResponse]] = []
    is_favorite: Optional[bool] = False


# --- Booking Schemas ---
class BookingItemizedBreakdown(BaseModel):
    nights: int
    nightly_base_rate: float
    base_subtotal: float
    taxes_and_fees: float
    tax_rate_percent: float
    resort_fee: float = 0.0
    total_payable: float
    transparent_guarantee: str = "All mandatory taxes and fees are included. No hidden charges at property."

class BookingCreate(BaseModel):
    hotel_id: int
    room_id: int
    check_in: str    # YYYY-MM-DD
    check_out: str   # YYYY-MM-DD
    guests: int = 1
    adults: Optional[int] = 1
    children: Optional[int] = 0
    children_ages: Optional[List[int]] = []
    rooms_count: int = 1
    guest_name: str
    guest_email: EmailStr
    guest_phone: Optional[str] = None
    special_requests: Optional[str] = None

class BookingResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    booking_reference: str
    user_id: Optional[int]
    hotel_id: int
    room_id: int
    hotel_name: Optional[str] = None
    hotel_address: Optional[str] = None
    hotel_city: Optional[str] = None
    hotel_image: Optional[str] = None
    room_type: Optional[str] = None
    check_in: str
    check_out: str
    guests: int
    adults_count: Optional[int] = 1
    children_count: Optional[int] = 0
    children_ages: Optional[List[int]] = []
    rooms_count: int
    nights: int
    base_total: float
    taxes_total: float
    total_price: float
    itemized_breakdown: Dict[str, Any]
    status: str
    payment_status: Optional[str] = "paid"
    guest_name: str
    guest_email: str
    guest_phone: Optional[str]
    special_requests: Optional[str]
    created_at: datetime


# --- Geolocation & Reverse Geocoding ---
class GeolocationQuery(BaseModel):
    lat: float
    lng: float

class GeolocationResponse(BaseModel):
    city: Optional[str] = None
    country: Optional[str] = None
    display_name: Optional[str] = None
    latitude: float
    longitude: float


# --- Booking Modification Schema ---
class BookingUpdate(BaseModel):
    check_in: Optional[str] = None   # YYYY-MM-DD
    check_out: Optional[str] = None  # YYYY-MM-DD
    room_id: Optional[int] = None
    guests: Optional[int] = None
    adults: Optional[int] = None
    children: Optional[int] = None
    children_ages: Optional[List[int]] = None
    rooms_count: Optional[int] = None
    special_requests: Optional[str] = None


# --- Email Notification Schemas ---
class EmailNotificationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    booking_id: Optional[int] = None
    user_id: Optional[int] = None
    email_type: str
    recipient_email: str
    subject: Optional[str] = None
    html_content: Optional[str] = None
    status: str
    provider_message_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    sent_at: Optional[datetime] = None
    created_at: datetime


class EmailWebhookEvent(BaseModel):
    event: Optional[str] = None
    type: Optional[str] = None
    email: Optional[str] = None
    recipient: Optional[str] = None
    message_id: Optional[str] = None
    sg_message_id: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# --- Hotel & Room Update Schemas ---
class HotelUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    star_rating: Optional[float] = None
    amenities: Optional[List[str]] = None
    images: Optional[List[str]] = None
    featured_image: Optional[str] = None
    cancellation_policy: Optional[str] = None
    eco_certified: Optional[bool] = None

class RoomUpdate(BaseModel):
    room_type: Optional[str] = None
    description: Optional[str] = None
    bed_configuration: Optional[str] = None
    max_occupancy: Optional[int] = None
    base_price: Optional[float] = None
    taxes_and_fees: Optional[float] = None
    amenities: Optional[List[str]] = None
    total_units: Optional[int] = None
    photos: Optional[List[str]] = None
    free_cancellation: Optional[bool] = None
    breakfast_included: Optional[bool] = None


# --- Admin Registration Settings & User Management Schemas ---
class RegistrationSettingsSchema(BaseModel):
    allow_open_registration: bool = True
    require_phone: bool = False
    require_email_verification: bool = False
    min_password_length: int = 6
    default_role: str = "user"
    allow_guest_checkout: bool = True
    send_welcome_email: bool = True
    maintenance_mode: bool = False
    terms_version: str = "2026.2"

class UserAdminUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None

class UserAdminResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    role: str
    created_at: datetime
    bookings_count: int = 0
    reviews_count: int = 0

class AuditActivityResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    activity_type: str
    title: str
    description: str
    actor_email: Optional[str] = None
    meta_data: Optional[Dict[str, Any]] = None
    created_at: datetime

class PaymentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    booking_id: int
    booking_reference: Optional[str] = None
    guest_name: Optional[str] = None
    gateway: str
    gateway_order_id: Optional[str] = None
    gateway_payment_id: Optional[str] = None
    amount: float
    currency: str = "INR"
    payment_method: str = "card"
    status: str = "pending"
    created_at: datetime

class BookingStatusUpdate(BaseModel):
    status: str # "confirmed", "completed", "cancelled", "checked_in"

