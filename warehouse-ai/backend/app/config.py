"""
Configuration settings for the warehouse management system.
"""
import os
from datetime import timedelta
from typing import Optional
from pathlib import Path
from dotenv import load_dotenv

# Base backend directory
BASE_DIR = Path(__file__).resolve().parent.parent
env_file = BASE_DIR / ".env"
if env_file.exists():
    load_dotenv(env_file)

# Database
raw_db_url = os.getenv("DATABASE_URL")
if not raw_db_url or raw_db_url.strip() in ("sqlite:///./warehouse.db", "sqlite:///warehouse.db"):
    db_file_path = (BASE_DIR / "warehouse.db").as_posix()
    DATABASE_URL = f"sqlite:///{db_file_path}"
else:
    DATABASE_URL = raw_db_url

# JWT
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 30))
REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", 7))

# OpenAI API
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")

# Google Gemini API
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.5-flash")

# Application Settings
APP_NAME = "Warehouse Management System with AI"
APP_VERSION = "1.0.0"
APP_DESCRIPTION = "A comprehensive warehouse management system with AI-powered features"

# CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
]

# Pagination
DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 100

# Business Rules
MINIMUM_PASSWORD_LENGTH = 8
MAX_LOGIN_ATTEMPTS = 5
LOCK_TIME_MINUTES = 15

# AI Settings
AI_REPORT_MAX_TOKENS = 2000
AI_RECOMMENDATION_MAX_TOKENS = 1500
AI_ANOMALY_MAX_TOKENS = 1500

# File Upload
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10MB
UPLOAD_DIRECTORY = "uploads"
