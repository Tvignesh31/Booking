from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Hotel, Room, Booking, User, Payment, EmailNotification, SystemSetting, AuditActivity, Review
from app.schemas import (
    BookingResponse, HotelResponse, RoomResponse,
    RegistrationSettingsSchema, UserAdminResponse, UserAdminUpdate,
    AuditActivityResponse, PaymentResponse, BookingStatusUpdate
)
from app.api.deps import get_current_admin_user

router = APIRouter(prefix="/admin", tags=["admin"])

DEFAULT_REGISTRATION_SETTINGS = {
    "allow_open_registration": True,
    "require_phone": False,
    "require_email_verification": False,
    "min_password_length": 6,
    "default_role": "user",
    "allow_guest_checkout": True,
    "send_welcome_email": True,
    "maintenance_mode": False,
    "terms_version": "2026.2"
}

# --- 1. Dashboard Stats & Analytics ---
@router.get("/stats")
async def get_admin_dashboard_stats(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    total_hotels_res = await db.execute(select(func.count(Hotel.id)))
    total_hotels = total_hotels_res.scalar() or 0

    total_rooms_res = await db.execute(select(func.count(Room.id)))
    total_rooms = total_rooms_res.scalar() or 0

    total_bookings_res = await db.execute(select(func.count(Booking.id)))
    total_bookings = total_bookings_res.scalar() or 0

    active_bookings_res = await db.execute(select(func.count(Booking.id)).where(Booking.status == "confirmed"))
    active_bookings = active_bookings_res.scalar() or 0

    total_revenue_res = await db.execute(select(func.coalesce(func.sum(Booking.total_price), 0.0)).where(Booking.status == "confirmed"))
    total_revenue = round(total_revenue_res.scalar() or 0.0, 2)

    total_users_res = await db.execute(select(func.count(User.id)))
    total_users = total_users_res.scalar() or 0

    total_payments_res = await db.execute(select(func.count(Payment.id)))
    total_payments = total_payments_res.scalar() or 0

    return {
        "total_hotels": total_hotels,
        "total_rooms": total_rooms,
        "total_bookings": total_bookings,
        "active_bookings": active_bookings,
        "total_revenue": total_revenue,
        "total_users": total_users,
        "total_payments": total_payments
    }


# --- 2. Live Web Activities Stream ---
@router.get("/activities", response_model=List[AuditActivityResponse])
async def get_live_activities(
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(AuditActivity).order_by(desc(AuditActivity.created_at)).limit(limit)
    res = await db.execute(query)
    activities = res.scalars().all()
    return [AuditActivityResponse.model_validate(a) for a in activities]


# --- 3. Registration Process & Policy Management ---
@router.get("/registration-settings", response_model=RegistrationSettingsSchema)
async def get_registration_settings(
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    res = await db.get(SystemSetting, "registration_settings")
    if res and res.value:
        merged = dict(DEFAULT_REGISTRATION_SETTINGS)
        merged.update(res.value)
        return RegistrationSettingsSchema(**merged)
    return RegistrationSettingsSchema(**DEFAULT_REGISTRATION_SETTINGS)


@router.put("/registration-settings", response_model=RegistrationSettingsSchema)
async def update_registration_settings(
    settings_in: RegistrationSettingsSchema,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    setting_record = await db.get(SystemSetting, "registration_settings")
    data_dict = settings_in.model_dump()
    if not setting_record:
        setting_record = SystemSetting(
            key="registration_settings",
            value=data_dict,
            description="Dynamic user registration rules, verification policies and platform controls"
        )
        db.add(setting_record)
    else:
        setting_record.value = data_dict

    await db.commit()
    await db.refresh(setting_record)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="registration_policy_updated",
            title="Registration Policies Updated",
            description=f"Admin {admin.email} updated user registration requirements (Open: {settings_in.allow_open_registration}, Phone Req: {settings_in.require_phone}, Min Password: {settings_in.min_password_length}).",
            actor_email=admin.email,
            meta_data=data_dict
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return RegistrationSettingsSchema(**setting_record.value)


# --- 4. User Directory & Role Management ---
@router.get("/users", response_model=List[UserAdminResponse])
async def list_users(
    search: Optional[str] = Query(None),
    role: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(User).order_by(desc(User.created_at))
    if role:
        query = query.where(User.role == role)
    if search:
        s = f"%{search.lower()}%"
        query = query.where((func.lower(User.name).like(s)) | (func.lower(User.email).like(s)))

    res = await db.execute(query)
    users = res.scalars().all()

    # Pre-count bookings and reviews per user
    user_responses = []
    for u in users:
        b_count_res = await db.execute(select(func.count(Booking.id)).where(Booking.user_id == u.id))
        b_count = b_count_res.scalar() or 0

        r_count_res = await db.execute(select(func.count(Review.id)).where(Review.user_id == u.id))
        r_count = r_count_res.scalar() or 0

        user_responses.append(UserAdminResponse(
            id=u.id,
            name=u.name,
            email=u.email,
            phone=u.phone,
            role=u.role,
            created_at=u.created_at,
            bookings_count=b_count,
            reviews_count=r_count
        ))

    return user_responses


@router.patch("/users/{user_id}", response_model=UserAdminResponse)
async def update_user(
    user_id: int,
    user_in: UserAdminUpdate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    if user_in.name is not None:
        target_user.name = user_in.name.strip()
    if user_in.phone is not None:
        target_user.phone = user_in.phone.strip()
    if user_in.role is not None:
        if user_in.role not in ("user", "admin", "hotel_manager"):
            raise HTTPException(status_code=400, detail="Invalid role specified")
        target_user.role = user_in.role

    await db.commit()
    await db.refresh(target_user)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="user_profile_updated",
            title=f"User Updated: {target_user.name}",
            description=f"Admin {admin.email} updated profile/role for user {target_user.email} (Role: {target_user.role}).",
            actor_email=admin.email,
            meta_data={"user_id": target_user.id, "email": target_user.email, "role": target_user.role}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    b_count_res = await db.execute(select(func.count(Booking.id)).where(Booking.user_id == target_user.id))
    b_count = b_count_res.scalar() or 0
    r_count_res = await db.execute(select(func.count(Review.id)).where(Review.user_id == target_user.id))
    r_count = r_count_res.scalar() or 0

    return UserAdminResponse(
        id=target_user.id,
        name=target_user.name,
        email=target_user.email,
        phone=target_user.phone,
        role=target_user.role,
        created_at=target_user.created_at,
        bookings_count=b_count,
        reviews_count=r_count
    )


@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    if user_id == admin.id:
        raise HTTPException(status_code=400, detail="Cannot delete your own administrator account.")

    target_user = await db.get(User, user_id)
    if not target_user:
        raise HTTPException(status_code=404, detail="User not found")

    user_email = target_user.email
    await db.delete(target_user)
    await db.commit()

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="user_deleted",
            title=f"User Account Deleted: {user_email}",
            description=f"Admin {admin.email} removed user account ID #{user_id} ({user_email}).",
            actor_email=admin.email,
            meta_data={"user_id": user_id, "email": user_email}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return {"message": f"User account {user_email} deleted successfully."}


# --- 5. All Reservations & Status Overrides ---
@router.get("/bookings", response_model=List[BookingResponse])
async def list_all_bookings(
    status_filter: Optional[str] = Query(None),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Booking).options(
        selectinload(Booking.hotel),
        selectinload(Booking.room)
    ).order_by(Booking.created_at.desc())

    if status_filter:
        query = query.where(Booking.status == status_filter)

    result = await db.execute(query)
    bookings = result.scalars().all()

    responses = []
    for b in bookings:
        responses.append(BookingResponse(
            id=b.id,
            booking_reference=b.booking_reference,
            user_id=b.user_id,
            hotel_id=b.hotel_id,
            room_id=b.room_id,
            hotel_name=b.hotel.name if b.hotel else "Hotel",
            hotel_address=b.hotel.address if b.hotel else "",
            hotel_city=b.hotel.city if b.hotel else "",
            hotel_image=b.hotel.featured_image if b.hotel else None,
            room_type=b.room.room_type if b.room else "Room",
            check_in=b.check_in,
            check_out=b.check_out,
            guests=b.guests,
            rooms_count=b.rooms_count,
            nights=b.nights,
            base_total=b.base_total,
            taxes_total=b.taxes_total,
            total_price=b.total_price,
            itemized_breakdown=b.itemized_breakdown or {},
            status=b.status,
            payment_status=b.payment_status or "paid",
            guest_name=b.guest_name,
            guest_email=b.guest_email,
            guest_phone=b.guest_phone,
            special_requests=b.special_requests,
            created_at=b.created_at
        ))
    return responses


@router.post("/bookings/{booking_id}/status")
async def update_booking_status(
    booking_id: int,
    status_in: BookingStatusUpdate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    booking = await db.get(Booking, booking_id)
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    old_status = booking.status
    booking.status = status_in.status
    await db.commit()
    await db.refresh(booking)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="booking_status_updated",
            title=f"Booking #{booking.booking_reference} Status Changed",
            description=f"Admin {admin.email} updated booking status from '{old_status}' to '{status_in.status}'.",
            actor_email=admin.email,
            meta_data={"booking_id": booking.id, "booking_reference": booking.booking_reference, "old_status": old_status, "new_status": status_in.status}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return {"message": f"Booking status updated to {status_in.status}", "booking_id": booking.id, "status": booking.status}


# --- 6. Payments & Transactions Log ---
@router.get("/payments", response_model=List[PaymentResponse])
async def list_payments(
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Payment).options(selectinload(Payment.booking)).order_by(desc(Payment.created_at)).limit(limit)
    res = await db.execute(query)
    payments = res.scalars().all()

    results = []
    for p in payments:
        b_ref = p.booking.booking_reference if p.booking else None
        g_name = p.booking.guest_name if p.booking else None
        results.append(PaymentResponse(
            id=p.id,
            booking_id=p.booking_id,
            booking_reference=b_ref,
            guest_name=g_name,
            gateway=p.gateway,
            gateway_order_id=p.gateway_order_id,
            gateway_payment_id=p.gateway_payment_id,
            amount=p.amount,
            currency=p.currency,
            payment_method=p.payment_method,
            status=p.status,
            created_at=p.created_at
        ))
    return results


# --- 7. Email Notifications Log ---
@router.get("/notifications")
async def list_email_notifications(
    limit: int = Query(50, ge=1, le=100),
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(EmailNotification).order_by(desc(EmailNotification.created_at)).limit(limit)
    res = await db.execute(query)
    notifications = res.scalars().all()
    return [
        {
            "id": n.id,
            "booking_id": n.booking_id,
            "recipient_email": n.recipient_email,
            "email_type": n.email_type,
            "subject": n.subject,
            "status": n.status,
            "provider_message_id": n.provider_message_id,
            "error_message": n.error_message,
            "retry_count": n.retry_count,
            "created_at": n.created_at,
            "sent_at": n.sent_at
        }
        for n in notifications
    ]
