from typing import List, Optional
from datetime import datetime, date, timedelta
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.core.database import get_db
from app.models import Hotel, Room, Booking, User, AuditActivity
from app.schemas import RoomResponse, RoomCreate, RoomUpdate
from app.api.deps import get_current_admin_user

router = APIRouter(prefix="/rooms", tags=["rooms"])

def calculate_nights(check_in_str: str, check_out_str: str) -> int:
    try:
        ci = datetime.strptime(check_in_str, "%Y-%m-%d").date()
        co = datetime.strptime(check_out_str, "%Y-%m-%d").date()
        diff = (co - ci).days
        return max(diff, 1)
    except Exception:
        return 1

async def get_active_bookings_count(
    db: AsyncSession,
    room_id: int,
    check_in: str,
    check_out: str,
    exclude_booking_id: Optional[int] = None
) -> int:
    """
    Count confirmed bookings for the room that overlap with the desired date range.
    Overlap condition: (booking.check_in < req.check_out) and (booking.check_out > req.check_in)
    Optionally excludes a specific booking (e.g. the booking currently being modified).
    """
    q = select(func.coalesce(func.sum(Booking.rooms_count), 0)).where(
        Booking.room_id == room_id,
        Booking.status == "confirmed",
        Booking.check_in < check_out,
        Booking.check_out > check_in
    )
    if exclude_booking_id is not None:
        q = q.where(Booking.id != exclude_booking_id)
    res = await db.execute(q)
    return res.scalar() or 0

@router.get("/hotel/{hotel_id}", response_model=List[RoomResponse])
async def list_hotel_rooms(
    hotel_id: int,
    check_in: Optional[str] = Query(None, description="YYYY-MM-DD"),
    check_out: Optional[str] = Query(None, description="YYYY-MM-DD"),
    guests: Optional[int] = Query(None),
    db: AsyncSession = Depends(get_db)
):
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    query = select(Room).where(Room.hotel_id == hotel_id)
    if guests:
        query = query.where(Room.max_occupancy >= guests)

    result = await db.execute(query)
    rooms = result.scalars().all()

    nights = calculate_nights(check_in, check_out) if (check_in and check_out) else 1

    room_responses = []
    for r in rooms:
        available_units = r.total_units
        if check_in and check_out:
            booked = await get_active_bookings_count(db, r.id, check_in, check_out)
            available_units = max(0, r.total_units - booked)

        # Itemized estimate
        base_subtotal = round(r.base_price * nights, 2)
        taxes = round(base_subtotal * r.taxes_and_fees, 2)
        total_estimate = round(base_subtotal + taxes, 2)

        resp = RoomResponse(
            id=r.id,
            hotel_id=r.hotel_id,
            room_type=r.room_type,
            description=r.description,
            bed_configuration=r.bed_configuration,
            max_occupancy=r.max_occupancy,
            base_price=r.base_price,
            taxes_and_fees=r.taxes_and_fees,
            amenities=r.amenities or [],
            total_units=r.total_units,
            photos=r.photos or [],
            free_cancellation=r.free_cancellation,
            breakfast_included=r.breakfast_included,
            available_units_now=available_units,
            total_price_estimate=total_estimate
        )
        room_responses.append(resp)

    return room_responses


