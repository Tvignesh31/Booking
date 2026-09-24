import uuid
from datetime import datetime, date
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Booking, Room, Hotel, User, Payment, EmailNotification
from app.schemas import BookingCreate, BookingResponse, BookingUpdate, EmailNotificationResponse
from app.api.deps import get_current_user, get_current_user_optional
from app.api.rooms import get_active_bookings_count
from app.services.email_service import (
    dispatch_booking_confirmation,
    dispatch_booking_cancellation,
    dispatch_booking_modified,
    dispatch_resend_booking_email
)

router = APIRouter(prefix="/bookings", tags=["bookings"])

def generate_booking_ref() -> str:
    return f"RHB-{uuid.uuid4().hex[:8].upper()}"

@router.post("", response_model=BookingResponse, status_code=status.HTTP_201_CREATED)
async def create_booking(
    booking_in: BookingCreate,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    # Validate dates
    try:
        ci_date = datetime.strptime(booking_in.check_in, "%Y-%m-%d").date()
        co_date = datetime.strptime(booking_in.check_out, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")
    
    if co_date <= ci_date:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date.")

    nights = (co_date - ci_date).days

    # Verify hotel and room
    room = await db.get(Room, booking_in.room_id)
    if not room or room.hotel_id != booking_in.hotel_id:
        raise HTTPException(status_code=404, detail="Selected room does not exist in this hotel.")

    hotel = await db.get(Hotel, booking_in.hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found.")

    # Calculate actual guests: adults + children
    adults = booking_in.adults or max(1, booking_in.guests)
    children = booking_in.children or 0
    total_requested_guests = adults + children

    # Strict occupancy check against room capacity per unit
    max_allowed_occupancy = room.max_occupancy * booking_in.rooms_count
    if total_requested_guests > max_allowed_occupancy:
        raise HTTPException(
            status_code=400, 
            detail=f"Requested occupancy ({total_requested_guests} guests: {adults} adults, {children} children) exceeds maximum allowed capacity of {max_allowed_occupancy} for {booking_in.rooms_count} room(s)."
        )

    # Real inventory check - prevents double booking / overselling
    already_booked = await get_active_bookings_count(db, room.id, booking_in.check_in, booking_in.check_out)
    available_units = room.total_units - already_booked

    if available_units < booking_in.rooms_count:
        raise HTTPException(
            status_code=409,
            detail=f"Only {max(0, available_units)} unit(s) available for the selected dates. Please choose another date or room type."
        )

    # Transparent itemized pricing calculation (Zero hidden fees, zero dark patterns)
    nightly_base = room.base_price
    base_subtotal = round(nightly_base * nights * booking_in.rooms_count, 2)
    tax_rate = room.taxes_and_fees
    taxes_total = round(base_subtotal * tax_rate, 2)
    total_price = round(base_subtotal + taxes_total, 2)

    itemized_breakdown = {
        "nights": nights,
        "rooms_count": booking_in.rooms_count,
        "adults": adults,
        "children": children,
        "children_ages": booking_in.children_ages or [],
        "nightly_base_rate": nightly_base,
        "base_subtotal": base_subtotal,
        "tax_rate_percent": round(tax_rate * 100, 1),
        "taxes_and_fees": taxes_total,
        "resort_fees": 0.0,
        "hidden_surcharges": 0.0,
        "total_payable": total_price,
        "pricing_promise": "100% upfront transparent pricing. No surprise fees upon check-in."
    }

    # Check if user is authenticated or if guest email matches a registered user in DB
    target_user_id = current_user.id if current_user else None
    registered_email = current_user.email if current_user else None
    if not target_user_id and booking_in.guest_email:
        user_q = select(User).where(func.lower(User.email) == booking_in.guest_email.lower().strip())
        user_res = await db.execute(user_q)
        matched_user = user_res.scalars().first()
        if matched_user:
            target_user_id = matched_user.id
            registered_email = matched_user.email

    new_booking = Booking(
        booking_reference=generate_booking_ref(),
        user_id=target_user_id,
        hotel_id=hotel.id,
        room_id=room.id,
        check_in=booking_in.check_in,
        check_out=booking_in.check_out,
        guests=total_requested_guests,
        adults_count=adults,
        children_count=children,
        children_ages=booking_in.children_ages or [],
        rooms_count=booking_in.rooms_count,
        nights=nights,
        base_total=base_subtotal,
        taxes_total=taxes_total,
        total_price=total_price,
        itemized_breakdown=itemized_breakdown,
        status="confirmed",
        payment_status="paid",
        guest_name=booking_in.guest_name.strip(),
        guest_email=booking_in.guest_email.lower().strip(),
        guest_phone=booking_in.guest_phone.strip() if booking_in.guest_phone else None,
        special_requests=booking_in.special_requests.strip() if booking_in.special_requests else None
    )

    db.add(new_booking)
    await db.commit()
    await db.refresh(new_booking)

    if new_booking.status == "confirmed":
        # Always dispatch to guest email
        dispatch_booking_confirmation(background_tasks, new_booking, hotel, room)
        # If linked to a registered user whose email differs from guest email, also dispatch to registered user DB email
        if registered_email and registered_email.lower() != new_booking.guest_email.lower():
            dispatch_resend_booking_email(
                background_tasks=background_tasks,
                booking=new_booking,
                hotel=hotel,
                room=room,
                recipient_override=registered_email.lower()
            )

    return BookingResponse(
        id=new_booking.id,
        booking_reference=new_booking.booking_reference,
        user_id=new_booking.user_id,
        hotel_id=new_booking.hotel_id,
        room_id=new_booking.room_id,
        hotel_name=hotel.name,
        hotel_address=hotel.address,
        hotel_city=hotel.city,
        hotel_image=hotel.featured_image,
        room_type=room.room_type,
        check_in=new_booking.check_in,
        check_out=new_booking.check_out,
        guests=new_booking.guests,
        adults_count=new_booking.adults_count,
        children_count=new_booking.children_count,
        children_ages=new_booking.children_ages or [],
        rooms_count=new_booking.rooms_count,
        nights=new_booking.nights,
        base_total=new_booking.base_total,
        taxes_total=new_booking.taxes_total,
        total_price=new_booking.total_price,
        itemized_breakdown=new_booking.itemized_breakdown,
        status=new_booking.status,
        payment_status=new_booking.payment_status,
        guest_name=new_booking.guest_name,
        guest_email=new_booking.guest_email,
        guest_phone=new_booking.guest_phone,
        special_requests=new_booking.special_requests,
        created_at=new_booking.created_at
    )


@router.get("/me", response_model=List[BookingResponse])
async def get_my_bookings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Booking)
        .where(Booking.user_id == current_user.id)
        .options(selectinload(Booking.hotel), selectinload(Booking.room))
        .order_by(Booking.created_at.desc())
    )
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
            adults_count=b.adults_count,
            children_count=b.children_count,
            children_ages=b.children_ages or [],
            rooms_count=b.rooms_count,
            nights=b.nights,
            base_total=b.base_total,
            taxes_total=b.taxes_total,
            total_price=b.total_price,
            itemized_breakdown=b.itemized_breakdown or {},
            status=b.status,
            payment_status=b.payment_status,
            guest_name=b.guest_name,
            guest_email=b.guest_email,
            guest_phone=b.guest_phone,
            special_requests=b.special_requests,
            created_at=b.created_at
        ))
    return responses


