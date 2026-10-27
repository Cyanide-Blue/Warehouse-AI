# PHÂN TÍCH NGHIỆP VỤ VÀ USE CASE
## Hệ Thống Quản Lý Kho Có Tích Hợp AI

---

## 1. MỤC TIÊU HỆ THỐNG

Xây dựng hệ thống quản lý kho toàn diện cho doanh nghiệp nhỏ và vừa với các tính năng:
- Quản lý tồn kho chính xác
- Tự động cảnh báo kho dưới mức tối thiểu
- Hỗ trợ AI phân tích xu hướng và gợi ý
- Đảm bảo truy vết lịch sử đầy đủ

---

## 2. PHÂN TÍCH TỪ CÁC GÓC ĐỘ

### 2.1 Các Thực Thể (Entities)
- **Người dùng (Users)**: Có 3 vai trò (Admin, Storekeeper, Accountant)
- **Vai trò (Roles)**: ADMIN, STOREKEEPER, ACCOUNTANT
- **Hàng hóa (Products)**: Với code, name, category, unit, tồn kho
- **Nhóm hàng (Categories)**: Phân loại sản phẩm
- **Đơn vị tính (Units)**: Cái, bộ, hộp, v.v.
- **Nhà cung cấp (Suppliers)**: Thông tin nhà cung cấp
- **Phiếu nhập (Import Receipts)**: Ghi nhận hàng nhập về
- **Chi tiết phiếu nhập (Import Receipt Items)**: Từng sản phẩm trong phiếu
- **Phiếu xuất (Export Receipts)**: Ghi nhận hàng xuất kho
- **Chi tiết phiếu xuất (Export Receipt Items)**: Từng sản phẩm xuất
- **Lịch sử giao dịch (Inventory Transactions)**: Truy vết mọi thay đổi tồn kho

### 2.2 Quy Tắc Kinh Doanh (Business Rules)

#### Tồn kho
- Tồn kho ban đầu = 0
- Tồn kho không bao giờ được âm
- Mỗi lần thay đổi tồn phải có ghi nhận lịch sử
- Công thức: `Tồn_Cuối = Tồn_Đầu + Tổng_Nhập - Tổng_Xuất`

#### Nhập kho
- Bắt buộc có nhà cung cấp
- Phiếu nhập có trạng thái (Nháp, Xác nhận)
- Khi xác nhận phiếu: cập nhật tồn kho trong 1 transaction
- Nếu lỗi → rollback toàn bộ

#### Xuất kho
- Kiểm tra tồn trước khi xuất
- Nếu `quantity > current_stock` → từ chối
- Khi xuất thành công → cập nhật tồn kho
- Không phép để tồn âm

#### Cảnh báo
- Tự động nhận diện hàng dưới tồn tối thiểu
- Hiển thị danh sách hàng cần nhập khẩn

### 2.3 Vai Trò và Quyền Hạn

#### ADMIN
- Quản lý người dùng: tạo, sửa, xóa, phân quyền
- Quản lý hàng hóa: CRUD
- Quản lý nhà cung cấp: CRUD
- Xem báo cáo: nhập-xuất-tồn
- Sử dụng AI: sinh báo cáo, gợi ý, phân tích bất thường

#### STOREKEEPER
- Quản lý hàng hóa: xem, thêm, sửa (không xóa)
- Lập phiếu nhập: tạo, xác nhận
- Lập phiếu xuất: tạo, xác nhận
- Xem tồn kho: danh sách, thẻ kho, cảnh báo
- Xem lịch sử: nhập, xuất, giao dịch

#### ACCOUNTANT
- Xem hàng hóa: chỉ xem
- Xem tồn kho: chỉ xem
- Xem lịch sử: chỉ xem
- Xem báo cáo: nhập-xuất-tồn
- Sử dụng AI: sinh báo cáo, phân tích bất thường

---

## 3. USE CASE (TÓM TẮT)

### 3.1 Quản Lý Người Dùng (Admin)
```
UC-001: Quản lý người dùng
- Tạo người dùng: email, username, password (hash), role
- Sửa người dùng: cập nhật thông tin
- Xóa người dùng: vô hiệu hóa tài khoản
- Gán quyền: thay đổi role
```

