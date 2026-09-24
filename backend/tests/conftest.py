import pytest
import pytest_asyncio
from sqlalchemy import delete
from app.core.database import engine, Base, AsyncSessionLocal
from app.services.seed_data import seed_initial_data
from app.models import Booking, EmailNotification, Payment, User

@pytest_asyncio.fixture(autouse=True)
async def init_test_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    async with AsyncSessionLocal() as session:
        try:
            await seed_initial_data(session)
        except Exception:
            pass
        # Clean up prior test bookings to ensure clean inventory for each test
        await session.execute(delete(EmailNotification))
        await session.execute(delete(Payment))
        await session.execute(delete(Booking))
        await session.execute(
            delete(User).where(
                User.email.not_in([
                    "admin@hotelbooking.com",
                    "thiruganamthiruganam2185@gmail.com",
                    "guest@hotelbooking.com"
                ])
            )
        )
        await session.commit()
    yield
