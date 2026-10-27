# BƯỚC 5: THIẾT KẾ REST API
## Hệ Thống Quản Lý Kho Có Tích Hợp AI

---

## 1. API DESIGN PRINCIPLES

### Response Format
Tất cả API responses tuân theo cấu trúc chuẩn:

```json
// Success Response
{
    "status": "success",
    "message": "Operation completed successfully",
    "data": {
        "id": 1,
        "name": "Product Name"
    }
}

// Error Response
{
    "status": "error",
    "message": "Error description",
    "error_code": "ERROR_CODE"
}

// List Response with Pagination
{
    "status": "success",
    "data": [
        {"id": 1, "name": "Item 1"},
        {"id": 2, "name": "Item 2"}
    ],
    "pagination": {
        "total": 100,
        "skip": 0,
        "limit": 20,
        "pages": 5
    }
}
```

### HTTP Status Codes
- `200 OK`: Success
- `201 CREATED`: Resource created
- `204 NO CONTENT`: Success, no content to return
- `400 BAD REQUEST`: Validation error
- `401 UNAUTHORIZED`: Missing/invalid authentication
- `403 FORBIDDEN`: Insufficient permissions
- `404 NOT FOUND`: Resource not found
- `409 CONFLICT`: Resource already exists
- `500 INTERNAL ERROR`: Server error

---

## 2. PYDANTIC SCHEMAS

### Base Response Schema
```python
# schemas/base.py
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, List, Any

T = TypeVar('T')

class PaginationInfo(BaseModel):
    total: int
    skip: int
    limit: int
    pages: int

class SuccessResponse(BaseModel, Generic[T]):
    status: str = "success"
    message: str
    data: Optional[T] = None
    pagination: Optional[PaginationInfo] = None

class ErrorResponse(BaseModel):
    status: str = "error"
    message: str
    error_code: str
    data: Optional[Any] = None
```

### User Schemas
```python
# schemas/user.py
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    role_id: int

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role_id: Optional[int] = None

class UserResponse(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### Product Schemas
```python
# schemas/product.py
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    unit_id: int
    minimum_stock: int = Field(default=0, ge=0)
    description: Optional[str] = None
    reorder_quantity: Optional[int] = None

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    minimum_stock: Optional[int] = None
    description: Optional[str] = None
    reorder_quantity: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    current_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### Import Receipt Schemas
```python
# schemas/import_receipt.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal

class ImportReceiptItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    notes: Optional[str] = None

class ImportReceiptCreate(BaseModel):
    supplier_id: int
    receipt_date: date
    items: List[ImportReceiptItemCreate]
    notes: Optional[str] = None

class ImportReceiptItemResponse(ImportReceiptItemCreate):
    id: int
    total_amount: Optional[Decimal] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class ImportReceiptResponse(BaseModel):
    id: int
    receipt_code: str
    supplier_id: int
    receipt_date: date
    status: str
    notes: Optional[str] = None
    total_amount: Decimal
    items: List[ImportReceiptItemResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### Export Receipt Schemas
```python
# schemas/export_receipt.py
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

class ExportReceiptItemCreate(BaseModel):
    product_id: int
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = None

class ExportReceiptCreate(BaseModel):
    receipt_date: date
    items: List[ExportReceiptItemCreate]
    notes: Optional[str] = None

