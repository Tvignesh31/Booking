from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.database import get_db
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models import User, Booking, Review, Favorite, SystemSetting, AuditActivity
from app.schemas import UserCreate, UserLogin, UserUpdate, UserResponse, TokenResponse
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])

DEFAULT_REGISTRATION_SETTINGS = {
    "allow_open_registration": True,
    "require_phone": False,
    "require_email_verification": False,
    "min_password_length": 6,
    "default_role": "user",
    "allow_guest_checkout": True,
    "send_welcome_email": True,
    "maintenance_mode": False,
    "terms_version": "2026.2"
}

async def get_system_registration_settings(db: AsyncSession) -> dict:
    res = await db.get(SystemSetting, "registration_settings")
    if res and res.value:
        settings = dict(DEFAULT_REGISTRATION_SETTINGS)
        settings.update(res.value)
        return settings
    return dict(DEFAULT_REGISTRATION_SETTINGS)


@router.get("/registration-policy")
async def get_public_registration_policy(db: AsyncSession = Depends(get_db)):
    """Public endpoint for registration form rules (e.g. required phone, min password length)."""
    settings = await get_system_registration_settings(db)
    return {
        "allow_open_registration": settings.get("allow_open_registration", True),
        "require_phone": settings.get("require_phone", False),
        "min_password_length": settings.get("min_password_length", 6),
        "allow_guest_checkout": settings.get("allow_guest_checkout", True),
        "terms_version": settings.get("terms_version", "2026.2")
    }


@router.post("/signup", response_model=TokenResponse)
async def signup(user_in: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check registration settings
    policy = await get_system_registration_settings(db)
    if not policy.get("allow_open_registration", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Registration is currently paused by the platform administrator. Please try again later or check in with guest services."
        )

    min_pw_len = policy.get("min_password_length", 6)
    if len(user_in.password) < min_pw_len:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Password must be at least {min_pw_len} characters long."
        )

    if policy.get("require_phone", False) and not (user_in.phone and user_in.phone.strip()):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A valid contact phone number is required to complete registration."
        )

    # Check if email is already registered
    existing = await db.execute(select(User).where(User.email == user_in.email.lower()))
    if existing.scalars().first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    role = policy.get("default_role", "user")
    new_user = User(
        name=user_in.name.strip(),
        email=user_in.email.lower().strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        hashed_password=get_password_hash(user_in.password),
        role=role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Log audit activity
    try:
        activity = AuditActivity(
            activity_type="user_registered",
            title=f"New User Joined: {new_user.name}",
            description=f"Account created for {new_user.email} with role '{new_user.role}'.",
            actor_email=new_user.email,
            meta_data={"user_id": new_user.id, "email": new_user.email, "role": new_user.role}
        )
        db.add(activity)
        await db.commit()
    except Exception:
        pass
    
    token = create_access_token(new_user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == credentials.email.lower().strip()))
    user = result.scalars().first()
    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )
    
    token = create_access_token(user.id)
    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user)):
    return UserResponse.model_validate(current_user)

@router.patch("/me", response_model=UserResponse)
async def update_my_profile(
    user_in: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_in.name is not None:
        current_user.name = user_in.name.strip()
    if user_in.phone is not None:
        current_user.phone = user_in.phone.strip()
    
    await db.commit()
    await db.refresh(current_user)
    return UserResponse.model_validate(current_user)

# Responsible Data Privacy: GDPR Right to Data Portability
@router.get("/me/export")
async def export_my_data(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    bookings_res = await db.execute(select(Booking).where(Booking.user_id == current_user.id))
    bookings = bookings_res.scalars().all()

    reviews_res = await db.execute(select(Review).where(Review.user_id == current_user.id))
    reviews = reviews_res.scalars().all()

    return {
        "user_profile": {
            "id": current_user.id,
            "name": current_user.name,
            "email": current_user.email,
            "phone": current_user.phone,
            "role": current_user.role,
            "created_at": current_user.created_at.isoformat() if current_user.created_at else None
        },
        "bookings_count": len(bookings),
        "bookings": [
            {
                "reference": b.booking_reference,
                "hotel_id": b.hotel_id,
                "room_id": b.room_id,
                "check_in": b.check_in,
                "check_out": b.check_out,
                "total_price": b.total_price,
                "status": b.status,
                "created_at": b.created_at.isoformat() if b.created_at else None
            } for b in bookings
        ],
        "reviews": [
            {
                "hotel_id": r.hotel_id,
                "rating": r.rating,
                "title": r.title,
                "comment": r.comment,
                "created_at": r.created_at.isoformat() if r.created_at else None
            } for r in reviews
        ],
        "data_transparency_note": "This file contains all your personal data held in the system in compliance with GDPR/DPDP principles."
    }

# Responsible Data Privacy: GDPR Right to Erasure
@router.delete("/me")
async def delete_my_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    await db.delete(current_user)
    await db.commit()
    return {"message": "Your account and all associated personal data have been completely deleted."}
