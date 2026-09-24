from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_data import seed_initial_data
from app.api.auth import router as auth_router
from app.api.hotels import router as hotels_router
from app.api.rooms import router as rooms_router
from app.api.bookings import router as bookings_router
from app.api.favorites import router as favorites_router
from app.api.admin import router as admin_router
from app.api.places import router as places_router
from app.api.payments import router as payments_router
from app.api.notifications import router as notifications_router
from app.api.media import router as media_router
from app.services.email_service import check_email_provider_at_startup

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Self-healing column migration for existing SQLite databases
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE email_notifications ADD COLUMN subject VARCHAR(500)"))
        except Exception:
            pass
        try:
            from sqlalchemy import text
            await conn.execute(text("ALTER TABLE email_notifications ADD COLUMN html_content TEXT"))
        except Exception:
            pass
    
    # Seed data
    async with AsyncSessionLocal() as session:
        try:
            await seed_initial_data(session)
        except Exception as e:
            print(f"Seed data error (skipped if already seeded): {e}")

    # Startup Email Provider Resolution & Domain Verification
    check_email_provider_at_startup()

    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Responsible Hotel Room Discovery & Reservation API - Built with zero dark patterns, transparent pricing, and privacy protection.",
    version="1.1.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router, prefix=settings.API_V1_STR)
app.include_router(hotels_router, prefix=settings.API_V1_STR)
app.include_router(rooms_router, prefix=settings.API_V1_STR)
app.include_router(bookings_router, prefix=settings.API_V1_STR)
app.include_router(favorites_router, prefix=settings.API_V1_STR)
app.include_router(admin_router, prefix=settings.API_V1_STR)
app.include_router(places_router, prefix=settings.API_V1_STR)
app.include_router(payments_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router, prefix=settings.API_V1_STR)
app.include_router(notifications_router)  # Allows direct access to /internal/notifications/email-webhook
app.include_router(media_router, prefix=settings.API_V1_STR)

@app.get("/")
async def root():
    return {
        "app": settings.PROJECT_NAME,
        "status": "online",
        "version": "1.1.0",
        "docs_url": "/docs",
        "privacy_commitment": "We do not store precise GPS coordinates permanently. All pricing is 100% upfront and transparent.",
        "gateways_configured": ["razorpay", "upi", "cards", "netbanking", "wallets"]
    }