class ExportReceiptItemResponse(ExportReceiptItemCreate):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExportReceiptResponse(BaseModel):
    id: int
    receipt_code: str
    receipt_date: date
    status: str
    notes: Optional[str] = None
    items: List[ExportReceiptItemResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```

### Inventory Schemas
```python
# schemas/inventory.py
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class InventoryTransactionResponse(BaseModel):
    id: int
    product_id: int
    transaction_type: str  # IMPORT or EXPORT
    quantity: int
    old_stock: int
    new_stock: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class InventoryLowStockResponse(BaseModel):
    product_id: int
    product_code: str
    product_name: str
    current_stock: int
    minimum_stock: int
    below_minimum_by: int  # minimum - current
```

---

## 3. API ENDPOINTS DETAILED

### Authentication Endpoints

#### POST /api/auth/login
**Đăng nhập**

Request:
```json
{
    "username": "admin",
    "password": "password123"
}
```

Response (200):
```json
{
    "status": "success",
    "message": "Login successful",
    "data": {
        "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
        "token_type": "bearer",
        "user": {
            "id": 1,
            "username": "admin",
            "email": "admin@example.com",
            "full_name": "Admin User",
            "role_id": 1,
            "is_active": true
        }
    }
}
```

Error (401):
```json
{
    "status": "error",
    "message": "Invalid username or password",
    "error_code": "INVALID_CREDENTIALS"
}
```

---

#### GET /api/auth/me
**Lấy thông tin người dùng hiện tại**

Headers: `Authorization: Bearer {token}`

Response (200):
```json
{
    "status": "success",
    "data": {
        "id": 1,
        "username": "admin",
        "email": "admin@example.com",
        "full_name": "Admin User",
        "role_id": 1,
        "is_active": true,
        "role": {
            "id": 1,
            "name": "ADMIN"
        }
    }
}
```

---

### Product Endpoints

#### GET /api/products
**Danh sách hàng hóa**

Query Parameters:
- `skip` (int, default=0): Số bản ghi bỏ qua
- `limit` (int, default=20): Số bản ghi trả về
- `category_id` (int, optional): Lọc theo nhóm
- `is_active` (bool, default=true): Chỉ hàng kích hoạt

Response:
```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "code": "HH001",
            "name": "Bàn phím cơ",
            "category_id": 1,
            "unit_id": 1,
            "current_stock": 5,
            "minimum_stock": 10,
            "is_active": true
        }
    ],
    "pagination": {
        "total": 50,
        "skip": 0,
        "limit": 20,
        "pages": 3
    }
}
```

---

#### POST /api/products
**Tạo hàng hóa**

Headers: `Authorization: Bearer {token}`
Roles: ADMIN, STOREKEEPER

Request:
```json
{
    "code": "HH001",
    "name": "Bàn phím cơ",
    "category_id": 1,
    "unit_id": 1,
    "minimum_stock": 10,
    "description": "Mechanical keyboard for office use",
    "reorder_quantity": 50
}
```

Response (201):
```json
{
    "status": "success",
    "message": "Product created successfully",
    "data": {
        "id": 1,
        "code": "HH001",
        "name": "Bàn phím cơ",
        "category_id": 1,
        "unit_id": 1,
        "minimum_stock": 10,
        "current_stock": 0,
        "is_active": true,
        "created_at": "2024-08-16T10:30:00"
    }
}
```

Error (409):
```json
{
    "status": "error",
    "message": "Product with code HH001 already exists (field: code)",
    "error_code": "DUPLICATE_RESOURCE"
}
```

---

#### GET /api/products/{id}
**Chi tiết hàng hóa**

Response (200):
```json
{
    "status": "success",
    "data": {
        "id": 1,
        "code": "HH001",
        "name": "Bàn phím cơ",
        "category_id": 1,
        "unit_id": 1,
        "minimum_stock": 10,
        "current_stock": 5,
        "is_active": true,
        "created_at": "2024-08-16T10:30:00",
        "updated_at": "2024-08-16T11:00:00"
    }
}
```

Error (404):
```json
{
    "status": "error",
    "message": "Product not found (ID: 999)",
    "error_code": "NOT_FOUND"
}
```

---

#### PUT /api/products/{id}
**Sửa hàng hóa**

Headers: `Authorization: Bearer {token}`
Roles: ADMIN, STOREKEEPER

Request:
```json
{
    "name": "Bàn phím cơ cao cấp",
    "minimum_stock": 15
}
```

Response (200):
```json
{
    "status": "success",
    "message": "Product updated successfully",
    "data": {
        "id": 1,
        "code": "HH001",
        "name": "Bàn phím cơ cao cấp",
        "minimum_stock": 15,
        "current_stock": 5,
        "updated_at": "2024-08-16T12:00:00"
    }
}
```

---

#### DELETE /api/products/{id}
**Xóa hàng hóa (soft delete)**

Headers: `Authorization: Bearer {token}`
Roles: ADMIN

Response (200):
```json
{
    "status": "success",
    "message": "Product deleted successfully"
}
```

---

### Import Receipt Endpoints

#### GET /api/imports
**Danh sách phiếu nhập**

Query Parameters:
- `skip`, `limit`: Pagination
- `status` (optional): DRAFT, CONFIRMED, CANCELLED
- `supplier_id` (optional): Lọc theo NCC
- `from_date`, `to_date` (optional): Lọc theo ngày

Response:
```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "receipt_code": "IMP-20260816-001",
            "supplier_id": 1,
            "receipt_date": "2024-08-16",
            "status": "CONFIRMED",
            "total_amount": 5000000,
            "items": [
                {
                    "id": 1,
                    "product_id": 1,
                    "quantity": 50,
                    "unit_price": 100000,
                    "total_amount": 5000000
                }
            ]
        }
    ],
    "pagination": {...}
}
```

---

#### POST /api/imports
**Tạo phiếu nhập**

Headers: `Authorization: Bearer {token}`
Roles: STOREKEEPER

Request:
```json
{
    "supplier_id": 1,
    "receipt_date": "2024-08-16",
    "notes": "Order from supplier A",
    "items": [
        {
            "product_id": 1,
            "quantity": 50,
            "unit_price": 100000,
            "notes": "Good quality"
        },
        {
            "product_id": 2,
            "quantity": 30,
            "unit_price": 150000
        }
    ]
}
```

Response (201):
```json
{
    "status": "success",
    "message": "Import receipt created successfully",
    "data": {
        "id": 1,
        "receipt_code": "IMP-20260816-001",
        "supplier_id": 1,
        "receipt_date": "2024-08-16",
        "status": "DRAFT",
        "total_amount": 9500000,
        "items": [...]
    }
}
```

---

#### PUT /api/imports/{id}/confirm
**Xác nhận phiếu nhập (cập nhật tồn kho)**

Headers: `Authorization: Bearer {token}`
Roles: STOREKEEPER

Response (200):
```json
{
    "status": "success",
    "message": "Import receipt confirmed successfully",
    "data": {
        "id": 1,
        "receipt_code": "IMP-20260816-001",
        "status": "CONFIRMED",
        "confirmed_at": "2024-08-16T14:30:00",
        "items": [...]
    }
}
```

Error (400):
```json
{
    "status": "error",
    "message": "Cannot confirm receipt IMP-20260816-001 with status CONFIRMED",
    "error_code": "INVALID_RECEIPT_STATUS"
}
```

---

### Export Receipt Endpoints

#### POST /api/exports
**Tạo phiếu xuất**

Headers: `Authorization: Bearer {token}`
Roles: STOREKEEPER

Request:
```json
{
    "receipt_date": "2024-08-16",
    "notes": "Export for customer",
    "items": [
        {
            "product_id": 1,
            "quantity": 20,
            "notes": "Customer order"
        }
    ]
}
```

Response (201):
```json
{
    "status": "success",
    "message": "Export receipt created successfully",
    "data": {
        "id": 1,
        "receipt_code": "EXP-20260816-001",
        "receipt_date": "2024-08-16",
        "status": "DRAFT",
        "items": [...]
    }
}
```

---

#### PUT /api/exports/{id}/confirm
**Xác nhận phiếu xuất (kiểm tra tồn kho)**

Headers: `Authorization: Bearer {token}`
Roles: STOREKEEPER

Response (200) - if stock is sufficient:
```json
{
    "status": "success",
    "message": "Export receipt confirmed successfully",
    "data": {
        "id": 1,
        "receipt_code": "EXP-20260816-001",
        "status": "CONFIRMED",
        "confirmed_at": "2024-08-16T15:00:00"
    }
}
```

Error (400) - if stock insufficient:
```json
{
    "status": "error",
    "message": "Insufficient stock for HH001: current=5, required=20",
    "error_code": "INSUFFICIENT_STOCK",
    "data": {
        "product_code": "HH001",
        "current_stock": 5,
        "required": 20
    }
}
```

---

### Inventory Endpoints

#### GET /api/inventory
**Danh sách tồn kho**

Response:
```json
{
    "status": "success",
    "data": [
        {
            "product_id": 1,
            "product_code": "HH001",
            "product_name": "Bàn phím cơ",
            "current_stock": 5,
            "minimum_stock": 10,
            "unit": "cái",
            "below_minimum": true
        }
    ]
}
```

---

#### GET /api/inventory/{product_id}
**Chi tiết tồn 1 sản phẩm**

Response:
```json
{
    "status": "success",
    "data": {
        "product_id": 1,
        "product_code": "HH001",
        "product_name": "Bàn phím cơ",
        "current_stock": 5,
        "minimum_stock": 10,
        "last_import": "2024-08-15T10:00:00",
        "last_export": "2024-08-16T14:00:00",
        "days_in_stock": 45,
        "export_7days": 12,
        "export_30days": 45
    }
}
```

---

#### GET /api/inventory/transactions
**Lịch sử giao dịch**

Query Parameters:
- `product_id` (optional): Lọc theo sản phẩm
- `type` (optional): IMPORT, EXPORT
- `from_date`, `to_date` (optional): Khoảng thời gian

Response:
```json
{
    "status": "success",
    "data": [
        {
            "id": 1,
            "product_id": 1,
            "product_code": "HH001",
            "transaction_type": "IMPORT",
            "quantity": 50,
            "old_stock": 0,
            "new_stock": 50,
            "reference_type": "IMPORT_RECEIPT",
            "reference_id": 1,
            "created_at": "2024-08-15T10:00:00"
        },
        {
            "id": 2,
            "product_id": 1,
            "product_code": "HH001",
            "transaction_type": "EXPORT",
            "quantity": 20,
            "old_stock": 50,
            "new_stock": 30,
            "reference_type": "EXPORT_RECEIPT",
            "reference_id": 1,
            "created_at": "2024-08-16T14:00:00"
        }
    ],
    "pagination": {...}
}
```

---

### Reports Endpoints

#### GET /api/reports/inventory
**Báo cáo nhập-xuất-tồn**

Query Parameters:
- `from_date` (optional): Ngày bắt đầu
- `to_date` (optional): Ngày kết thúc

Response:
```json
{
    "status": "success",
    "data": {
        "period": {
            "from_date": "2024-08-01",
            "to_date": "2024-08-16"
        },
        "summary": {
            "total_products": 50,
            "total_opening_stock": 1000,
            "total_imports": 500,
            "total_exports": 300,
            "total_closing_stock": 1200
        },
        "low_stock_items": [
            {
                "product_code": "HH001",
                "product_name": "Bàn phím cơ",
                "current_stock": 5,
                "minimum_stock": 10
            }
        ],
        "top_export_items": [
            {
                "product_code": "HH003",
                "product_name": "Tai nghe",
                "export_quantity": 120
            }
        ]
    }
}
```

---

### AI Endpoints

#### POST /api/ai/inventory-report
**Sinh báo cáo kho bằng AI**

Headers: `Authorization: Bearer {token}`
Roles: ADMIN, ACCOUNTANT

Request:
```json
{
    "from_date": "2024-08-01",
    "to_date": "2024-08-16",
    "include_summary": true,
    "include_recommendations": true
}
```

Response (200):
```json
{
    "status": "success",
    "data": {
        "summary": "Trong kỳ từ 01/08 đến 16/08, kho hàng có tổng nhập 500 cái với tổng xuất 300 cái. Tồn cuối kỳ là 1200 cái. Có 3 sản phẩm dưới tồn tối thiểu...",
        "low_stock_items": [
            {
                "product_code": "HH001",
                "product_name": "Bàn phím cơ",
                "current_stock": 5,
                "minimum_stock": 10,
                "recommendation": "Cần nhập khẩn ngay 50 cái"
            }
        ],
        "top_export_items": [
            {
                "product_code": "HH003",
                "product_name": "Tai nghe",
                "export_quantity": 120
            }
        ],
        "anomalies": [],
        "recommendations": [
            "Nhập khẩn sản phẩm HH001 do dưới tồn tối thiểu",
            "Chú ý đến HH003 do xuất nhiều đột ngột"
        ]
    }
}
```

---

#### POST /api/ai/purchase-recommendation
**Gợi ý nhập hàng bằng AI**

Headers: `Authorization: Bearer {token}`
Roles: ADMIN, STOREKEEPER

Response (200):
```json
{
    "status": "success",
    "data": {
        "recommendations": [
            {
                "product_code": "HH001",
                "product_name": "Bàn phím cơ",
                "current_stock": 5,
                "priority": "HIGH",
                "suggested_quantity": 100,
                "reason": "Tồn kho hiện tại thấp hơn tồn tối thiểu 5 cái. Xuất trung bình 12 cái/tuần."
            },
            {
                "product_code": "HH003",
                "product_name": "Tai nghe",
                "current_stock": 8,
                "priority": "MEDIUM",
                "suggested_quantity": 80,
                "reason": "Tồn kho chuẩn nhưng tần suất xuất cao (40 cái/tháng)"
            }
        ],
        "generated_at": "2024-08-16T16:00:00"
    }
}
```

Error (400) - if insufficient data:
```json
{
    "status": "error",
    "message": "Insufficient data to provide recommendations. Need at least 7 days of transaction history.",
    "error_code": "INSUFFICIENT_DATA"
}
```

---

#### POST /api/ai/anomaly-summary
**Phát hiện bất thường bằng AI**

Headers: `Authorization: Bearer {token}`
Roles: ADMIN, ACCOUNTANT

Response (200):
```json
{
    "status": "success",
    "data": {
        "anomalies": [
            {
                "product_code": "HH003",
                "product_name": "Tai nghe",
                "type": "HIGH_EXPORT",
                "severity": "HIGH",
                "description": "Xuất tăng đột biến: 40 cái/tháng → 120 cái/tuần",
                "recommendation": "Xác nhận đơn hàng khách, kiểm tra tồn kho"
            },
            {
                "product_code": "HH001",
                "product_name": "Bàn phím cơ",
                "type": "LOW_STOCK",
                "severity": "MEDIUM",
                "description": "Tồn kho dưới tồn tối thiểu: 5 < 10",
                "recommendation": "Nhập khẩn ngay"
            }
        ],
        "analysis_date": "2024-08-16T16:00:00",
        "period_analyzed": "30 days"
    }
}
```

---

## 4. AUTHENTICATION FLOW

### Login Process

```
1. POST /api/auth/login
   ├─ Validate credentials
   ├─ Check username exists
   ├─ Verify password hash
   ├─ Create JWT token (30 min expiry)
   └─ Return token + user info

