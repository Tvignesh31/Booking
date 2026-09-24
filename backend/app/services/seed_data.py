from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models import User, Hotel, Room, Review, SystemSetting
from app.core.security import get_password_hash
from app.core.config import settings

INITIAL_HOTELS = [
    {
        "name": "The Green Haven Eco-Hotel",
        "description": "Nestled in the city center with 100% renewable energy powering all operations. Features an organic rooftop garden, zero single-use plastics, and sunlit suites designed with sustainable teak and natural linens.",
        "address": "142 Greenwich St, Financial District",
        "city": "New York",
        "country": "United States",
        "latitude": 40.7105,
        "longitude": -74.0125,
        "star_rating": 4.5,
        "guest_rating": 4.8,
        "reviews_count": 142,
        "amenities": ["Free High-Speed WiFi", "Organic Breakfast", "Fitness Center", "EV Charging", "Rooftop Garden", "Eco Certified", "Luggage Storage"],
        "cancellation_policy": "Free cancellation up to 24 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Eco Deluxe King",
                "description": "Spacious king bedroom crafted with reclaimed cedarwood, soundproof double-glazed windows, and luxury organic cotton bedding.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 2,
                "base_price": 220.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Free High-Speed WiFi", "Rainfall Shower", "Smart TV", "Organic Toiletries", "Air Conditioning"],
                "total_units": 6,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"]
            },
            {
                "room_type": "Skyline View Suite",
                "description": "Penthouse level suite with panoramic city skyline views, private balcony, living lounge, and deep soaking tub.",
                "bed_configuration": "1 King Bed + 1 Sofa Bed",
                "max_occupancy": 3,
                "base_price": 350.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Skyline View", "Balcony", "Nespresso Machine", "Free High-Speed WiFi", "Robes & Slippers"],
                "total_units": 3,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Manhattan Urban Boutique & Suites",
        "description": "A stylish, tranquil oasis steps from Broadway and Central Park. Features art-deco architecture, an artisan espresso bar, and cozy workspace corners.",
        "address": "250 W 54th St, Midtown",
        "city": "New York",
        "country": "United States",
        "latitude": 40.7645,
        "longitude": -73.9835,
        "star_rating": 4.0,
        "guest_rating": 4.6,
        "reviews_count": 89,
        "amenities": ["Free High-Speed WiFi", "24/7 Front Desk", "Bar & Lounge", "Fitness Center", "Air Conditioning", "Pet Friendly"],
        "cancellation_policy": "Free cancellation up to 48 hours prior to arrival",
        "eco_certified": False,
        "featured_image": "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Classic Queen Room",
                "description": "Warm, artful room with premium plush queen mattress, workspace desk, and high-pressure rain shower.",
                "bed_configuration": "1 Queen Bed",
                "max_occupancy": 2,
                "base_price": 175.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Free High-Speed WiFi", "Smart TV", "Work Desk", "Air Conditioning"],
                "total_units": 8,
                "free_cancellation": True,
                "breakfast_included": False,
                "photos": ["https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=800&q=80"]
            },
            {
                "room_type": "Urban Studio with Balcony",
                "description": "Bright studio with floor-to-ceiling windows, city balcony, and curated mini-library.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 2,
                "base_price": 240.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Balcony", "Free High-Speed WiFi", "Espresso Machine", "Mini Fridge"],
                "total_units": 4,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Kensington Grand Heritage Hotel",
        "description": "Victorian elegance modernized for the discerning traveler. Surrounded by Kensington gardens, our boutique hotel offers serene afternoon tea, peaceful courtyards, and concierge excellence.",
        "address": "35 Queen's Gate, South Kensington",
        "city": "London",
        "country": "United Kingdom",
        "latitude": 51.4985,
        "longitude": -0.1795,
        "star_rating": 5.0,
        "guest_rating": 4.9,
        "reviews_count": 210,
        "amenities": ["Free High-Speed WiFi", "Traditional Tea Room", "Full English Breakfast", "Concierge Service", "Spa Treatments", "Garden Terrace"],
        "cancellation_policy": "Free cancellation up to 48 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Heritage Superior Room",
                "description": "Quiet courtyard-facing room appointed with bespoke oak fittings, Italian marble bathroom, and goose-down pillows.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 2,
                "base_price": 280.00,
                "taxes_and_fees": 0.15,
                "amenities": ["Courtyard View", "Free High-Speed WiFi", "Marble Bath", "Complimentary Tea & Biscuits"],
                "total_units": 5,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Le Marais Artisan Lodge",
        "description": "Chic Parisian pied-à-terre tucked into historic Le Marais. Featuring exposed timber beams, hand-picked vintage decor, and authentic French bakery breakfast delivered daily.",
        "address": "18 Rue des Rosiers, 4th Arr.",
        "city": "Paris",
        "country": "France",
        "latitude": 48.8575,
        "longitude": 2.3592,
        "star_rating": 4.5,
        "guest_rating": 4.7,
        "reviews_count": 96,
        "amenities": ["Free High-Speed WiFi", "Bakery Breakfast", "Air Conditioning", "Bicycle Rental", "Express Check-in"],
        "cancellation_policy": "Free cancellation up to 24 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Parisian Charm Queen",
                "description": "Intimate, sun-drenched room with view of the cobblestone courtyard, brass fixtures, and soft linens.",
                "bed_configuration": "1 Queen Bed",
                "max_occupancy": 2,
                "base_price": 210.00,
                "taxes_and_fees": 0.10,
                "amenities": ["Courtyard View", "Free High-Speed WiFi", "Nespresso Machine", "Safe"],
                "total_units": 6,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Shinjuku Zen Retreat & Onsen",
        "description": "A tranquil sanctuary amidst Tokyo's vibrant skyline. Features traditional minimalist hinoki wood interiors, private indoor onsen baths, and tatami tea spaces.",
        "address": "2-1-1 Nishi-Shinjuku",
        "city": "Tokyo",
        "country": "Japan",
        "latitude": 35.6895,
        "longitude": 139.6917,
        "star_rating": 4.5,
        "guest_rating": 4.9,
        "reviews_count": 180,
        "amenities": ["Hot Spring Onsen", "Free High-Speed WiFi", "Japanese Breakfast", "Tea Ceremony Room", "Air Purifier", "Yukata Robes"],
        "cancellation_policy": "Free cancellation up to 48 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Modern Tatami King Room",
                "description": "Minimalist suite with futon-on-tatami sleeping experience or low-profile King frame, fragrant igusa rush scent, and hinoki tub.",
                "bed_configuration": "1 King Bed / Futon",
                "max_occupancy": 2,
                "base_price": 260.00,
                "taxes_and_fees": 0.10,
                "amenities": ["Hinoki Soaking Tub", "Free High-Speed WiFi", "Air Purifier", "Tea Set"],
                "total_units": 5,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Marine Drive Coastal Suites",
        "description": "Breathtaking views of the Arabian Sea along Mumbai's iconic Queen's Necklace. Features artful heritage architecture, rooftop infinity pool, and coastal dining.",
        "address": "135 Marine Drive, Nariman Point",
        "city": "Mumbai",
        "country": "India",
        "latitude": 18.9220,
        "longitude": 72.8220,
        "star_rating": 4.5,
        "guest_rating": 4.7,
        "reviews_count": 115,
        "amenities": ["Rooftop Pool", "Sea View", "Free High-Speed WiFi", "Complimentary Breakfast", "Fitness Center", "Valet Parking"],
        "cancellation_policy": "Free cancellation up to 24 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Sea View Deluxe King",
                "description": "Floor-to-ceiling windows looking directly over the waves of the Arabian Sea, marble bathroom, and plush linens.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 2,
                "base_price": 160.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Direct Sea View", "Free High-Speed WiFi", "Coffee Maker", "Bathtub"],
                "total_units": 6,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Marina Bay Horizon Haven",
        "description": "Ultra-modern eco-sanctuary overlooking Singapore's Marina Bay. Features vertical tropical gardens, smart climate controls, an infinity lap pool, and walking access to Gardens by the Bay.",
        "address": "10 Bayfront Ave, Marina Bay",
        "city": "Singapore",
        "country": "Singapore",
        "latitude": 1.2838,
        "longitude": 103.8591,
        "star_rating": 5.0,
        "guest_rating": 4.9,
        "reviews_count": 320,
        "amenities": ["Infinity Lap Pool", "Vertical Garden", "Free High-Speed WiFi", "Gourmet Breakfast", "Spa & Wellness", "EV Charging"],
        "cancellation_policy": "Free cancellation up to 48 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Skyline Panorama King",
                "description": "High-floor room with automated blackout blinds, bay panoramas, marble deep soak bath, and complimentary organic refreshments.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 2,
                "base_price": 310.00,
                "taxes_and_fees": 0.10,
                "amenities": ["Bay View", "Automated Blinds", "Free High-Speed WiFi", "Rainfall Shower"],
                "total_units": 6,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "Mantra Koodam Heritage Eco-Resort",
        "description": "An authentic eco-sanctuary recreating an ancient Tamil Brahmin agraharam village. Surrounded by coconut groves and sacred Kaveri temple tributaries in Thiruvidaimaruthur, featuring open-to-sky verandas, athangudi tiles, and traditional temple architecture.",
        "address": "Bagavathapuram Main Road, Thiruvidaimaruthur",
        "city": "Kumbakonam",
        "country": "India",
        "latitude": 10.9920,
        "longitude": 79.4380,
        "star_rating": 4.8,
        "guest_rating": 4.9,
        "reviews_count": 240,
        "amenities": ["Free High-Speed WiFi", "Heritage Pool", "Traditional South Indian Dining", "Ayurvedic Wellness Spa", "Temple Tour Concierge", "Organic Herb Garden"],
        "cancellation_policy": "Free cancellation up to 24 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1582510003544-4d00b7f74220?auto=format&fit=crop&w=1200&q=80",
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Heritage Agraharam Cottage",
                "description": "Charming individual cottage with high teak-wood ceilings, brass antiquities, private garden courtyard, and open-air rain shower.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 3,
                "base_price": 115.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Courtyard View", "Free High-Speed WiFi", "Rain Shower", "Tea & Coffee Kettle"],
                "total_units": 8,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=800&q=80"]
            },
            {
                "room_type": "Pannaiyar Mansion Suite",
                "description": "Palatial heritage suite with private verandah overlooking lotus ponds, handmade Athangudi tiles, and handcrafted rosewood swing.",
                "bed_configuration": "1 King Bed + 1 Day Bed",
                "max_occupancy": 4,
                "base_price": 185.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Private Verandah", "Lotus Pond View", "Luxury Organic Toiletries", "Free High-Speed WiFi"],
                "total_units": 4,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    },
    {
        "name": "The Leela Palace Seaface Sanctuary",
        "description": "Chennai's premier modern palace overlooking the Bay of Bengal. Inspired by Chettinad architecture, featuring grand marble pillars, seaside dining, and royal hospitality.",
        "address": "Adyar Seaface, MRC Nagar",
        "city": "Chennai",
        "country": "India",
        "latitude": 13.0163,
        "longitude": 80.2785,
        "star_rating": 5.0,
        "guest_rating": 4.9,
        "reviews_count": 310,
        "amenities": ["Sea View", "Infinity Pool", "Free High-Speed WiFi", "Luxury Spa", "24/7 Butler", "Valet Parking"],
        "cancellation_policy": "Free cancellation up to 48 hours prior to arrival",
        "eco_certified": True,
        "featured_image": "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80",
        "images": [
            "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80"
        ],
        "rooms": [
            {
                "room_type": "Grand Sea View Deluxe",
                "description": "Panoramic views of the Marina coastline, Italian marble bathroom, and plush bedding.",
                "bed_configuration": "1 King Bed",
                "max_occupancy": 2,
                "base_price": 190.00,
                "taxes_and_fees": 0.12,
                "amenities": ["Direct Ocean View", "Free High-Speed WiFi", "Deep Soaking Tub", "Espresso Machine"],
                "total_units": 6,
                "free_cancellation": True,
                "breakfast_included": True,
                "photos": ["https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=800&q=80"]
            }
        ]
    }
]

