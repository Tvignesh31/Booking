import httpx
import datetime
import urllib.parse
import asyncio
from typing import List, Dict, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import NearbyPlaceCache
from app.services.geocoding import calculate_haversine_distance
from app.core.config import settings

# Rich destination landmark catalog with authentic, verified high-resolution photographs
CURATED_LANDMARKS = [
    # New York Area
    {
        "name": "St. Patrick's Cathedral",
        "category": "temples",
        "category_label": "Cathedral / Temple",
        "latitude": 40.7585,
        "longitude": -73.9760,
        "description": "Iconic Neo-Gothic Roman Catholic cathedral landmark on 5th Avenue.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/St._Patrick%27s_Cathedral%2C_Fifth_Avenue%2C_New_York%2C_2022.jpg/1280px-St._Patrick%27s_Cathedral%2C_Fifth_Avenue%2C_New_York%2C_2022.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=40.7585&mlon=-73.9760"
    },
    {
        "name": "Central Park & Conservatory Garden",
        "category": "nature",
        "category_label": "Nature & Parks",
        "latitude": 40.7851,
        "longitude": -73.9683,
        "description": "Expansive 843-acre urban oasis featuring lakes, woodlands, and serene walking paths.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Central_Park_NY_2019.jpg/1280px-Central_Park_NY_2019.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=40.7851&mlon=-73.9683"
    },
    {
        "name": "Statue of Liberty & Ellis Island",
        "category": "monuments",
        "category_label": "Historic Monument",
        "latitude": 40.6892,
        "longitude": -74.0445,
        "description": "Colossal neoclassical sculpture standing in New York Harbor.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/89/Front_view_of_Statue_of_Liberty_%28cropped%29.jpg/1280px-Front_view_of_Statue_of_Liberty_%28cropped%29.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=40.6892&mlon=-74.0445"
    },
    {
        "name": "The Metropolitan Museum of Art",
        "category": "museums",
        "category_label": "Museum & Art",
        "latitude": 40.7794,
        "longitude": -73.9632,
        "description": "One of the world's greatest art museums, showcasing over 5,000 years of global culture.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/The_Metropolitan_Museum_of_Art_5th_Ave_%2882nd_St%29_by_Matthew_Bisanz.JPG/1280px-The_Metropolitan_Museum_of_Art_5th_Ave_%2882nd_St%29_by_Matthew_Bisanz.JPG",
        "map_url": "https://www.openstreetmap.org/?mlat=40.7794&mlon=-73.9632"
    },

    # London Area
    {
        "name": "Westminster Abbey",
        "category": "temples",
        "category_label": "Historic Church / Temple",
        "latitude": 51.4994,
        "longitude": -0.1274,
        "description": "Royal coronation church and world-famous UNESCO Gothic monument.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/7b/Westminster_Abbey%2C_London%2C_UK_-_Diliff.jpg/1280px-Westminster_Abbey%2C_London%2C_UK_-_Diliff.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=51.4994&mlon=-0.1274"
    },
    {
        "name": "Kensington Gardens & Serpentine",
        "category": "nature",
        "category_label": "Nature & Parks",
        "latitude": 51.5070,
        "longitude": -0.1792,
        "description": "Royal park featuring sunken gardens, swan-filled lake, and palace avenues.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/5/52/Kensington_Palace_from_gardens.jpg/1280px-Kensington_Palace_from_gardens.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=51.5070&mlon=-0.1792"
    },
    {
        "name": "Tower Bridge & Historic Fortress",
        "category": "monuments",
        "category_label": "Historic Monument",
        "latitude": 51.5055,
        "longitude": -0.0754,
        "description": "Victorian neo-Gothic suspension bridge iconic to the London skyline.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/63/Tower_Bridge_from_Shad_Thames.jpg/1280px-Tower_Bridge_from_Shad_Thames.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=51.5055&mlon=-0.0754"
    },

    # Paris Area
    {
        "name": "Sacré-Cœur Basilica",
        "category": "temples",
        "category_label": "Basilica / Temple",
        "latitude": 48.8867,
        "longitude": 2.3431,
        "description": "Travertine Romano-Byzantine basilica perched atop Montmartre with panoramic city views.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/14/Sacr%C3%A9-C%C5%93ur_de_Montmartre_2012.jpg/1280px-Sacr%C3%A9-C%C5%93ur_de_Montmartre_2012.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=48.8867&mlon=2.3431"
    },
    {
        "name": "Eiffel Tower & Champ de Mars",
        "category": "monuments",
        "category_label": "Historic Monument",
        "latitude": 48.8584,
        "longitude": 2.2945,
        "description": "World-famous 330-meter wrought-iron landmark erected in 1889.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/85/Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg/1280px-Tour_Eiffel_Wikimedia_Commons_%28cropped%29.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=48.8584&mlon=2.2945"
    },

    # Tokyo Area
    {
        "name": "Sensō-ji Temple",
        "category": "temples",
        "category_label": "Ancient Buddhist Temple",
        "latitude": 35.7148,
        "longitude": 139.7967,
        "description": "Tokyo's oldest and most significant Buddhist temple, founded in 645 AD in Asakusa.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Senso-ji_Main_Hall.jpg/1280px-Senso-ji_Main_Hall.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=35.7148&mlon=139.7967"
    },
    {
        "name": "Meiji Jingu Shrine & Forest",
        "category": "temples",
        "category_label": "Shinto Shrine & Forest",
        "latitude": 35.6764,
        "longitude": 139.6993,
        "description": "Tranquil Shinto shrine nestled in a serene 170-acre evergreen forest in Shibuya.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3b/Meiji_Shrine_Torii_2019.jpg/1280px-Meiji_Shrine_Torii_2019.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=35.6764&mlon=139.6993"
    },

    # Mumbai Area
    {
        "name": "Siddhivinayak Temple",
        "category": "temples",
        "category_label": "Hindu Temple",
        "latitude": 19.0169,
        "longitude": 72.8303,
        "description": "Revered two-century-old temple dedicated to Lord Ganesha in Prabhadevi.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/37/Siddhivinayak_temple_mumbai.jpg/1280px-Siddhivinayak_temple_mumbai.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=19.0169&mlon=72.8303"
    },
    {
        "name": "Gateway of India",
        "category": "monuments",
        "category_label": "Historic Monument",
        "latitude": 18.9220,
        "longitude": 72.8347,
        "description": "Majestic 20th-century Indo-Saracenic arch overlooking the Mumbai Harbour.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e4/Gateway_of_India_2017.jpg/1280px-Gateway_of_India_2017.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=18.9220&mlon=72.8347"
    },
    {
        "name": "Haji Ali Dargah",
        "category": "temples",
        "category_label": "Historic Shrine",
        "latitude": 18.9827,
        "longitude": 72.8089,
        "description": "Iconic 15th-century white marble shrine situated on an islet off the coast of Worli.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8a/Haji_Ali_Dargah_Mumbai.jpg/1280px-Haji_Ali_Dargah_Mumbai.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=18.9827&mlon=72.8089"
    },

    # Tamil Nadu / Kumbakonam / Thiruvidaimaruthur / Thanjavur Area
    {
        "name": "Mahalingaswamy Temple, Thiruvidaimaruthur",
        "category": "temples",
        "category_label": "Ancient Chola Shiva Temple",
        "latitude": 10.9950,
        "longitude": 79.4480,
        "description": "Magnificent 1,200-year-old major Hindu temple dedicated to Lord Shiva in Thiruvidaimaruthur, featuring towering gopurams and vast prakarams.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/b/b1/Tiruvidaimaruthur.jpg/1280px-Tiruvidaimaruthur.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9950&mlon=79.4480"
    },
    {
        "name": "Airavatesvara Temple (UNESCO), Darasuram",
        "category": "monuments",
        "category_label": "UNESCO World Heritage Temple",
        "latitude": 10.9575,
        "longitude": 79.3567,
        "description": "Architectural marvel built by Rajaraja II at Darasuram near Kumbakonam, famous for its stone chariot and exquisite stone carvings.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/A_different_view_of_Airavatesvara_Temple.jpg/1280px-A_different_view_of_Airavatesvara_Temple.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9575&mlon=79.3567"
    },
    {
        "name": "Adi Kumbeswarar Temple, Kumbakonam",
        "category": "temples",
        "category_label": "Historic Shiva Temple",
        "latitude": 10.9602,
        "longitude": 79.3734,
        "description": "The largest and oldest Shaivite shrine in Kumbakonam with a 128-foot gopuram, epicenter of the sacred Mahamaham festival.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Kumbeswarar_temple_01.jpg/1280px-Kumbeswarar_temple_01.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9602&mlon=79.3734"
    },
    {
        "name": "Sarangapani Temple, Kumbakonam",
        "category": "temples",
        "category_label": "Divya Desam Temple",
        "latitude": 10.9592,
        "longitude": 79.3758,
        "description": "Ancient Vaishnavite Divya Desam temple constructed in the shape of a massive stone chariot drawn by horses and elephants.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/1/10/Gopuras_in_Kumbakonam_-_India.JPG/1280px-Gopuras_in_Kumbakonam_-_India.JPG",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9592&mlon=79.3758"
    },
    {
        "name": "Brihadisvara Temple (Big Temple), Thanjavur",
        "category": "monuments",
        "category_label": "UNESCO World Heritage Chola Temple",
        "latitude": 10.7828,
        "longitude": 79.1318,
        "description": "Magnificent 11th-century Chola architectural masterpiece with an 80-tonne granite dome, built by Rajaraja Chola I.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/dd/Brihadisvara_Temple_during_Maha_Shivaratri-WUS03611_%28edit%29.jpg/1280px-Brihadisvara_Temple_during_Maha_Shivaratri-WUS03611_%28edit%29.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.7828&mlon=79.1318"
    },
    {
        "name": "Swamimalai Murugan Temple",
        "category": "temples",
        "category_label": "Arupadaiveedu Murugan Temple",
        "latitude": 10.9566,
        "longitude": 79.3276,
        "description": "One of the six sacred abodes of Lord Murugan (Arupadaiveedu), situated on an artificial hillock with 60 steps representing the Tamil calendar years.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/7/77/Swamimalai_Murugan_Temple.jpg/1280px-Swamimalai_Murugan_Temple.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9566&mlon=79.3276"
    },
    {
        "name": "Uppiliappan Temple",
        "category": "temples",
        "category_label": "Ancient Divya Desam",
        "latitude": 10.9634,
        "longitude": 79.4312,
        "description": "Renowned 108 Divya Desam temple dedicated to Lord Vishnu, located near Thirunageswaram.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/a/af/Uppliyappan_Kovil.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9634&mlon=79.4312"
    },
    {
        "name": "Kapaleeshwarar Temple, Mylapore",
        "category": "temples",
        "category_label": "Historic Shiva Temple",
        "latitude": 13.0339,
        "longitude": 80.2707,
        "description": "Seventh-century Dravidian temple complex dedicated to Lord Shiva with an iconic rainbow gopuram in Chennai.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/9/99/Kapaleeswarar1.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=13.0339&mlon=80.2707"
    },
    {
        "name": "Ramaswamy Temple, Kumbakonam",
        "category": "temples",
        "category_label": "Historic Chola/Nayaka Temple",
        "latitude": 10.9598,
        "longitude": 79.3752,
        "description": "Known as the Ayodhya of the South, renowned for its intricate Rama-Sita stone pillars and continuous Ramayana wall murals.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/6/68/Ramaswamy_temple1.jpg/1280px-Ramaswamy_temple1.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9598&mlon=79.3752"
    },
    {
        "name": "Nageswaran Temple, Kumbakonam",
        "category": "temples",
        "category_label": "Early Chola Temple",
        "latitude": 10.9587,
        "longitude": 79.3789,
        "description": "Important early Chola architectural marvel dedicated to Lord Shiva as Nageswara, celebrated for its sun-ray alignment and exquisite life-size stone sculptures.",
        "image": "https://upload.wikimedia.org/wikipedia/commons/1/1e/Nageswaran1.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.9587&mlon=79.3789"
    },
    {
        "name": "Sri Ranganathaswamy Temple, Srirangam",
        "category": "temples",
        "category_label": "UNESCO World Heritage Site",
        "latitude": 10.8624,
        "longitude": 78.6900,
        "description": "The largest active Hindu temple complex in the world covering 156 acres with 21 magnificent gopurams and 81 shrines.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/Ranganathaswamy_temple_tiruchirappalli.jpg/1280px-Ranganathaswamy_temple_tiruchirappalli.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=10.8624&mlon=78.6900"
    },
    {
        "name": "Meenakshi Amman Temple, Madurai",
        "category": "temples",
        "category_label": "Historic Dravidian Temple",
        "latitude": 9.9195,
        "longitude": 78.1193,
        "description": "Legendary temple complex on the southern bank of the Vaigai River with 14 colorful gateway towers.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e9/An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg/1280px-An_aerial_view_of_Madurai_city_from_atop_of_Meenakshi_Amman_temple.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=9.9195&mlon=78.1193"
    },

    # Singapore Area
    {
        "name": "Buddha Tooth Relic Temple",
        "category": "temples",
        "category_label": "Buddhist Temple",
        "latitude": 1.2815,
        "longitude": 103.8443,
        "description": "Stunning Tang-styled Chinese Buddhist temple in the heart of Chinatown.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/c/cf/Buddha_Tooth_Relic_Temple_and_Museum_Singapore.jpg/1280px-Buddha_Tooth_Relic_Temple_and_Museum_Singapore.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=1.2815&mlon=103.8443"
    },
    {
        "name": "Gardens by the Bay & Supertrees",
        "category": "nature",
        "category_label": "Nature & Botanic Gardens",
        "latitude": 1.2816,
        "longitude": 103.8636,
        "description": "World-acclaimed horticultural showpiece with futuristic biodomes and towering vertical gardens.",
        "image": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f0/Gardens_by_the_bay_singapore.jpg/1280px-Gardens_by_the_bay_singapore.jpg",
        "map_url": "https://www.openstreetmap.org/?mlat=1.2816&mlon=103.8636"
    }
]