### 3.2 Quản Lý Hàng Hóa
```
UC-002: CRUD Hàng hóa
- Tạo hàng: code (unique), name, category, unit, minimum_stock
- Sửa hàng: cập nhật thông tin (trừ code)
- Xóa hàng: vô hiệu hóa (is_active = false)
- Xem hàng: danh sách, lọc, tìm kiếm
- Cảnh báo: hiển thị hàng dưới tồn tối thiểu

UC-003: Quản lý Nhóm hàng
- CRUD Categories

UC-004: Quản lý Đơn vị tính
- CRUD Units

UC-005: Quản lý Nhà cung cấp
- CRUD Suppliers: tên, địa chỉ, điện thoại, email
```

### 3.3 Nhập Kho
```
UC-006: Nhập kho
1. Storekeeper tạo phiếu nhập
   - Chọn nhà cung cấp
   - Chọn sản phẩm → nhập số lượng, giá
   - Tạo phiếu (trạng thái: Nháp)

2. Storekeeper xác nhận phiếu
   - Kiểm tra thông tin
   - Ghi nhận: phiếu → xác nhận
   - Cập nhật tồn kho trong 1 transaction:
     * product.current_stock += quantity
     * Tạo inventory_transaction (type: IMPORT)
   - Nếu lỗi → rollback

3. Kết quả
   - Phiếu chuyển sang "Đã xác nhận"
   - Tồn kho cập nhật
   - Tạo lịch sử giao dịch
```

### 3.4 Xuất Kho
```
UC-007: Xuất kho
1. Storekeeper tạo phiếu xuất
   - Chọn sản phẩm → nhập số lượng
   - Tạo phiếu (trạng thái: Nháp)

2. Storekeeper xác nhận phiếu
   - Kiểm tra tồn: if quantity > current_stock → LỖI
   - Nếu hợp lệ:
     * product.current_stock -= quantity
     * Tạo inventory_transaction (type: EXPORT)
   - Nếu lỗi → từ chối, không cập nhật

3. Kết quả
   - Phiếu chuyển sang "Đã xác nhận"
   - Tồn kho giảm
   - Tạo lịch sử giao dịch
```

### 3.5 Báo Cáo Nhập-Xuất-Tồn
```
UC-008: Sinh báo cáo kho bằng AI
1. Backend tổng hợp dữ liệu:
   - Tồn đầu kỳ (tính từ đầu tháng hoặc ngày bắt đầu)
   - Tổng nhập: sum(import_items) trong kỳ
   - Tổng xuất: sum(export_items) trong kỳ
   - Tồn cuối kỳ: hiện tại
   - Hàng dưới tồn tối thiểu
   - Hàng xuất nhiều (top 10)
   - Hàng tồn lâu (ít xuất nhất)

2. Gửi OpenAI:
   - System prompt: Chỉ phân tích dữ liệu, không tạo số liệu
   - Dữ liệu: JSON với tất cả thông tin trên
   - Yêu cầu: Phân tích và đưa ra báo cáo cấu trúc

3. Validate JSON response từ AI

4. Trả về frontend
```

### 3.6 Gợi Ý Nhập Hàng (AI)
```
UC-009: AI gợi ý nhập
1. Backend tổng hợp:
   - Hàng dưới tồn tối thiểu
   - Dữ liệu 7 ngày: xuất quantity
   - Dữ liệu 30 ngày: xuất quantity
   - Xu hướng: tăng/giảm
   - Số ngày tồn (days_in_stock)

2. Gửi OpenAI:
   - Yêu cầu: sản phẩm cần nhập, mức độ ưu tiên, số lượng, lý do
   - Nếu dữ liệu không đủ → báo "Không đủ dữ liệu"

3. Parse response, validate JSON

4. Trả về frontend
```

### 3.7 Phát Hiện Bất Thường (AI)
```
UC-010: AI phân tích bất thường
1. Backend phân tích:
   - Xuất tăng đột biến (so với trung bình 7-30 ngày)
   - Hàng giảm tồn nhanh (high export rate)
   - Hàng tồn lâu (0 xuất trong 30 ngày)
   - Hàng dưới tồn tối thiểu
   - Biến động lớn so với lịch sử

2. Gửi OpenAI:
   - Dữ liệu chi tiết về bất thường
   - Yêu cầu: phân loại (HIGH, MEDIUM, LOW), mô tả, lý do

3. Validate response

4. Trả về frontend
```

---

## 4. QUY TRÌNH XỬ LÝ NHẬP KHOẢNG CHI TIẾT

### Scenario: Tạo và xác nhận phiếu nhập

**Input:**
```json
{
  "supplier_id": 1,
  "items": [
    {"product_id": 1, "quantity": 50, "price": 100000},
    {"product_id": 2, "quantity": 30, "price": 150000}
  ]
}
```

