from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, and_
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Hotel, Room, Favorite, User, AuditActivity
from app.schemas import HotelResponse, RoomResponse, HotelCreate, HotelUpdate
from app.services.geocoding import calculate_haversine_distance, reverse_geocode_nominatim, get_ip_location
from app.api.deps import get_current_user_optional, get_current_admin_user

router = APIRouter(prefix="/hotels", tags=["hotels"])

@router.get("/search", response_model=List[HotelResponse])
async def search_hotels(
    city: Optional[str] = Query(None, description="City or area name"),
    lat: Optional[float] = Query(None, description="User latitude"),
    lng: Optional[float] = Query(None, description="User longitude"),
    radius_km: Optional[float] = Query(500.0, description="Search radius in kilometers"),
    check_in: Optional[str] = Query(None, description="YYYY-MM-DD"),
    check_out: Optional[str] = Query(None, description="YYYY-MM-DD"),
    guests: Optional[int] = Query(1, ge=1),
    min_price: Optional[float] = Query(None, ge=0),
    max_price: Optional[float] = Query(None, ge=0),
    min_star: Optional[float] = Query(None, ge=1, le=5),
    min_rating: Optional[float] = Query(None, ge=1, le=5),
    free_cancellation: Optional[bool] = Query(None),
    breakfast_included: Optional[bool] = Query(None),
    amenities: Optional[str] = Query(None, description="Comma-separated amenities"),
    sort_by: Optional[str] = Query("popularity", description="price_asc, price_desc, rating_desc, distance_asc, popularity"),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = select(Hotel).options(selectinload(Hotel.rooms), selectinload(Hotel.reviews))
    
    # Filter by city or search term if provided
    if city and city.strip():
        raw_term = city.strip().lower()
        CITY_ALIASES = {
            "thanjavore": ["thanjavur", "thiruvidaimaruthur", "kumbakonam", "tanjore"],
            "tanjore": ["thanjavur", "thiruvidaimaruthur", "kumbakonam"],
            "thanjavur": ["thanjavur", "thiruvidaimaruthur", "kumbakonam", "tanjore"],
            "kumbakonam": ["kumbakonam", "thiruvidaimaruthur", "thanjavur"],
            "thiruvidaimaruthur": ["thiruvidaimaruthur", "kumbakonam", "thanjavur"],
            "thiruvidaimarudur": ["thiruvidaimaruthur", "kumbakonam", "thanjavur"],
            "madras": ["chennai"],
            "bombay": ["mumbai"],
            "calcutta": ["kolkata"],
            "bangalore": ["bengaluru", "bangalore"],
            "bengaluru": ["bengaluru", "bangalore"],
            "nyc": ["new york"],
        }
        terms = [raw_term]
        if raw_term in CITY_ALIASES:
            terms.extend(CITY_ALIASES[raw_term])

        conditions = []
        for t in set(terms):
            pat = f"%{t}%"
            conditions.extend([
                Hotel.city.ilike(pat),
                Hotel.country.ilike(pat),
                Hotel.name.ilike(pat),
                Hotel.address.ilike(pat),
                Hotel.description.ilike(pat)
            ])
        query = query.where(or_(*conditions))

    
    # Star rating filter
    if min_star:
        query = query.where(Hotel.star_rating >= min_star)
        
    # Guest rating filter
    if min_rating:
        query = query.where(Hotel.guest_rating >= min_rating)
        
    result = await db.execute(query)
    hotels = result.scalars().all()

    # Get user favorites if logged in
    user_fav_ids = set()
    if current_user:
        fav_result = await db.execute(select(Favorite.hotel_id).where(Favorite.user_id == current_user.id))
        user_fav_ids = set(fav_result.scalars().all())

    # Process and filter hotels
    filtered_hotels = []
    amenity_list = [a.strip().lower() for a in amenities.split(",")] if amenities else []

    for h in hotels:
        # Distance calculation
        dist = None
        if lat is not None and lng is not None:
            dist = calculate_haversine_distance(lat, lng, h.latitude, h.longitude)
            if radius_km is not None and dist > radius_km:
                continue

        # Check amenities
        if amenity_list:
            hotel_amenities_lower = [a.lower() for a in (h.amenities or [])]
            if not all(any(req in ha for ha in hotel_amenities_lower) for req in amenity_list):
                continue

        # Filter rooms by occupancy, price, cancellation, breakfast
        eligible_rooms = []
        for r in h.rooms:
            if guests and r.max_occupancy < guests:
                continue
            if min_price is not None and r.base_price < min_price:
                continue
            if max_price is not None and r.base_price > max_price:
                continue
            if free_cancellation is True and not r.free_cancellation:
                continue
            if breakfast_included is True and not r.breakfast_included:
                continue
            eligible_rooms.append(r)

        # If price/occupancy filters were specified and no rooms match, skip this hotel
        if (min_price or max_price or (guests and guests > 2) or free_cancellation or breakfast_included) and not eligible_rooms:
            continue

        starting_price = min([r.base_price for r in h.rooms]) if h.rooms else 0.0

        room_models = [RoomResponse.model_validate(r) for r in (eligible_rooms if eligible_rooms else h.rooms)]

        hotel_dict = {
            "id": h.id,
            "name": h.name,
            "description": h.description,
            "address": h.address,
            "city": h.city,
            "country": h.country,
            "latitude": h.latitude,
            "longitude": h.longitude,
            "star_rating": h.star_rating,
            "guest_rating": h.guest_rating,
            "reviews_count": h.reviews_count,
            "amenities": h.amenities or [],
            "images": h.images or [],
            "featured_image": h.featured_image,
            "cancellation_policy": h.cancellation_policy,
            "eco_certified": h.eco_certified,
            "distance_km": dist,
            "starting_price": starting_price,
            "rooms": room_models,
            "is_favorite": h.id in user_fav_ids
        }
        filtered_hotels.append(hotel_dict)

    # Sorting
    if sort_by == "price_asc":
        filtered_hotels.sort(key=lambda x: x["starting_price"] or 999999)
    elif sort_by == "price_desc":
        filtered_hotels.sort(key=lambda x: x["starting_price"] or 0, reverse=True)
    elif sort_by == "rating_desc":
        filtered_hotels.sort(key=lambda x: x["guest_rating"] or 0, reverse=True)
    elif sort_by == "distance_asc" and lat is not None and lng is not None:
        filtered_hotels.sort(key=lambda x: x["distance_km"] if x["distance_km"] is not None else 999999)
    else:  # popularity
        filtered_hotels.sort(key=lambda x: (x["reviews_count"] or 0) * (x["guest_rating"] or 0), reverse=True)

    return [HotelResponse(**h) for h in filtered_hotels]


@router.get("/location/reverse")
async def reverse_geocode(lat: float, lng: float):
    """
    Reverse geocoding helper using OpenStreetMap Nominatim.
    """
    return await reverse_geocode_nominatim(lat, lng)


@router.get("/location/ip")
async def ip_fallback():
    """
    Coarse location fallback when browser geolocation is denied.
    """
    return await get_ip_location()


@router.get("/{hotel_id}", response_model=HotelResponse)
async def get_hotel_detail(
    hotel_id: int,
    lat: Optional[float] = Query(None),
    lng: Optional[float] = Query(None),
    current_user: Optional[User] = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db)
):
    query = select(Hotel).where(Hotel.id == hotel_id).options(
        selectinload(Hotel.rooms),
        selectinload(Hotel.reviews)
    )
    result = await db.execute(query)
    h = result.scalars().first()
    if not h:
        raise HTTPException(status_code=404, detail="Hotel not found.")

    dist = None
    if isinstance(lat, (int, float)) and isinstance(lng, (int, float)):
        dist = calculate_haversine_distance(lat, lng, h.latitude, h.longitude)

    is_favorite = False
    if isinstance(current_user, User):
        fav_res = await db.execute(select(Favorite).where(
            Favorite.user_id == current_user.id,
            Favorite.hotel_id == hotel_id
        ))
        is_favorite = fav_res.scalars().first() is not None

    starting_price = min([r.base_price for r in h.rooms]) if h.rooms else 0.0

    return HotelResponse(
        id=h.id,
        name=h.name,
        description=h.description,
        address=h.address,
        city=h.city,
        country=h.country,
        latitude=h.latitude,
        longitude=h.longitude,
        star_rating=h.star_rating,
        guest_rating=h.guest_rating,
        reviews_count=h.reviews_count,
        amenities=h.amenities or [],
        images=h.images or [],
        featured_image=h.featured_image,
        cancellation_policy=h.cancellation_policy,
        eco_certified=h.eco_certified,
        distance_km=dist,
        starting_price=starting_price,
        rooms=[RoomResponse.model_validate(r) for r in h.rooms],
        is_favorite=is_favorite
    )


