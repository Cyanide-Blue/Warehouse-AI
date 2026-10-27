# BƯỚC 4: THIẾT KẾ KIẾN TRÚC FASTAPI
## Hệ Thống Quản Lý Kho Có Tích Hợp AI

---

## 1. TỔNG QUAN KIẾN TRÚC

FastAPI Application được chia thành các layer:

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND (React)                       │
│         (Chạy trên http://localhost:3000)           │
└────────────────────────┬────────────────────────────┘
                         │
                    REST API
                   (JSON/HTTP)
                         │
┌────────────────────────▼────────────────────────────┐
│                  FASTAPI APPLICATION                 │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────────────────────────────────────────┐   │
│  │       ROUTER LAYER (API Endpoints)           │   │
│  │  ├─ /api/auth/*       (Authentication)       │   │
│  │  ├─ /api/products/*   (Product CRUD)         │   │
│  │  ├─ /api/imports/*    (Import Receipts)      │   │
│  │  ├─ /api/exports/*    (Export Receipts)      │   │
│  │  ├─ /api/inventory/*  (Inventory)            │   │
│  │  ├─ /api/reports/*    (Reports)              │   │
│  │  └─ /api/ai/*         (AI Features)          │   │
│  └──────────────────────────────────────────────┘   │
│                         ▲                            │
│                         │ Dependency Injection        │
│                         │                            │
│  ┌──────────────────────▼──────────────────────┐   │
│  │       SERVICE LAYER (Business Logic)        │   │
│  │  ├─ AuthService                             │   │
│  │  ├─ ProductService                          │   │
│  │  ├─ ImportService                           │   │
│  │  ├─ ExportService (with transaction)        │   │
│  │  ├─ InventoryService                        │   │
│  │  ├─ ReportService                           │   │
│  │  └─ AIService                               │   │
│  └──────────────────────▲──────────────────────┘   │
│                         │                            │
│                         │                            │
│  ┌──────────────────────▼──────────────────────┐   │
│  │   REPOSITORY LAYER (Database Access)        │   │
│  │  ├─ UserRepository                          │   │
│  │  ├─ ProductRepository                       │   │
│  │  ├─ ImportReceiptRepository                 │   │
│  │  └─ ... (other repositories)                │   │
│  └──────────────────────▲──────────────────────┘   │
│                         │                            │
│                         │                            │
│  ┌──────────────────────▼──────────────────────┐   │
│  │       SQLALCHEMY ORM LAYER                   │   │
│  │  ├─ User, Role, Product, Category           │   │
│  │  ├─ ImportReceipt, ExportReceipt            │   │
│  │  └─ InventoryTransaction                    │   │
│  └──────────────────────▲──────────────────────┘   │
│                         │                            │
└─────────────────────────┼────────────────────────────┘
                          │
                   SQLite Database
                    (warehouse.db)
```

---

## 2. CẤU TRÚC THƯ MỤC

```
warehouse-ai/
└── backend/
    ├── app/
    │   ├── __init__.py                # Export app, db, models
    │   ├── main.py                    # FastAPI application
    │   ├── config.py                  # Configuration (already done)
    │   ├── database.py                # Database setup (already done)
    │   ├── exceptions.py              # Custom exceptions
    │   │
    │   ├── models/                    # SQLAlchemy Models (already done)
    │   │   └── __init__.py            # All models
    │   │
    │   ├── schemas/                   # Pydantic Schemas (Request/Response)
    │   │   ├── __init__.py
    │   │   ├── base.py                # Base schemas
    │   │   ├── user.py                # User schemas
    │   │   ├── product.py             # Product schemas
    │   │   ├── import_receipt.py      # Import schemas
    │   │   ├── export_receipt.py      # Export schemas
    │   │   ├── inventory.py           # Inventory schemas
    │   │   ├── report.py              # Report schemas
    │   │   └── ai.py                  # AI schemas
    │   │
    │   ├── routers/                   # API Routes
    │   │   ├── __init__.py
    │   │   ├── auth.py                # POST /api/auth/login, GET /api/auth/me
    │   │   ├── products.py            # GET/POST/PUT/DELETE /api/products
    │   │   ├── categories.py          # GET/POST /api/categories
    │   │   ├── units.py               # GET/POST /api/units
    │   │   ├── suppliers.py           # CRUD /api/suppliers
    │   │   ├── imports.py             # CRUD /api/imports
    │   │   ├── exports.py             # CRUD /api/exports
    │   │   ├── inventory.py           # GET /api/inventory
    │   │   ├── reports.py             # GET /api/reports
    │   │   └── ai.py                  # POST /api/ai/*
    │   │
    │   ├── services/                  # Business Logic
    │   │   ├── __init__.py
    │   │   ├── base_service.py        # Base service class
    │   │   ├── auth_service.py        # Authentication logic
    │   │   ├── product_service.py     # Product management
    │   │   ├── import_service.py      # Import receipt logic
    │   │   ├── export_service.py      # Export receipt logic (with transaction)
    │   │   ├── inventory_service.py   # Inventory calculations
    │   │   ├── report_service.py      # Report generation
    │   │   └── ai_service.py          # OpenAI integration
    │   │
    │   ├── repositories/              # Database Access
    │   │   ├── __init__.py
    │   │   ├── base_repository.py     # Base CRUD operations
    │   │   ├── user_repository.py
    │   │   ├── product_repository.py
    │   │   ├── import_receipt_repository.py
    │   │   ├── export_receipt_repository.py
    │   │   ├── inventory_transaction_repository.py
    │   │   └── ...
    │   │
    │   ├── auth/                      # Authentication & Authorization
    │   │   ├── __init__.py
    │   │   ├── jwt_handler.py         # JWT token creation/verification
    │   │   ├── security.py            # Password hashing
    │   │   └── dependencies.py        # Dependency injection (get_current_user, require_role)
    │   │
    │   ├── ai/                        # AI Integration
    │   │   ├── __init__.py
    │   │   ├── openai_client.py       # OpenAI API wrapper
    │   │   ├── prompts.py             # System prompts
    │   │   └── validators.py          # JSON response validation
    │   │
    │   └── middleware/                # Custom Middleware (optional)
    │       ├── __init__.py
    │       ├── error_handler.py       # Global error handling
    │       └── logging.py             # Request/Response logging
    │
    ├── tests/                         # Unit & Integration Tests
    │   ├── __init__.py
    │   ├── conftest.py                # Pytest configuration
    │   ├── test_auth.py
    │   ├── test_products.py
    │   ├── test_imports.py
    │   ├── test_exports.py
    │   ├── test_inventory.py
    │   └── test_ai.py
    │
    ├── requirements.txt               # Dependencies (already done)
    ├── .env.example                  # Environment variables (already done)
    ├── .env                          # Actual environment (create locally)
    └── run.py                        # Entry point to start server
```

---

## 3. MAIN.PY - FastAPI APPLICATION

```python
# backend/app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import os

from .config import APP_NAME, APP_VERSION, APP_DESCRIPTION, ALLOWED_ORIGINS
from .database import init_db, get_db
from .exceptions import AppException

# Import routers
from .routers import auth, products, categories, units, suppliers, imports_router, exports_router, inventory, reports, ai


# Startup and shutdown events
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    print(f"🚀 {APP_NAME} v{APP_VERSION} starting...")
    init_db()  # Create all tables if not exist
    print("✅ Database initialized")
    yield
    # Shutdown
    print("👋 Application shutting down...")


# Create FastAPI app
app = FastAPI(
    title=APP_NAME,
    description=APP_DESCRIPTION,
    version=APP_VERSION,
    lifespan=lifespan
)

# ============================================
# MIDDLEWARE CONFIGURATION
# ============================================

# 1. CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 2. Trusted Host Middleware (security)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.example.com"],
)

# ============================================
# ERROR HANDLING
# ============================================

@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    """Handle custom application exceptions"""
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
    return JSONResponse(
        status_code=500,
        content={
            "status": "error",
            "message": "Internal server error",
            "error_code": "INTERNAL_ERROR",
        },
    )

# ============================================
# ROUTES REGISTRATION
# ============================================

# API v1 routes
api_prefix = "/api"

# Auth routes
app.include_router(
    auth.router,
    prefix=f"{api_prefix}/auth",
    tags=["Authentication"]
)

# Product routes
app.include_router(
    products.router,
    prefix=f"{api_prefix}/products",
    tags=["Products"]
)

# Category routes
app.include_router(
    categories.router,
    prefix=f"{api_prefix}/categories",
    tags=["Categories"]
)

# Unit routes
app.include_router(
    units.router,
    prefix=f"{api_prefix}/units",
    tags=["Units"]
)

# Supplier routes
app.include_router(
    suppliers.router,
    prefix=f"{api_prefix}/suppliers",
    tags=["Suppliers"]
)

# Import routes
app.include_router(
    imports_router.router,
    prefix=f"{api_prefix}/imports",
    tags=["Import Receipts"]
)

# Export routes
app.include_router(
    exports_router.router,
    prefix=f"{api_prefix}/exports",
    tags=["Export Receipts"]
)

# Inventory routes
app.include_router(
    inventory.router,
    prefix=f"{api_prefix}/inventory",
    tags=["Inventory"]
)

# Report routes
app.include_router(
    reports.router,
    prefix=f"{api_prefix}/reports",
    tags=["Reports"]
)

# AI routes
app.include_router(
    ai.router,
    prefix=f"{api_prefix}/ai",
    tags=["AI Features"]
)

# ============================================
# HEALTH CHECK ENDPOINTS
# ============================================

@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "ok",
        "app_name": APP_NAME,
        "version": APP_VERSION
    }

@app.get("/", tags=["Health"])
async def root():
    """Root endpoint"""
    return {
        "message": f"Welcome to {APP_NAME}",
        "version": APP_VERSION,
        "docs": "/docs",
        "openapi": "/openapi.json"
    }

# ============================================
# Run application
# ============================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=os.getenv("DEBUG", True),
        log_level="info"
    )
```

---

## 4. EXCEPTIONS - Custom Exception Handling

```python
# backend/app/exceptions.py

from typing import Optional, Any

class AppException(Exception):
    """Base application exception"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        error_code: str = "BAD_REQUEST",
        data: Optional[Any] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.data = data
        super().__init__(self.message)


# Authentication Exceptions
class UnauthorizedException(AppException):
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401, "UNAUTHORIZED")

class InvalidCredentialsException(AppException):
    def __init__(self, message: str = "Invalid username or password"):
        super().__init__(message, 401, "INVALID_CREDENTIALS")

class TokenExpiredException(AppException):
    def __init__(self, message: str = "Token has expired"):
        super().__init__(message, 401, "TOKEN_EXPIRED")

class InvalidTokenException(AppException):
    def __init__(self, message: str = "Invalid token"):
        super().__init__(message, 401, "INVALID_TOKEN")

class ForbiddenException(AppException):
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403, "FORBIDDEN")


# Resource Exceptions
class ResourceNotFoundException(AppException):
    def __init__(self, resource: str = "Resource", resource_id: Any = None):
        msg = f"{resource} not found"
        if resource_id:
            msg += f" (ID: {resource_id})"
        super().__init__(msg, 404, "NOT_FOUND")

class DuplicateResourceException(AppException):
    def __init__(self, resource: str = "Resource", field: str = None):
        msg = f"{resource} already exists"
        if field:
            msg += f" (field: {field})"
        super().__init__(msg, 409, "DUPLICATE_RESOURCE")


# Business Logic Exceptions
class InsufficientStockException(AppException):
    def __init__(self, product_code: str, current_stock: int, required: int):
        msg = f"Insufficient stock for {product_code}: current={current_stock}, required={required}"
        super().__init__(msg, 400, "INSUFFICIENT_STOCK", {
            "product_code": product_code,
            "current_stock": current_stock,
            "required": required
        })

class InvalidReceiptStatusException(AppException):
    def __init__(self, receipt_code: str, current_status: str, action: str):
        msg = f"Cannot {action} receipt {receipt_code} with status {current_status}"
        super().__init__(msg, 400, "INVALID_RECEIPT_STATUS")

class TransactionFailedException(AppException):
    def __init__(self, message: str = "Transaction failed"):
        super().__init__(message, 400, "TRANSACTION_FAILED")


# Validation Exceptions
class ValidationException(AppException):
    def __init__(self, message: str, field: str = None):
        super().__init__(message, 400, "VALIDATION_ERROR", {"field": field})

class InvalidQuantityException(AppException):
    def __init__(self, message: str = "Quantity must be greater than 0"):
        super().__init__(message, 400, "INVALID_QUANTITY")


# External Service Exceptions
class OpenAIException(AppException):
    def __init__(self, message: str = "OpenAI API error"):
        super().__init__(message, 500, "OPENAI_ERROR")

class ExternalServiceException(AppException):
    def __init__(self, service_name: str, message: str = None):
        msg = f"{service_name} service error"
        if message:
            msg += f": {message}"
        super().__init__(msg, 500, "EXTERNAL_SERVICE_ERROR")
```

---

## 5. AUTHENTICATION DEPENDENCIES

```python
# backend/app/auth/dependencies.py

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from typing import Optional

from ..database import get_db
from ..models import User
from .jwt_handler import verify_token
from ..exceptions import UnauthorizedException, ForbiddenException

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    Usage:
        @app.get("/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    """
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if not user_id:
            raise UnauthorizedException("Invalid token")
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        
        if not user:
            raise UnauthorizedException("User not found")
        
        if not user.is_active:
            raise UnauthorizedException("User is inactive")
        
        return user
        
    except Exception as e:
        raise UnauthorizedException(str(e))


def require_role(*roles: str):
    """
    Check if user has required role(s).
    
    Usage:
        @app.delete("/products/{id}")
        async def delete_product(
            id: int,
            current_user: User = Depends(require_role("ADMIN"))
        ):
            return {"message": "Deleted"}
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in roles:
            raise ForbiddenException(f"Required role(s): {', '.join(roles)}")
        return current_user
    
    return role_checker


def get_current_admin(current_user: User = Depends(require_role("ADMIN"))) -> User:
    """Shortcut: require ADMIN role"""
    return current_user


def get_current_storekeeper(current_user: User = Depends(require_role("STOREKEEPER"))) -> User:
    """Shortcut: require STOREKEEPER role"""
    return current_user


def get_current_accountant(current_user: User = Depends(require_role("ACCOUNTANT"))) -> User:
    """Shortcut: require ACCOUNTANT role"""
    return current_user
```

---

## 6. ROUTER STRUCTURE EXAMPLE

```python
# backend/app/routers/products.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional

from ..database import get_db
from ..models import Product
from ..schemas.product import ProductCreate, ProductUpdate, ProductResponse
from ..services.product_service import ProductService
from ..auth.dependencies import get_current_user, require_role
from ..models import User

router = APIRouter()


@router.get("", response_model=List[ProductResponse])
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    category_id: Optional[int] = None,
    is_active: Optional[bool] = True,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List all products with pagination and filtering"""
    service = ProductService(db)
    return service.list_products(skip=skip, limit=limit, category_id=category_id, is_active=is_active)


@router.post("", response_model=ProductResponse)
async def create_product(
    product: ProductCreate,
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER")),
    db: Session = Depends(get_db)
):
    """Create a new product"""
    service = ProductService(db)
    return service.create_product(product)


@router.get("/{id}", response_model=ProductResponse)
async def get_product(
    id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get product by ID"""
    service = ProductService(db)
    return service.get_product_by_id(id)


@router.put("/{id}", response_model=ProductResponse)
async def update_product(
    id: int,
    product_update: ProductUpdate,
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER")),
    db: Session = Depends(get_db)
):
    """Update product"""
    service = ProductService(db)
    return service.update_product(id, product_update)


@router.delete("/{id}")
async def delete_product(
    id: int,
    current_user: User = Depends(require_role("ADMIN")),
    db: Session = Depends(get_db)
):
    """Delete (soft delete) product"""
    service = ProductService(db)
    return service.delete_product(id)
```

---

## 7. MIDDLEWARE & ERROR HANDLING

### Global Exception Handler
```python
# Trong main.py, định nghĩa exception handlers

@app.exception_handler(AppException)
async def app_exception_handler(request, exc: AppException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "status": "error",
            "message": exc.message,
            "error_code": exc.error_code,
            "data": exc.data
        }
    )
```

### Request/Response Logging
```python
# backend/app/middleware/logging.py

from fastapi import Request
from time import time
import logging

logger = logging.getLogger(__name__)

async def log_requests(request: Request, call_next):
    start_time = time()
    response = await call_next(request)
    process_time = time() - start_time
    
    logger.info(
        f"{request.method} {request.url.path} - Status: {response.status_code} - "
        f"Time: {process_time:.3f}s"
    )
    
    return response
```

---

## 8. DEPENDENCY INJECTION PATTERN

FastAPI sử dụng dependency injection để:
- Tính toán giá trị dựa trên yêu cầu HTTP
- Xác thực người dùng
- Quản lý database sessions
- Tái sử dụng code

**Ví dụ:**
```python
@app.get("/items")
async def read_items(
    skip: int = 0,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # current_user và db được tự động inject
    items = db.query(Item).filter(Item.user_id == current_user.id).offset(skip).limit(limit).all()
    return items
```

---

## 9. API RESPONSE FORMAT

Tất cả API responses tuân theo định dạng chuẩn:

```python
# Success Response
{
    "status": "success",
    "message": "Operation completed successfully",
    "data": {
        "id": 1,
        "name": "Product Name"
        # ... other fields
    }
}

# Error Response
{
    "status": "error",
    "message": "Error description",
    "error_code": "ERROR_CODE",
    "data": null
}

# List Response (with pagination)
{
    "status": "success",
    "data": [
        { "id": 1, "name": "Item 1" },
        { "id": 2, "name": "Item 2" }
    ],
    "pagination": {
        "total": 100,
        "skip": 0,
        "limit": 20,
        "pages": 5
    }
}
```

---

## 10. CORS CONFIGURATION

```python
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

**Allows:**
- Frontend từ localhost:3000 gọi API từ localhost:8000
- Cookies/Authentication headers được gửi kèm

---

## 11. RUN APPLICATION

```bash
# Install dependencies
pip install -r requirements.txt

# Copy .env.example to .env and update values
cp .env.example .env

# Run server
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Or use run.py
python run.py
```

**Output:**
```
INFO:     Uvicorn running on http://0.0.0.0:8000
INFO:     Application startup complete
✅ Database initialized
```

**Access:**
- API Docs: http://localhost:8000/docs (Swagger UI)
- OpenAPI Schema: http://localhost:8000/openapi.json
- Health Check: http://localhost:8000/health

---

## 12. TIẾP THEO

**Bước 5: Thiết kế REST API**

Sẽ bao gồm:
- Pydantic Schemas (Request/Response)
- Chi tiết mỗi API Endpoint
- Request body & response examples
- Error scenarios

---

**Ngày thiết kế: 2024-08-16**
**Phiên bản: 1.0**
**Status: ✅ HOÀN THÀNH**
