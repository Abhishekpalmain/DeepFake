import os
from typing import List
from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "Deepfake Shield"
    VERSION: str = "1.0.0"
    DEBUG: bool = False

    # Database — defaults to SQLite for local dev, override with Render's PostgreSQL URL
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./deepfake_shield.db")

    # Security
    SECRET_KEY: str = os.getenv("SECRET_KEY", "change-me-in-production-use-a-long-random-string")
    ALGORITHM: str = "HS256"

    # File Upload
    MAX_FILE_SIZE: int = 100 * 1024 * 1024  # 100 MB
    ALLOWED_VIDEO_TYPES: List[str] = ["video/mp4", "video/avi", "video/quicktime", "video/x-msvideo", "video/x-matroska"]
    ALLOWED_IMAGE_TYPES: List[str] = ["image/jpeg", "image/png", "image/webp"]
    ALLOWED_AUDIO_TYPES: List[str] = ["audio/mpeg", "audio/wav", "audio/x-wav", "audio/mp4", "audio/ogg", "audio/flac"]

    # External APIs
    GOOGLE_API_KEY: str = os.getenv("GOOGLE_API_KEY", "")

    # Processing
    MAX_CONCURRENT_PROCESSING: int = 3
    PROCESSING_TIMEOUT: int = 120  # seconds

    # CORS — accepts comma-separated string or JSON list from env
    ALLOWED_ORIGINS: str = "*"

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_origins(cls, v: str) -> str:
        return v if isinstance(v, str) else ",".join(v)

    # Rate Limiting
    RATE_LIMIT_REQUESTS: int = 60
    RATE_LIMIT_WINDOW: int = 3600  # seconds

    # Monitoring
    ENABLE_METRICS: bool = False

    # Logging
    LOG_LEVEL: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
