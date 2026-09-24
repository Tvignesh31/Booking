from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import get_db
from app.models import Hotel
from app.services.places_service import get_nearby_places
from app.services.geocoding import geocode_city

router = APIRouter(prefix="/places", tags=["places"])

@router.get("/nearby")
async def list_nearby_places(
    lat: Optional[float] = Query(None, description="Latitude of user/hotel location"),
    lng: Optional[float] = Query(None, description="Longitude of user/hotel location"),
    city: Optional[str] = Query(None, description="Optional city name to resolve coordinates"),
    radius: Optional[float] = Query(50.0, description="Search radius in kilometers"),
    category: Optional[str] = Query("all", description="all, temples, monuments, nature, museums"),
    db: AsyncSession = Depends(get_db)
):
    """
    Returns nearby tourist attractions, temples, nature spots, and monuments
    around the specified coordinates or city with distances and category filtering.
    """
    target_lat = lat
    target_lng = lng

    # If coordinates are not provided, resolve via city
    if (target_lat is None or target_lng is None) and city:
        # Check hotels in our database for this city first
        hotel_q = select(Hotel).where(Hotel.city.ilike(f"%{city.strip()}%"))
        hotel_res = await db.execute(hotel_q)
        matching_hotel = hotel_res.scalars().first()
        if matching_hotel:
            target_lat = matching_hotel.latitude
            target_lng = matching_hotel.longitude
        else:
            # Fallback to forward geocoding
            coords = await geocode_city(city)
            if coords:
                target_lat = coords["latitude"]
                target_lng = coords["longitude"]

    # Fallback default if still None (Kumbakonam heritage center)
    if target_lat is None or target_lng is None:
        target_lat = 10.9602
        target_lng = 79.3845

    places = await get_nearby_places(
        db=db,
        lat=target_lat,
        lng=target_lng,
        radius_km=radius or 50.0,
        category=category
    )
    return {
        "count": len(places),
        "origin": {"latitude": target_lat, "longitude": target_lng, "city": city},
        "category": category,
        "places": places
    }