async def fetch_image_from_google_places(place_name: str, lat: float, lng: float) -> Optional[str]:
    """
    If GOOGLE_API_KEY is configured, fetch the authentic Google Places photo for this landmark.
    """
    if not settings.GOOGLE_API_KEY:
        return None

    try:
        url = "https://places.googleapis.com/v1/places:searchText"
        headers = {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": settings.GOOGLE_API_KEY,
            "X-Goog-FieldMask": "places.displayName,places.photos"
        }
        body = {
            "textQuery": place_name,
            "locationBias": {
                "circle": {
                    "center": {"latitude": lat, "longitude": lng},
                    "radius": 5000.0
                }
            },
            "maxResultCount": 1
        }
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.post(url, headers=headers, json=body)
            if resp.status_code == 200:
                data = resp.json()
                places = data.get("places", [])
                if places and places[0].get("photos"):
                    photo_name = places[0]["photos"][0]["name"]
                    return f"https://places.googleapis.com/v1/{photo_name}/media?maxHeightPx=600&maxWidthPx=800&key={settings.GOOGLE_API_KEY}"
    except Exception as e:
        print(f"Google Places photo fetch notice: {e}")
    return None


async def fetch_image_from_wikimedia(place_name: str) -> Optional[str]:
    """
    Query Wikipedia/Wikimedia Commons API for authentic, free high-resolution photos of landmarks & temples.
    """
    import re
    headers = {"User-Agent": "HavenStayApp/1.0 (travel@havenstay.org)"}
    # Clean query for search: strip honorific prefixes and brackets
    clean_query = re.sub(r'^(?:Thirumigu|Arulmigu|Thiru|Sri|Shri|Lord)\s+', '', place_name, flags=re.IGNORECASE)
    clean_query = clean_query.split("(")[0].split("-")[0].strip()
    url = f"https://en.wikipedia.org/w/api.php?action=query&format=json&prop=pageimages&pithumbsize=1000&generator=search&gsrsearch={urllib.parse.quote(clean_query)}&gsrlimit=1"
    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                pages = resp.json().get("query", {}).get("pages", {})
                for _, page in pages.items():
                    thumb = page.get("thumbnail", {}).get("source")
                    if thumb:
                        return thumb
    except Exception:
        pass
    return None