**Flow:**
```
1. Validate input
   - supplier_id tồn tại?
   - product_id tồn tại?
   - quantity > 0?

2. Tạo ImportReceipt (trạng thái: DRAFT)
   - receipt_code: tự động sinh (VD: IMP-20260816-001)
   - receipt_date: bây giờ
   - created_by: user_id
   - supplier_id: input
   - status: DRAFT

3. Tạo ImportReceiptItem cho mỗi sản phẩm
   - product_id, quantity, price
   - total = quantity * price

4. Trả về receipt_id cho frontend

5. (Sau đó) Xác nhận phiếu:
   - BEGIN TRANSACTION
   - FOR EACH item:
       * product = select product by id for update (lock)
       * new_stock = product.current_stock + quantity
       * update product set current_stock = new_stock
       * create inventory_transaction:
           - product_id, type=IMPORT, quantity, old_stock, new_stock, receipt_id
   - update receipt status = CONFIRMED
   - COMMIT

6. Nếu lỗi → ROLLBACK (tồn kho không thay đổi)
```

---

## 5. QUY TRÌNH XỬ LÝ XUẤT KHOẢNG CHI TIẾT

### Scenario: Tạo và xác nhận phiếu xuất

**Input:**
```json
{
  "items": [
    {"product_id": 1, "quantity": 20},
    {"product_id": 2, "quantity": 15}
  ]
}
```

**Flow:**
```
1. Validate input
   - product_id tồn tại?
   - quantity > 0?

2. Tạo ExportReceipt (trạng thái: DRAFT)
   - receipt_code: tự động sinh (VD: EXP-20260816-001)
   - receipt_date: bây giờ
   - created_by: user_id
   - status: DRAFT

3. Tạo ExportReceiptItem cho mỗi sản phẩm
   - product_id, quantity

4. Trả về receipt_id cho frontend

5. (Sau đó) Xác nhận phiếu:
   - BEGIN TRANSACTION
   - FOR EACH item:
       * product = select product by id for update (lock)
       * IF product.current_stock < quantity:
           - ROLLBACK
           - raise exception("Tồn kho không đủ")
       * new_stock = product.current_stock - quantity
       * update product set current_stock = new_stock
       * create inventory_transaction:
           - product_id, type=EXPORT, quantity, old_stock, new_stock, receipt_id
   - update receipt status = CONFIRMED
   - COMMIT

6. Nếu lỗi → ROLLBACK
```

---

## 6. KIẾN TRÚC TỔNG QUAN

### Layer Architecture
```
┌─────────────────────────┐
│   Frontend (React)      │  → Login, Dashboard, Quản lý, Báo cáo, AI
└────────────┬────────────┘
             │ REST API (JSON)
┌────────────▼────────────┐
│   API Layer (FastAPI)   │  → Router, Request/Response Schema
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│  Service Layer          │  → Business Logic, Transaction, Validation
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│ Repository Layer        │  → Database Access (SQLAlchemy ORM)
└────────────┬────────────┘
             │
┌────────────▼────────────┐
│   Database (SQLite)     │  → Tables, Indexes, Relationships
└─────────────────────────┘
             │
┌────────────▼────────────┐
│   OpenAI API            │  → AI Analysis
└─────────────────────────┘
```

### Module Organization
```
backend/
├── app/
│   ├── main.py                    # Khởi động FastAPI
│   ├── database.py                # Kết nối SQLite
│   ├── config.py                  # Cấu hình ứng dụng
│   │
│   ├── models/                    # SQLAlchemy Models
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── product.py
│   │   ├── supplier.py
│   │   ├── import_receipt.py
│   │   ├── export_receipt.py
│   │   ├── inventory_transaction.py
│   │   └── ...
│   │
│   ├── schemas/                   # Pydantic Schemas (Request/Response)
│   │   ├── __init__.py
│   │   ├── user.py
│   │   ├── product.py
│   │   └── ...
│   │
│   ├── routers/                   # API Routes
│   │   ├── __init__.py
│   │   ├── auth.py                # /api/auth/*
│   │   ├── products.py            # /api/products/*
│   │   ├── imports.py             # /api/imports/*
│   │   ├── exports.py             # /api/exports/*
│   │   ├── inventory.py           # /api/inventory/*
│   │   ├── reports.py             # /api/reports/*
│   │   └── ai.py                  # /api/ai/*
│   │
│   ├── services/                  # Business Logic
│   │   ├── __init__.py
│   │   ├── user_service.py
│   │   ├── product_service.py
│   │   ├── import_service.py
│   │   ├── export_service.py
│   │   ├── inventory_service.py
│   │   ├── report_service.py
│   │   └── ai_service.py
│   │
│   ├── repositories/              # Database Access
│   │   ├── __init__.py
│   │   ├── base_repository.py
│   │   ├── user_repository.py
│   │   └── ...
│   │
│   ├── auth/                      # Authentication & Authorization
│   │   ├── __init__.py
│   │   ├── jwt_handler.py         # JWT Token
│   │   ├── security.py            # Password Hash
│   │   └── dependencies.py        # Dependency Injection
│   │
│   ├── ai/                        # AI Integration
│   │   ├── __init__.py
│   │   ├── openai_client.py       # OpenAI API Client
│   │   ├── prompts.py             # System Prompts
│   │   └── validators.py          # JSON Response Validation
│   │
│   └── exceptions.py              # Custom Exceptions
│
├── tests/                         # Unit & Integration Tests
│   ├── __init__.py
│   ├── conftest.py                # Pytest Fixtures
│   ├── test_auth.py
│   ├── test_imports.py
│   ├── test_exports.py
│   ├── test_inventory.py
│   └── ...
│
├── requirements.txt
├── .env.example
└── run.py                         # Entry point
```