2. Client stores token in localStorage

3. Subsequent requests
   ├─ Client sends: Authorization: Bearer {token}
   ├─ Backend validates token
   ├─ Get user from token
   └─ Check user permissions (role-based)
```

### Token Structure
```python
# Payload
{
    "sub": "1",  # user_id
    "exp": 1692187200,  # expiration timestamp
    "iat": 1692183600   # issued at timestamp
}

# Encoded
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxIiwi...
```

---

## 5. ERROR HANDLING

### Error Code Reference

| Error Code | HTTP Status | Meaning |
|-----------|------------|---------|
| INVALID_CREDENTIALS | 401 | Username/password incorrect |
| TOKEN_EXPIRED | 401 | JWT token has expired |
| INVALID_TOKEN | 401 | JWT token is invalid |
| UNAUTHORIZED | 401 | Missing authentication |
| FORBIDDEN | 403 | Insufficient permissions |
| NOT_FOUND | 404 | Resource not found |
| DUPLICATE_RESOURCE | 409 | Resource already exists |
| INSUFFICIENT_STOCK | 400 | Not enough stock to export |
| INVALID_QUANTITY | 400 | Quantity must be > 0 |
| INVALID_RECEIPT_STATUS | 400 | Cannot perform action on receipt status |
| TRANSACTION_FAILED | 400 | Database transaction failed |
| VALIDATION_ERROR | 400 | Input validation failed |
| OPENAI_ERROR | 500 | OpenAI API error |
| INTERNAL_ERROR | 500 | Unexpected server error |

---

## 6. PAGINATION

### Query Parameters
- `skip`: Number of records to skip (default: 0)
- `limit`: Number of records to return (default: 20, max: 100)

### Pagination Response
```json
{
    "pagination": {
        "total": 150,
        "skip": 20,
        "limit": 20,
        "pages": 8
    }
}
```

### Example
```
GET /api/products?skip=20&limit=20
├─ Returns records 20-39 out of 150 total
└─ Page 2 of 8
```

---

## 7. VALIDATION RULES

### Product Code
- Must be unique
- Length: 1-50 characters
- Pattern: Alphanumeric + hyphen (e.g., HH-001, HH001)

### Username
- Must be unique
- Length: 3-50 characters
- Alphanumeric + underscore

### Password
- Minimum 8 characters
- Must contain: uppercase, lowercase, number
- Stored as bcrypt hash (never plaintext)

### Quantities
- Must be > 0
- Cannot be negative
- Integer only

### Dates
- Format: ISO 8601 (YYYY-MM-DD)
- Cannot be in future

---

## 8. RATE LIMITING (FUTURE)

For production, implement:
- 100 requests per minute per IP
- 1000 requests per hour per user
- AI endpoints: 10 per minute per user

---

## 9. TESTING API

### Using cURL

```bash
# Login
curl -X POST "http://localhost:8000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"password123"}'

# Get token from response
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# List products
curl -X GET "http://localhost:8000/api/products" \
  -H "Authorization: Bearer $TOKEN"

# Create product
curl -X POST "http://localhost:8000/api/products" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "code": "HH001",
    "name": "Keyboard",
    "category_id": 1,
    "unit_id": 1,
    "minimum_stock": 10
  }'
```

### Using FastAPI Docs

```
GET http://localhost:8000/docs
```

Giao diện Swagger UI tương tác để test tất cả endpoints.

---

## 10. TIẾP THEO

**Bước 6: Xây dựng Authentication + JWT**

Sẽ tạo:
- Authentication router (POST /api/auth/login)
- User service
- Test authentication

---

**Ngày thiết kế: 2024-08-16**
**Phiên bản: 1.0**
**Status: ✅ HOÀN THÀNH**