async def seed_initial_data(db: AsyncSession):
    # Check if admin user exists with configured admin email
    admin_email = settings.ADMIN_EMAIL
    result = await db.execute(select(User).where(User.email == admin_email))
    admin = result.scalars().first()
    
    if not admin:
        admin = User(
            name="System Administrator",
            email=admin_email,
            hashed_password=get_password_hash("AdminPass123!"),
            phone="+1 (555) 019-2831",
            role="admin"
        )
        db.add(admin)
        await db.commit()
        await db.refresh(admin)
    elif admin and admin.role != "admin":
        admin.role = "admin"
        await db.commit()

    # Check if demo admin user exists
    demo_admin_res = await db.execute(select(User).where(User.email == "admin@hotelbooking.com"))
    demo_admin = demo_admin_res.scalars().first()
    if not demo_admin and admin_email != "admin@hotelbooking.com":
        demo_admin = User(
            name="Hotel Admin",
            email="admin@hotelbooking.com",
            hashed_password=get_password_hash("AdminPass123!"),
            phone="+1 (555) 019-2831",
            role="admin"
        )
        db.add(demo_admin)
        await db.commit()
    elif demo_admin and demo_admin.role != "admin":
        demo_admin.role = "admin"
        await db.commit()

    # Check if demo guest user exists
    user_result = await db.execute(select(User).where(User.email == "guest@hotelbooking.com"))
    guest = user_result.scalars().first()
    if not guest:
        guest = User(
            name="Alex Morgan",
            email="guest@hotelbooking.com",
            hashed_password=get_password_hash("GuestPass123!"),
            phone="+1 (555) 443-8921",
            role="user"
        )
        db.add(guest)
        await db.commit()
        await db.refresh(guest)

    # Seed initial registration settings if not present
    reg_res = await db.execute(select(SystemSetting).where(SystemSetting.key == "registration_settings"))
    if not reg_res.scalars().first():
        setting = SystemSetting(
            key="registration_settings",
            value={
                "allow_open_registration": True,
                "require_phone": False,
                "require_email_verification": False,
                "min_password_length": 6,
                "default_role": "user",
                "allow_guest_checkout": True,
                "send_welcome_email": True,
                "maintenance_mode": False,
                "terms_version": "2026.2"
            },
            description="Dynamic user registration rules and platform controls"
        )
        db.add(setting)
        await db.commit()

    # Check if hotels already exist
    existing_hotel = await db.execute(select(Hotel))
    if not existing_hotel.scalars().first():
        for h_data in INITIAL_HOTELS:
            rooms_data = h_data.pop("rooms", [])
            hotel = Hotel(**h_data, owner_id=admin.id)
            db.add(hotel)
            await db.commit()
            await db.refresh(hotel)

            for r_data in rooms_data:
                room = Room(**r_data, hotel_id=hotel.id)
                db.add(room)
            
            # Add initial authentic review
            rev = Review(
                hotel_id=hotel.id,
                user_id=guest.id,
                rating=5.0,
                title="Transparent, refreshing, and genuinely serene stay!",
                comment="Loved the honest upfront pricing without any surprise resort fees at check-in. The room was immaculately clean and peaceful."
            )
            db.add(rev)
            await db.commit()