---

## 7. FLOW DIAGRAM CHÍNH

### Authentication Flow
```
User Input (username, password)
          ↓
    Validate Input
          ↓
    Find User in DB
          ↓
    Check Password Hash
          ↓
    Generate JWT Token
          ↓
    Return Token + User Info
```

### Import Receipt Flow
```
1. CREATE (Storekeeper)
   Create Draft Receipt → Return receipt_id

2. CONFIRM (Storekeeper)
   ┌─ Begin Transaction
   ├─ Lock Products (FOR UPDATE)
   ├─ Validate (quantity > 0)
   ├─ Update Stock (current_stock += qty)
   ├─ Create Transaction History
   ├─ Update Receipt Status
   └─ Commit
   
   If Error → Rollback
   
   Return: Confirmed Receipt
```

### Export Receipt Flow
```
1. CREATE (Storekeeper)
   Create Draft Receipt → Return receipt_id

2. CONFIRM (Storekeeper)
   ┌─ Begin Transaction
   ├─ Lock Products (FOR UPDATE)
   ├─ Validate:
   │  ├─ quantity > 0?
   │  └─ quantity <= current_stock? ← KEY CHECK
   ├─ Update Stock (current_stock -= qty)
   ├─ Create Transaction History
   ├─ Update Receipt Status
   └─ Commit
   
   If Error (stock < qty) → Rollback & Return Error
   
   Return: Confirmed Receipt or Error
```

### AI Analysis Flow
```
1. Request từ Frontend
   GET /api/ai/inventory-report?start_date=...&end_date=...

2. Backend Aggregation
   ├─ Query inventory_transactions
   ├─ Calculate: opening_stock, total_import, total_export
   ├─ Identify: low_stock_items, high_export_items, long_stored_items
   └─ Prepare JSON payload

3. Prepare AI Prompt
   ├─ System Prompt: "Phân tích dữ liệu kho..."
   ├─ User Prompt: Data JSON
   └─ Constraints: "Không tạo số liệu, không đề cập đến giá bán nếu không cần..."

4. Call OpenAI API
   POST https://api.openai.com/v1/chat/completions
   ├─ model: "gpt-4" hoặc "gpt-3.5-turbo"
   ├─ messages: [system_prompt, user_prompt]
   └─ max_tokens: 2000

5. Validate Response
   ├─ Is valid JSON?
   ├─ Has required fields?
   └─ Return or error

6. Return to Frontend
   ├─ Status: 200
   └─ Body: { summary, low_stock_items, top_export_items, anomalies, recommendations }
```

---

## 8. DANH SÁCH API ENDPOINTS