@router.get("/reference/{reference}", response_model=BookingResponse)
async def get_booking_by_reference(
    reference: str,
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Booking)
        .where(Booking.booking_reference == reference.upper())
        .options(selectinload(Booking.hotel), selectinload(Booking.room))
    )
    result = await db.execute(query)
    b = result.scalars().first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    return BookingResponse(
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
        adults_count=b.adults_count,
        children_count=b.children_count,
        children_ages=b.children_ages or [],
        rooms_count=b.rooms_count,
        nights=b.nights,
        base_total=b.base_total,
        taxes_total=b.taxes_total,
        total_price=b.total_price,
        itemized_breakdown=b.itemized_breakdown or {},
        status=b.status,
        payment_status=b.payment_status,
        guest_name=b.guest_name,
        guest_email=b.guest_email,
        guest_phone=b.guest_phone,
        special_requests=b.special_requests,
        created_at=b.created_at
    )


@router.patch("/{booking_id}/cancel", response_model=BookingResponse)
async def cancel_booking(
    booking_id: int,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.hotel), selectinload(Booking.room))
    )
    result = await db.execute(query)
    b = result.scalars().first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if current_user and current_user.role != "admin" and b.user_id and b.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to cancel this booking.")

    if b.status == "cancelled":
        raise HTTPException(status_code=400, detail="This booking has already been cancelled.")

    b.status = "cancelled"
    await db.commit()
    await db.refresh(b)

    # Dispatch cancellation email asynchronously
    dispatch_booking_cancellation(background_tasks, b, b.hotel, b.room)

    return BookingResponse(
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
        adults_count=b.adults_count,
        children_count=b.children_count,
        children_ages=b.children_ages or [],
        rooms_count=b.rooms_count,
        nights=b.nights,
        base_total=b.base_total,
        taxes_total=b.taxes_total,
        total_price=b.total_price,
        itemized_breakdown=b.itemized_breakdown or {},
        status=b.status,
        payment_status=b.payment_status,
        guest_name=b.guest_name,
        guest_email=b.guest_email,
        guest_phone=b.guest_phone,
        special_requests=b.special_requests,
        created_at=b.created_at
    )


