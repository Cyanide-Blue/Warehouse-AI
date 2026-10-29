"""
Main FastAPI application entry point.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
from pathlib import Path
import logging

from .config import APP_NAME, APP_VERSION, APP_DESCRIPTION, ALLOWED_ORIGINS
from .database import init_db
from .exceptions import AppException

# Import routers
from .routers import (
    auth, products, categories, units, suppliers,
    imports_router, exports_router, inventory, reports, ai
)

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ==================== STARTUP AND SHUTDOWN EVENTS ====================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application startup and shutdown events.
    """
    # Startup
    logger.info(f"🚀 {APP_NAME} v{APP_VERSION} starting...")
    try:
        init_db()
        logger.info("✅ Database initialized successfully")
    except Exception as e:
        logger.error(f"❌ Database initialization failed: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("👋 Application shutting down...")


# ==================== CREATE FASTAPI APP ====================

app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    openapi_url="/openapi.json"
)


# ==================== MIDDLEWARE CONFIGURATION ====================

# CORS Middleware - Allow frontend to call backend API
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info(f"✅ CORS configured for origins: {ALLOWED_ORIGINS}")


# ==================== EXCEPTION HANDLERS ====================

@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    """Handle custom application exceptions"""
    logger.warning(f"AppException: {exc.error_code} - {exc.message}")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.message,
            "error_code": exc.error_code,
            "data": exc.data or None
        },
    )


@app.exception_handler(Exception)
async def global_exception_handler(request, exc: Exception):
    """Handle unexpected exceptions"""
    logger.error(f"Unexpected error: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR",
        },
    )


# ==================== API ROUTES REGISTRATION ====================

api_prefix = "/api"

# Auth routes
app.include_router(
    auth.router,
    prefix=f"{api_prefix}/auth",
    tags=["Authentication"],
)
logger.info("✅ Auth router registered")

# Product routes
app.include_router(
    products.router,
    prefix=f"{api_prefix}/products",
    tags=["Products"],
)
logger.info("✅ Products router registered")

# Category routes
app.include_router(
    categories.router,
    prefix=f"{api_prefix}/categories",
    tags=["Categories"],
)
logger.info("✅ Categories router registered")

# Unit routes
app.include_router(
    units.router,
    prefix=f"{api_prefix}/units",
    tags=["Units"],
)
logger.info("✅ Units router registered")

# Supplier routes
app.include_router(
    suppliers.router,
    prefix=f"{api_prefix}/suppliers",
    tags=["Suppliers"],
)
logger.info("✅ Suppliers router registered")

# Import routes
app.include_router(
    imports_router.router,
    prefix=f"{api_prefix}/imports",
    tags=["Import Receipts"],
)
logger.info("✅ Imports router registered")

# Export routes
app.include_router(
    exports_router.router,
    prefix=f"{api_prefix}/exports",
    tags=["Export Receipts"],
)
logger.info("✅ Exports router registered")

# Inventory routes
app.include_router(
    inventory.router,
    prefix=f"{api_prefix}/inventory",
    tags=["Inventory"],
)
logger.info("✅ Inventory router registered")

# Report routes
app.include_router(
    reports.router,
    prefix=f"{api_prefix}/reports",
    tags=["Reports"],
)
logger.info("✅ Reports router registered")

# AI routes
app.include_router(
    ai.router,
    prefix=f"{api_prefix}/ai",
    tags=["AI Features"],
)
logger.info("✅ AI router registered")


# ==================== HEALTH CHECK ENDPOINTS ====================

@app.get("/health", tags=["Health"])
async def health_check():
    """
    Health check endpoint.
    
    Returns:
        Health status
    
    Example response:
        {
            "status": "ok",
            "app_name": "Warehouse Management System with AI",
            "version": "1.0.0"
        }
    """
    return {
        "status": "ok",
        "app_name": APP_NAME,
        "version": APP_VERSION
    }


@app.get("/api/info", tags=["Health"])
async def root():
    """
    Root endpoint.
    
    Returns:
        Application information and useful links
    
    Example response:
        {
            "message": "Welcome to Warehouse Management System with AI",
            "version": "1.0.0",
            "docs": "/docs",
            "openapi": "/openapi.json"
        }
    """
    return {
        "message": f"Welcome to {APP_NAME}",
        "version": APP_VERSION,
        "docs": "/docs",
        "openapi": "/openapi.json"
    }


# ==================== STARTUP LOGGING ====================

logger.info(f"\n{'='*60}")
logger.info(f"  {APP_NAME}")
logger.info(f"  Version: {APP_VERSION}")
logger.info(f"{'='*60}")
logger.info("📌 API Documentation: http://localhost:8000/docs")
logger.info("📌 Health Check: http://localhost:8000/health")
logger.info(f"{'='*60}\n")


# ==================== STATIC FRONTEND SERVING ====================
dist_dir = Path(__file__).resolve().parent.parent.parent / "frontend" / "dist"
if dist_dir.exists():
    app.mount("/", StaticFiles(directory=str(dist_dir), html=True), name="frontend")