@router.post("", response_model=HotelResponse, status_code=status.HTTP_201_CREATED)
async def create_hotel(
    hotel_in: HotelCreate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    new_hotel = Hotel(
        name=hotel_in.name,
        description=hotel_in.description,
        address=hotel_in.address,
        city=hotel_in.city,
        country=hotel_in.country,
        latitude=hotel_in.latitude,
        longitude=hotel_in.longitude,
        star_rating=hotel_in.star_rating,
        amenities=hotel_in.amenities,
        images=hotel_in.images,
        featured_image=hotel_in.featured_image or (hotel_in.images[0] if hotel_in.images else None),
        cancellation_policy=hotel_in.cancellation_policy,
        eco_certified=hotel_in.eco_certified,
        owner_id=admin.id
    )
    db.add(new_hotel)
    await db.commit()
    await db.refresh(new_hotel)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="hotel_created",
            title=f"New Hotel Published: {new_hotel.name}",
            description=f"Admin {admin.email} created hotel '{new_hotel.name}' in {new_hotel.city}, {new_hotel.country}.",
            actor_email=admin.email,
            meta_data={"hotel_id": new_hotel.id, "name": new_hotel.name, "city": new_hotel.city}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    # Add any rooms provided
    if hotel_in.rooms:
        for r_in in hotel_in.rooms:
            room = Room(
                hotel_id=new_hotel.id,
                room_type=r_in.room_type,
                description=r_in.description,
                bed_configuration=r_in.bed_configuration,
                max_occupancy=r_in.max_occupancy,
                base_price=r_in.base_price,
                taxes_and_fees=r_in.taxes_and_fees,
                amenities=r_in.amenities,
                total_units=r_in.total_units,
                photos=r_in.photos,
                free_cancellation=r_in.free_cancellation,
                breakfast_included=r_in.breakfast_included
            )
            db.add(room)
        await db.commit()
        await db.refresh(new_hotel)

    return await get_hotel_detail(new_hotel.id, db=db)


@router.put("/{hotel_id}", response_model=HotelResponse)
async def update_hotel(
    hotel_id: int,
    hotel_in: HotelUpdate,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    update_data = hotel_in.model_dump(exclude_unset=True)
    for field, val in update_data.items():
        if val is not None:
            setattr(hotel, field, val)

    if hotel_in.featured_image:
        hotel.featured_image = hotel_in.featured_image
    elif hotel_in.images and len(hotel_in.images) > 0 and not hotel.featured_image:
        hotel.featured_image = hotel_in.images[0]

    await db.commit()
    await db.refresh(hotel)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="hotel_updated",
            title=f"Hotel Updated: {hotel.name}",
            description=f"Admin {admin.email} updated profile details for '{hotel.name}'.",
            actor_email=admin.email,
            meta_data={"hotel_id": hotel.id, "fields_updated": list(update_data.keys())}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return await get_hotel_detail(hotel.id, db=db)


@router.delete("/{hotel_id}")
async def delete_hotel(
    hotel_id: int,
    admin: User = Depends(get_current_admin_user),
    db: AsyncSession = Depends(get_db)
):
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    hotel_name = hotel.name
    await db.delete(hotel)
    await db.commit()

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="hotel_deleted",
            title=f"Hotel Removed: {hotel_name}",
            description=f"Admin {admin.email} removed hotel ID #{hotel_id} ({hotel_name}) from the catalog.",
            actor_email=admin.email,
            meta_data={"hotel_id": hotel_id, "name": hotel_name}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass

    return {"message": f"Hotel '{hotel_name}' (ID {hotel_id}) deleted successfully."}

