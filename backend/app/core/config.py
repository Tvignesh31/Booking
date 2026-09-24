import os
from typing import Optional
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "Responsible Hotel Booking API"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str = os.getenv("SECRET_KEY", "super-secret-production-key-change-in-production-1234567890")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days
    
    # Defaults to async SQLite for out-of-the-box local development, but can be overridden with Postgres
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./hotel_booking.db")
    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development")  # "development", "staging", "production", "test"
    
    # Google API Key (optional, for Google Places photos & geocoding)
    GOOGLE_API_KEY: Optional[str] = os.getenv("GOOGLE_API_KEY", None)

    # Razorpay Payment Gateway Credentials
    RAZORPAY_KEY_ID: str = os.getenv("RAZORPAY_KEY_ID", "rzp_test_TZYopKZRAf9Kk3")
    RAZORPAY_KEY_SECRET: str = os.getenv("RAZORPAY_KEY_SECRET", "EHqokcfanhu4AB5wfHhzXs8N")

    # Administrator Settings
    ADMIN_EMAIL: str = os.getenv("ADMIN_EMAIL", "thiruganamthiruganam2185@gmail.com")

    # Email Service Configuration (SMTP, Resend, SendGrid, Brevo, or Mock)
    EMAIL_PROVIDER: str = os.getenv("EMAIL_PROVIDER", "mock")  # "smtp", "resend", "sendgrid", "mock"
    EMAIL_API_KEY: Optional[str] = os.getenv("EMAIL_API_KEY", None)
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "HavenStay <notifications@havenstay.local>")
    EMAIL_ENABLED: bool = os.getenv("EMAIL_ENABLED", "true").lower() in ("true", "1", "yes")
    EMAIL_MAX_RETRIES: int = int(os.getenv("EMAIL_MAX_RETRIES", "3"))
    EMAIL_RETRY_BACKOFF_FACTOR: float = float(os.getenv("EMAIL_RETRY_BACKOFF_FACTOR", "1.5"))
    EMAIL_RATE_LIMIT_MINUTES: int = int(os.getenv("EMAIL_RATE_LIMIT_MINUTES", "1"))
    EMAIL_WEBHOOK_SECRET: Optional[str] = os.getenv("EMAIL_WEBHOOK_SECRET", None)

    # SMTP Provider Settings (Works with Gmail App Password, Brevo, Outlook, or custom mail server)
    SMTP_HOST: Optional[str] = os.getenv("SMTP_HOST", None)
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER: Optional[str] = os.getenv("SMTP_USER", None)
    SMTP_PASSWORD: Optional[str] = os.getenv("SMTP_PASSWORD", None)
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    SMTP_USE_SSL: bool = os.getenv("SMTP_USE_SSL", "false").lower() in ("true", "1", "yes")

    # Cloudflare Storage (Images & Videos via Cloudflare R2 / Cloudflare Images)
    CLOUDFLARE_ACCOUNT_ID: Optional[str] = os.getenv("CLOUDFLARE_ACCOUNT_ID", None)
    CLOUDFLARE_R2_ACCESS_KEY: Optional[str] = os.getenv("CLOUDFLARE_R2_ACCESS_KEY", None)
    CLOUDFLARE_R2_SECRET_KEY: Optional[str] = os.getenv("CLOUDFLARE_R2_SECRET_KEY", None)
    CLOUDFLARE_R2_BUCKET: str = os.getenv("CLOUDFLARE_R2_BUCKET", "havenstay-media")
    CLOUDFLARE_R2_PUBLIC_URL: Optional[str] = os.getenv("CLOUDFLARE_R2_PUBLIC_URL", None)
    CLOUDFLARE_IMAGES_API_TOKEN: Optional[str] = os.getenv("CLOUDFLARE_IMAGES_API_TOKEN", None)
    CLOUDFLARE_IMAGES_ACCOUNT_HASH: Optional[str] = os.getenv("CLOUDFLARE_IMAGES_ACCOUNT_HASH", None)
    LOCAL_UPLOAD_DIR: str = os.getenv("LOCAL_UPLOAD_DIR", "uploads")

    # CORS Origins
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

    model_config = SettingsConfigDict(case_sensitive=True, env_file=".env", extra="ignore")

settings = Settings()