@router.post("/hotel/{hotel_id}", response_model=RoomResponse, status_code=status.HTTP_201_CREATED)
async def add_room_to_hotel(
    hotel_id: int,
    room_in: RoomCreate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    new_room = Room(
        hotel_id=hotel_id,
        room_type=room_in.room_type,
        description=room_in.description,
        bed_configuration=room_in.bed_configuration,
        max_occupancy=room_in.max_occupancy,
        base_price=room_in.base_price,
        taxes_and_fees=room_in.taxes_and_fees,
        amenities=room_in.amenities,
        total_units=room_in.total_units,
        photos=room_in.photos,
        free_cancellation=room_in.free_cancellation,
        breakfast_included=room_in.breakfast_included
    )
    db.add(new_room)
    await db.commit()
    await db.refresh(new_room)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="room_created",
            title=f"New Room Added: {new_room.room_type}",
            description=f"Admin {admin.email} added room category '{new_room.room_type}' to hotel ID #{hotel_id}.",
            actor_email=admin.email,
            meta_data={"room_id": new_room.id, "hotel_id": hotel_id, "room_type": new_room.room_type}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return RoomResponse.model_validate(new_room)


@router.put("/{room_id}", response_model=RoomResponse)
async def update_room(
    room_id: int,
    room_in: RoomUpdate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    update_data = room_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(room, field, val)

    await db.commit()
    await db.refresh(room)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="room_updated",
            title=f"Room Updated: {room.room_type}",
            description=f"Admin {admin.email} updated pricing/details for room ID #{room_id} ({room.room_type}).",
            actor_email=admin.email,
            meta_data={"room_id": room.id, "hotel_id": room.hotel_id, "fields": list(update_data.keys())}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return RoomResponse.model_validate(room)


@router.delete("/{room_id}")
async def delete_room(
    room_id: int,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    room = await db.get(Room, room_id)
    if not room:
        raise HTTPException(status_code=404, detail="Room not found")

    r_type = room.room_type
    h_id = room.hotel_id
    await db.delete(room)
    await db.commit()

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="room_deleted",
            title=f"Room Deleted: {r_type}",
            description=f"Admin {admin.email} deleted room ID #{room_id} from hotel ID #{h_id}.",
            actor_email=admin.email,
            meta_data={"room_id": room_id, "hotel_id": h_id}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return {"message": f"Room category '{r_type}' (ID {room_id}) deleted successfully."}



@router.get("/hotel/{hotel_id}/availability-calendar")
async def get_hotel_availability_calendar(
    hotel_id: int,
    start_date: Optional[str] = Query(None, description="Start date YYYY-MM-DD"),
    end_date: Optional[str] = Query(None, description="End date YYYY-MM-DD"),
    room_id: Optional[int] = Query(None, description="Filter to specific room type"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns day-by-day availability and color-coded shade status for a hotel's calendar.
    Shades:
      - 'high' (5+ units available): Green / Emerald ("Plenty Available")
      - 'moderate' (3-4 units available): Teal / Cyan ("Moderate Availability")
      - 'limited' (1-2 units available): Orange / Amber ("Few Rooms Left - High Demand")
      - 'sold_out' (0 units available): Red / Slate ("Sold Out")
      - 'past': Gray (Disabled)
    """
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    # Determine date range (defaults to today + 60 days)
    today = datetime.now().date()
    try:
        start_dt = datetime.strptime(start_date, "%Y-%m-%d").date() if start_date else today
    except ValueError:
        start_dt = today

    try:
        end_dt = datetime.strptime(end_date, "%Y-%m-%d").date() if end_date else (start_dt + timedelta(days=60))
    except ValueError:
        end_dt = start_dt + timedelta(days=60)

    if end_dt <= start_dt:
        end_dt = start_dt + timedelta(days=30)

    # Max range capped at 120 days for performance
    if (end_dt - start_dt).days > 120:
        end_dt = start_dt + timedelta(days=120)

    # Fetch rooms for this hotel
    rooms_query = select(Room).where(Room.hotel_id == hotel_id)
    if room_id:
        rooms_query = rooms_query.where(Room.id == room_id)
    rooms_res = await db.execute(rooms_query)
    rooms = rooms_res.scalars().all()

    if not rooms:
        return {
            "hotel_id": hotel_id,
            "hotel_name": hotel.name,
            "start_date": start_dt.strftime("%Y-%m-%d"),
            "end_date": end_dt.strftime("%Y-%m-%d"),
            "total_room_units": 0,
            "days": [],
            "room_categories": []
        }

    total_units_sum = sum(r.total_units for r in rooms)
    room_ids = [r.id for r in rooms]
    min_base_price = min(r.base_price for r in rooms)

    # Room categories summary for UI filter
    all_rooms_res = await db.execute(select(Room).where(Room.hotel_id == hotel_id))
    all_rooms = all_rooms_res.scalars().all()
    room_categories = [
        {
            "id": r.id,
            "room_type": r.room_type,
            "base_price": r.base_price,
            "total_units": r.total_units,
            "max_occupancy": r.max_occupancy
        }
        for r in all_rooms
    ]

    # Fetch all active overlapping bookings in one query
    start_str = start_dt.strftime("%Y-%m-%d")
    end_str = end_dt.strftime("%Y-%m-%d")
    bookings_query = select(
        Booking.room_id,
        Booking.rooms_count,
        Booking.check_in,
        Booking.check_out
    ).where(
        Booking.room_id.in_(room_ids),
        Booking.status == "confirmed",
        Booking.check_in < end_str,
        Booking.check_out > start_str
    )
    b_res = await db.execute(bookings_query)
    active_bookings = b_res.all()

    # Pre-aggregate active bookings per date string
    bookings_per_date = {}
    for b in active_bookings:
        try:
            b_ci = datetime.strptime(b.check_in, "%Y-%m-%d").date()
            b_co = datetime.strptime(b.check_out, "%Y-%m-%d").date()
            curr = max(b_ci, start_dt)
            limit = min(b_co, end_dt)
            while curr < limit:
                c_str = curr.strftime("%Y-%m-%d")
                bookings_per_date[c_str] = bookings_per_date.get(c_str, 0) + b.rooms_count
                curr += timedelta(days=1)
        except Exception:
            continue

    # Build calendar day list
    days_data = []
    curr = start_dt
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    while curr <= end_dt:
        c_str = curr.strftime("%Y-%m-%d")
        booked = bookings_per_date.get(c_str, 0)
        available = max(0, total_units_sum - booked)
        is_past = curr < today

        if is_past:
            status_level = "past"
            shade = "disabled"
            label = "Past Date"
        elif available == 0:
            status_level = "sold_out"
            shade = "red"
            label = "Sold Out"
        elif available <= 2:
            status_level = "limited"
            shade = "orange"
            label = f"Only {available} Left!"
        elif available <= 4:
            status_level = "moderate"
            shade = "amber"
            label = f"{available} Rooms Left"
        else:
            status_level = "high"
            shade = "green"
            label = f"{available} Rooms Available"

        days_data.append({
            "date": c_str,
            "year": curr.year,
            "month": curr.month,
            "day": curr.day,
            "day_of_week": day_names[curr.weekday()],
            "is_weekend": curr.weekday() in (5, 6),
            "is_past": is_past,
            "total_units": total_units_sum,
            "booked_units": booked,
            "available_units": available,
            "min_price": min_base_price,
            "status": status_level,
            "shade": shade,
            "badge_text": label
        })
        curr += timedelta(days=1)

    return {
        "hotel_id": hotel.id,
        "hotel_name": hotel.name,
        "start_date": start_str,
        "end_date": end_str,
        "total_room_units": total_units_sum,
        "room_filter_id": room_id,
        "room_categories": room_categories,
        "days": days_data
    }