async def resolve_place_image(place_name: str, lat: float, lng: float, category: str = "temples") -> str:
    """
    Resolves an authentic image: Google Places API if key is present, otherwise Wikimedia Commons API,
    falling back to category-tailored verified photography.
    """
    # 1. Try Google Places
    google_img = await fetch_image_from_google_places(place_name, lat, lng)
    if google_img:
        return google_img

    # 2. Try Wikimedia Commons
    wiki_img = await fetch_image_from_wikimedia(place_name)
    if wiki_img:
        return wiki_img

    # 3. Fallback to category defaults
    fallback_map = {
        "temples": "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Kumbeswarar_temple_01.jpg/1280px-Kumbeswarar_temple_01.jpg",
        "monuments": "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/99/A_different_view_of_Airavatesvara_Temple.jpg/1280px-A_different_view_of_Airavatesvara_Temple.jpg",
        "nature": "https://thumb.wikimedia.org/wikipedia/commons/thumb/f/f1/Central_Park_NY_2019.jpg/1280px-Central_Park_NY_2019.jpg",
        "museums": "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/30/The_Metropolitan_Museum_of_Art_5th_Ave_%2882nd_St%29_by_Matthew_Bisanz.JPG/1280px-The_Metropolitan_Museum_of_Art_5th_Ave_%2882nd_St%29_by_Matthew_Bisanz.JPG"
    }
    return fallback_map.get(category, fallback_map["temples"])