| HTTP | Endpoint | Role | Mô tả |
|------|----------|------|-------|
| POST | /api/auth/login | * | Đăng nhập |
| GET | /api/auth/me | * | Lấy thông tin người dùng hiện tại |
| | | | |
| GET | /api/products | ADMIN, STOREKEEPER, ACCOUNTANT | Danh sách hàng |
| POST | /api/products | ADMIN, STOREKEEPER | Tạo hàng |
| GET | /api/products/{id} | ADMIN, STOREKEEPER, ACCOUNTANT | Chi tiết hàng |
| PUT | /api/products/{id} | ADMIN, STOREKEEPER | Sửa hàng |
| DELETE | /api/products/{id} | ADMIN | Xóa hàng |
| | | | |
| GET | /api/categories | * | Danh sách nhóm |
| POST | /api/categories | ADMIN | Tạo nhóm |
| PUT | /api/categories/{id} | ADMIN | Sửa nhóm |
| DELETE | /api/categories/{id} | ADMIN | Xóa nhóm |
| | | | |
| GET | /api/units | * | Danh sách đơn vị |
| POST | /api/units | ADMIN | Tạo đơn vị |
| | | | |
| GET | /api/suppliers | * | Danh sách NCC |
| POST | /api/suppliers | ADMIN | Tạo NCC |
| GET | /api/suppliers/{id} | * | Chi tiết NCC |
| PUT | /api/suppliers/{id} | ADMIN | Sửa NCC |
| DELETE | /api/suppliers/{id} | ADMIN | Xóa NCC |
| | | | |
| GET | /api/imports | ADMIN, STOREKEEPER | Danh sách phiếu nhập |
| POST | /api/imports | STOREKEEPER | Tạo phiếu nhập |
| GET | /api/imports/{id} | ADMIN, STOREKEEPER | Chi tiết phiếu nhập |
| PUT | /api/imports/{id}/confirm | STOREKEEPER | Xác nhận phiếu nhập |
| | | | |
| GET | /api/exports | ADMIN, STOREKEEPER | Danh sách phiếu xuất |
| POST | /api/exports | STOREKEEPER | Tạo phiếu xuất |
| GET | /api/exports/{id} | ADMIN, STOREKEEPER | Chi tiết phiếu xuất |
| PUT | /api/exports/{id}/confirm | STOREKEEPER | Xác nhận phiếu xuất |
| | | | |
| GET | /api/inventory | * | Danh sách tồn kho |
| GET | /api/inventory/{product_id} | * | Chi tiết tồn 1 hàng |
| GET | /api/inventory/transactions | * | Lịch sử giao dịch |
| | | | |
| GET | /api/reports/inventory | ADMIN, ACCOUNTANT | Báo cáo nhập-xuất-tồn |
| GET | /api/reports/inventory/export | ADMIN, ACCOUNTANT | Xuất báo cáo (PDF/Excel) |
| | | | |
| POST | /api/ai/inventory-report | ADMIN, ACCOUNTANT | Sinh báo cáo bằng AI |
| POST | /api/ai/purchase-recommendation | ADMIN, STOREKEEPER | Gợi ý nhập |
| POST | /api/ai/anomaly-summary | ADMIN, ACCOUNTANT | Phân tích bất thường |

---

## 9. KIỂM THỬ USE CASE

### Test UC-006: Nhập kho

**Test Case 1: Nhập hợp lệ**
```
Input: supplier_id=1, items=[{product_id=1, quantity=50}]
Expected: 
  - Receipt created with status DRAFT
  - Stock NOT changed
  - After confirm: stock increased by 50
```

**Test Case 2: Nhập số lượng 0**
```
Input: quantity=0
Expected: Error 400 (validation error)
```

**Test Case 3: Product không tồn tại**
```
Input: product_id=999
Expected: Error 404 (product not found)
```

**Test Case 4: Rollback transaction**
```
Scenario: Nhập 2 sản phẩm, sản phẩm 2 tạo lỗi khi update
Expected: Cả 2 sản phẩm stock không đổi, receipt không được confirm
```

### Test UC-007: Xuất kho

**Test Case 1: Xuất hợp lệ**
```
Input: product_id=1 (stock=100), quantity=30
Expected: Stock giảm còn 70
```

**Test Case 2: Xuất bằng đúng tồn**
```
Input: product_id=1 (stock=100), quantity=100
Expected: Stock = 0, xuất thành công
```

**Test Case 3: Xuất lớn hơn tồn**
```
Input: product_id=1 (stock=100), quantity=101
Expected: Error (stock not enough)
```

**Test Case 4: Xuất khi tồn = 0**
```
Input: product_id=1 (stock=0), quantity=1
Expected: Error (stock not enough)
```

---

## 10. TIẾP THEO

**Bước 2: Thiết kế ERD**

Sẽ vẽ Entity-Relationship Diagram chi tiết, thể hiện:
- Các bảng (Tables)
- Các cột (Columns) và kiểu dữ liệu
- Khóa chính (Primary Keys)
- Khóa ngoại (Foreign Keys)
- Mối quan hệ (Relationships)
- Ràng buộc dữ liệu (Constraints)

---

**Ngày phân tích: 2024-08-16**
**Phiên bản: 1.0**
