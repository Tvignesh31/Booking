import math
import httpx
import time
from typing import Optional, Dict

# Simple in-memory cache for reverse geocoding to respect Nominatim free-tier rate limits
_geocoding_cache: Dict[str, Dict] = {}

def calculate_haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Calculate the great circle distance in kilometers between two points 
    on the earth (specified in decimal degrees).
    """
    R = 6371.0  # Earth radius in kilometers

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat / 2) * math.sin(dlat / 2) +
         math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) *
         math.sin(dlon / 2) * math.sin(dlon / 2))
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance = R * c
    return round(distance, 2)


async def reverse_geocode_nominatim(lat: float, lng: float) -> Optional[Dict]:
    """
    Reverse geocoding using OpenStreetMap Nominatim API.
    Uses User-Agent header as required by OSM policy.
    Caches results to prevent repeated calls.
    """
    cache_key = f"{round(lat, 3)},{round(lng, 3)}"
    now = time.time()
    if cache_key in _geocoding_cache:
        entry = _geocoding_cache[cache_key]
        if now - entry["timestamp"] < 3600:  # 1 hour cache
            return entry["data"]

    url = "https://nominatim.openstreetmap.org/reverse"
    headers = {
        "User-Agent": "ResponsibleHotelBookingApp/1.0 (contact@responsiblehotelapp.dev)"
    }
    params = {
        "lat": lat,
        "lon": lng,
        "format": "json",
        "zoom": 10
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            response = await client.get(url, params=params, headers=headers)
            if response.status_code == 200:
                data = response.json()
                address = data.get("address", {})
                city = address.get("city") or address.get("town") or address.get("village") or address.get("county") or "Nearby Area"
                country = address.get("country", "")
                display_name = data.get("display_name", "")
                
                result = {
                    "city": city,
                    "country": country,
                    "display_name": display_name,
                    "latitude": lat,
                    "longitude": lng
                }
                _geocoding_cache[cache_key] = {"timestamp": now, "data": result}
                return result
    except Exception:
        pass

    return {
        "city": "Current Location",
        "country": "",
        "display_name": f"{round(lat, 4)}, {round(lng, 4)}",
        "latitude": lat,
        "longitude": lng
    }


async def get_ip_location(ip: Optional[str] = None) -> Optional[Dict]:
    """
    Fallback location lookup using ip-api.com when GPS is denied or unavailable.
    """
    url = f"http://ip-api.com/json/{ip if ip and ip != '127.0.0.1' else ''}"
    try:
        async with httpx.AsyncClient(timeout=3.0) as client:
            response = await client.get(url)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "success":
                    return {
                        "city": data.get("city", "Unknown City"),
                        "country": data.get("country", ""),
                        "latitude": data.get("lat", 40.7128),
                        "longitude": data.get("lon", -74.0060),
                        "display_name": f"{data.get('city')}, {data.get('country')}"
                    }
    except Exception:
        pass
    
    # Sensible default fallback (e.g. New York)
    return {
        "city": "New York",
        "country": "United States",
        "latitude": 40.7128,
        "longitude": -74.0060,
        "display_name": "New York, USA"
    }


async def geocode_city(city_name: str) -> Optional[Dict]:
    """
    Forward geocode a city or place name to latitude and longitude coordinates.
    """
    if not city_name or not city_name.strip():
        return None

    cleaned_city = city_name.strip().lower()
    cache_key = f"city_{cleaned_city}"
    now = time.time()
    if cache_key in _geocoding_cache:
        entry = _geocoding_cache[cache_key]
        if now - entry["timestamp"] < 86400:  # 24h cache
            return entry["data"]

    url = "https://nominatim.openstreetmap.org/search"
    headers = {
        "User-Agent": "ResponsibleHotelBookingApp/1.0 (contact@responsiblehotelapp.dev)"
    }
    params = {
        "q": city_name.strip(),
        "format": "json",
        "limit": 1
    }

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            res = await client.get(url, params=params, headers=headers)
            if res.status_code == 200:
                results = res.json()
                if results and len(results) > 0:
                    first = results[0]
                    coords = {
                        "city": city_name.strip(),
                        "latitude": float(first["lat"]),
                        "longitude": float(first["lon"]),
                        "display_name": first.get("display_name", city_name)
                    }
                    _geocoding_cache[cache_key] = {"timestamp": now, "data": coords}
                    return coords
    except Exception:
        pass

    return None