def enrich_place_with_google_links(place: Dict) -> Dict:
    """
    Enriches a place dictionary with direct Google Images search, Google Maps, and search URLs.
    """
    name = place.get("name", "")
    cat = place.get("category", "")
    query_suffix = " temple photos" if cat == "temples" and "temple" not in name.lower() else " photos"
    search_query = f"{name}{query_suffix}".strip()
    encoded_query = urllib.parse.quote_plus(search_query)
    encoded_name = urllib.parse.quote_plus(name)
    place["google_images_url"] = f"https://www.google.com/search?tbm=isch&q={encoded_query}"
    place["google_maps_url"] = f"https://www.google.com/maps/search/?api=1&query={encoded_name}"
    place["google_search_url"] = f"https://www.google.com/search?q={encoded_name}"
    return place


async def fetch_nearby_places_from_overpass(lat: float, lng: float, radius_m: int = 15000) -> List[Dict]:
    """
    Query OpenStreetMap Overpass API for tourism=attraction, amenity=place_of_worship, historic=*, leisure=park.
    """
    overpass_query = f"""
    [out:json][timeout:5];
    (
      node["amenity"="place_of_worship"](around:{radius_m},{lat},{lng});
      node["tourism"~"attraction|museum|viewpoint"](around:{radius_m},{lat},{lng});
      node["historic"~"monument|memorial|castle|ruins"](around:{radius_m},{lat},{lng});
      node["leisure"="park"](around:{radius_m},{lat},{lng});
    );
    out center 12;
    """
    url = "https://overpass-api.de/api/interpreter"
    headers = {"User-Agent": "ResponsibleHotelBookingApp/1.0"}

    try:
        async with httpx.AsyncClient(timeout=4.5) as client:
            resp = await client.post(url, data={"data": overpass_query}, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                elements = data.get("elements", [])
                raw_places = []
                for el in elements:
                    tags = el.get("tags", {})
                    name = tags.get("name")
                    if not name:
                        continue

                    p_lat = el.get("lat") or el.get("center", {}).get("lat")
                    p_lng = el.get("lon") or el.get("center", {}).get("lon")
                    if not p_lat or not p_lng:
                        continue

                    # Determine category
                    cat = "monuments"
                    cat_label = "Historic Sight"
                    name_lower = name.lower()
                    if tags.get("amenity") == "place_of_worship" or "temple" in name_lower or "kovil" in name_lower or "koil" in name_lower or "church" in name_lower or "mosque" in name_lower:
                        cat = "temples"
                        cat_label = "Temple / Place of Worship"
                    elif tags.get("tourism") == "museum":
                        cat = "museums"
                        cat_label = "Museum"
                    elif tags.get("leisure") == "park" or tags.get("tourism") == "viewpoint":
                        cat = "nature"
                        cat_label = "Nature & Views"

                    raw_places.append({
                        "name": name,
                        "category": cat,
                        "category_label": cat_label,
                        "latitude": p_lat,
                        "longitude": p_lng,
                        "description": tags.get("description") or f"Popular {cat_label} located near your stay.",
                        "map_url": f"https://www.openstreetmap.org/?mlat={p_lat}&mlon={p_lng}"
                    })

                # Resolve authentic images in parallel
                async def attach_image(p):
                    img = await resolve_place_image(p["name"], p["latitude"], p["longitude"], p["category"])
                    p["image"] = img
                    return enrich_place_with_google_links(p)

                tasks = [attach_image(p) for p in raw_places[:8]]
                resolved_places = await asyncio.gather(*tasks)
                return list(resolved_places)
    except Exception as e:
        print(f"Overpass API query notice: {e}")
    return []


async def get_nearby_places(
    db: AsyncSession,
    lat: float,
    lng: float,
    radius_km: float = 50.0,
    category: Optional[str] = None
) -> List[Dict]:
    """
    Returns nearby tourist attractions, temples, and landmarks with distances,
    cached in SQLite/Postgres.
    """
    cache_key = f"{round(lat, 2)}_{round(lng, 2)}_{category or 'all'}"
    
    # 1. Check database cache
    cached = await db.execute(select(NearbyPlaceCache).where(NearbyPlaceCache.cache_key == cache_key))
    cached_record = cached.scalars().first()
    
    now = datetime.datetime.now(datetime.timezone.utc)
    if cached_record and cached_record.fetched_at:
        f_at = cached_record.fetched_at
        if f_at.tzinfo is None:
            f_at = f_at.replace(tzinfo=datetime.timezone.utc)
        if (now - f_at).total_seconds() < 86400:  # 24 hour TTL
            places = cached_record.response_json
        else:
            places = None
    else:
        places = None

    if not places:
        # Check curated landmarks first for instant response with verified authentic photography
        curated_matches = []
        for lmark in CURATED_LANDMARKS:
            dist = calculate_haversine_distance(lat, lng, lmark["latitude"], lmark["longitude"])
            if dist <= radius_km:
                enriched_lmark = enrich_place_with_google_links(dict(lmark))
                curated_matches.append(enriched_lmark)

        if len(curated_matches) >= 3:
            places = curated_matches
        else:
            # Query Overpass API for broader regional discovery
            overpass_places = await fetch_nearby_places_from_overpass(lat, lng, int(radius_km * 1000))
            places = list(overpass_places)
            for cm in curated_matches:
                if not any(p["name"].lower() == cm["name"].lower() for p in places):
                    places.append(cm)

        # If still empty (e.g. searching somewhere remote or global fallback), show closest curated landmarks
        if not places:
            sorted_curated = sorted(
                CURATED_LANDMARKS,
                key=lambda x: calculate_haversine_distance(lat, lng, x["latitude"], x["longitude"])
            )
            places = [enrich_place_with_google_links(dict(x)) for x in sorted_curated[:8]]

        # Save to DB cache
        try:
            if cached_record:
                cached_record.response_json = places
                cached_record.fetched_at = now
            else:
                db.add(NearbyPlaceCache(
                    cache_key=cache_key,
                    lat=lat,
                    lng=lng,
                    radius_km=radius_km,
                    category=category or "all",
                    response_json=places,
                    fetched_at=now
                ))
            await db.commit()
        except Exception as e:
            print(f"Error saving to cache: {e}")

    # 3. Calculate distance for each place from user coords
    enriched_places = []
    for p in places:
        dist = calculate_haversine_distance(lat, lng, p["latitude"], p["longitude"])
        item = {**p, "distance_km": dist}
        if "google_images_url" not in item:
            item = enrich_place_with_google_links(item)

        # Filter by category if requested
        if category and category.lower() != "all":
            if p.get("category", "").lower() != category.lower():
                continue
        enriched_places.append(item)

    # Sort by nearest distance
    enriched_places.sort(key=lambda x: x.get("distance_km", 9999))
    return enriched_places
