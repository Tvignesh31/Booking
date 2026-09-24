from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.core.database import get_db
from app.models import Favorite, Hotel, User
from app.schemas import HotelResponse, RoomResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/favorites", tags=["favorites"])

@router.get("", response_model=List[HotelResponse])
async def get_my_favorites(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = (
        select(Favorite)
        .where(Favorite.user_id == current_user.id)
        .options(
            selectinload(Favorite.hotel).selectinload(Hotel.rooms),
            selectinload(Favorite.hotel).selectinload(Hotel.reviews)
        )
    )
    result = await db.execute(query)
    favs = result.scalars().all()

    hotel_responses = []
    for f in favs:
        h = f.hotel
        if not h:
            continue
        starting_price = min([r.base_price for r in h.rooms]) if h.rooms else 0.0
        hotel_responses.append(HotelResponse(
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
            distance_km=None,
            starting_price=starting_price,
            rooms=[RoomResponse.model_validate(r) for r in h.rooms],
            is_favorite=True
        ))
    return hotel_responses

@router.post("/{hotel_id}")
async def toggle_favorite(
    hotel_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    hotel = await db.get(Hotel, hotel_id)
    if not hotel:
        raise HTTPException(status_code=404, detail="Hotel not found")

    query = select(Favorite).where(Favorite.user_id == current_user.id, Favorite.hotel_id == hotel_id)
    result = await db.execute(query)
    existing = result.scalars().first()

    if existing:
        await db.delete(existing)
        await db.commit()
        return {"is_favorite": False, "message": "Removed from favorites"}
    else:
        new_fav = Favorite(user_id=current_user.id, hotel_id=hotel_id)
        db.add(new_fav)
        await db.commit()
        return {"is_favorite": True, "message": "Saved to favorites"}
