import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "Company A - POD Capture & Billing API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Security
    SECRET_KEY: str = "insecure-secret-for-demo-change-in-production-12345678"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days for easy demoing
    
    # Database
    DATABASE_URL: str = "sqlite+aiosqlite:///./pod_system.db"
    
    # AI Engine
    GEMINI_API_KEY: str = ""
    USE_MOCK_AI: bool = True  # Automatically falls back to deterministic rule engine if no key
    
    # CORS
    BACKEND_CORS_ORIGINS: List[str] = ["*"]
    
    # Storage
    UPLOAD_DIR: str = "./uploads"

    class Config:
        env_file = ".env"
        case_sensitive = True

settings = Settings()

os.makedirs(settings.UPLOAD_DIR, exist_ok=True)