@router.patch("/{booking_id}", response_model=BookingResponse)
async def modify_booking(
    booking_id: int,
    booking_update: BookingUpdate,
    background_tasks: BackgroundTasks,
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    """
    Modifies an active booking (dates, room, or guest counts), recalculates
    itemized pricing transparently, and sends a booking modified email.
    """
    query = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.hotel), selectinload(Booking.room))
    )
    result = await db.execute(query)
    b = result.scalars().first()
    if not b:
        raise HTTPException(status_code=404, detail="Booking not found.")

    if current_user and current_user.role != "admin" and b.user_id and b.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to modify this booking.")

    if b.status == "cancelled":
        raise HTTPException(status_code=400, detail="Cannot modify a cancelled booking.")

    # Record previous details for email comparison
    previous_details = {
        "check_in": b.check_in,
        "check_out": b.check_out,
        "guests": b.guests,
        "rooms_count": b.rooms_count,
        "room_id": b.room_id,
        "total_price": b.total_price
    }

    # Determine updated dates
    target_ci = booking_update.check_in or b.check_in
    target_co = booking_update.check_out or b.check_out

    try:
        ci_date = datetime.strptime(target_ci, "%Y-%m-%d").date()
        co_date = datetime.strptime(target_co, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Expected YYYY-MM-DD.")

    if co_date <= ci_date:
        raise HTTPException(status_code=400, detail="Check-out date must be after check-in date.")

    nights = (co_date - ci_date).days

    # Target Room
    target_room_id = booking_update.room_id or b.room_id
    if target_room_id != b.room_id:
        room = await db.get(Room, target_room_id)
        if not room or room.hotel_id != b.hotel_id:
            raise HTTPException(status_code=404, detail="Selected room does not exist in this hotel.")
    else:
        room = b.room

    # Target Occupancy
    rooms_count = booking_update.rooms_count or b.rooms_count
    adults = booking_update.adults if booking_update.adults is not None else b.adults_count
    children = booking_update.children if booking_update.children is not None else b.children_count
    total_requested_guests = adults + children

    max_allowed = room.max_occupancy * rooms_count
    if total_requested_guests > max_allowed:
        raise HTTPException(
            status_code=400,
            detail=f"Requested occupancy ({total_requested_guests} guests) exceeds room capacity of {max_allowed} for {rooms_count} unit(s)."
        )

    # Check inventory availability (excluding this booking's units if staying in the same room)
    already_booked = await get_active_bookings_count(
        db,
        room.id,
        target_ci,
        target_co,
        exclude_booking_id=b.id if room.id == b.room_id else None
    )

    available_units = room.total_units - already_booked
    if available_units < rooms_count:
        raise HTTPException(
            status_code=409,
            detail=f"Only {max(0, available_units)} unit(s) available for the modified dates."
        )

    # Recalculate transparent itemized pricing
    nightly_base = room.base_price
    base_subtotal = round(nightly_base * nights * rooms_count, 2)
    tax_rate = room.taxes_and_fees
    taxes_total = round(base_subtotal * tax_rate, 2)
    total_price = round(base_subtotal + taxes_total, 2)

    itemized_breakdown = {
        "nights": nights,
        "rooms_count": rooms_count,
        "adults": adults,
        "children": children,
        "children_ages": booking_update.children_ages if booking_update.children_ages is not None else (b.children_ages or []),
        "nightly_base_rate": nightly_base,
        "base_subtotal": base_subtotal,
        "tax_rate_percent": round(tax_rate * 100, 1),
        "taxes_and_fees": taxes_total,
        "resort_fees": 0.0,
        "hidden_surcharges": 0.0,
        "total_payable": total_price,
        "pricing_promise": "100% upfront transparent pricing. No surprise fees upon check-in."
    }

    # Apply updates
    b.check_in = target_ci
    b.check_out = target_co
    b.room_id = room.id
    b.rooms_count = rooms_count
    b.guests = total_requested_guests
    b.adults_count = adults
    b.children_count = children
    if booking_update.children_ages is not None:
        b.children_ages = booking_update.children_ages
    b.nights = nights
    b.base_total = base_subtotal
    b.taxes_total = taxes_total
    b.total_price = total_price
    b.itemized_breakdown = itemized_breakdown
    if booking_update.special_requests is not None:
        b.special_requests = booking_update.special_requests.strip() or None

    await db.commit()
    await db.refresh(b)

    # Dispatch booking modified email asynchronously
    dispatch_booking_modified(background_tasks, b, b.hotel, room, previous_details=previous_details)

    return BookingResponse(
        id=b.id,
        booking_reference=b.booking_reference,
        user_id=b.user_id,
        hotel_id=b.hotel_id,
        room_id=b.room_id,
        hotel_name=b.hotel.name if b.hotel else "Hotel",
        hotel_address=b.hotel.address if b.hotel else "",
        hotel_city=b.hotel.city if b.hotel else "",
        hotel_image=b.hotel.featured_image if b.hotel else None,
        room_type=room.room_type,
        check_in=b.check_in,
        check_out=b.check_out,
        guests=b.guests,
        adults_count=b.adults_count,
        children_count=b.children_count,
        children_ages=b.children_ages or [],
        rooms_count=b.rooms_count,
        nights=b.nights,
        base_total=b.base_total,
        taxes_total=b.taxes_total,
        total_price=b.total_price,
        itemized_breakdown=b.itemized_breakdown or {},
        status=b.status,
        payment_status=b.payment_status,
        guest_name=b.guest_name,
        guest_email=b.guest_email,
        guest_phone=b.guest_phone,
        special_requests=b.special_requests,
        created_at=b.created_at
    )


class ResendEmailRequest(BaseModel):
    recipient_email: Optional[str] = None
    send_to_registered_user: Optional[bool] = False


@router.post("/{booking_id}/resend-email")
async def resend_booking_email(
    booking_id: int,
    background_tasks: BackgroundTasks,
    payload: Optional[ResendEmailRequest] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Explicitly re-triggers booking confirmation/receipt delivery to the booking's guest email,
    the registered user's DB email, or to an updated recipient email specified in payload.
    """
    query = (
        select(Booking)
        .where(Booking.id == booking_id)
        .options(selectinload(Booking.hotel), selectinload(Booking.room))
    )
    res = await db.execute(query)
    booking = res.scalars().first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found.")

    registered_email = None
    if booking.user_id:
        user_res = await db.get(User, booking.user_id)
        if user_res:
            registered_email = user_res.email

    if payload and payload.send_to_registered_user and registered_email:
        target_email = registered_email.lower().strip()
    elif payload and payload.recipient_email:
        target_email = payload.recipient_email.strip().lower()
    elif registered_email:
        target_email = registered_email.lower().strip()
    else:
        target_email = booking.guest_email.lower().strip()

    dispatch_resend_booking_email(
        background_tasks=background_tasks,
        booking=booking,
        hotel=booking.hotel,
        room=booking.room,
        recipient_override=target_email
    )

    return {
        "success": True,
        "message": f"Confirmation & receipt email is being dispatched to {target_email}",
        "recipient_email": target_email,
        "booking_reference": booking.booking_reference
    }


@router.get("/{booking_id}/emails", response_model=List[EmailNotificationResponse])
async def get_booking_emails(
    booking_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieves all transactional email notification records, statuses, and previews for this booking.
    """
    query = (
        select(EmailNotification)
        .where(EmailNotification.booking_id == booking_id)
        .order_by(EmailNotification.created_at.desc())
    )
    res = await db.execute(query)
    return res.scalars().all()

