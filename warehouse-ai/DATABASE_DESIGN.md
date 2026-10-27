# BƯỚC 3: THIẾT KẾ DATABASE SQLALCHEMY
## Hệ Thống Quản Lý Kho Có Tích Hợp AI

---

## 1. TỔNG QUAN

Bước này tạo ra các SQLAlchemy ORM Models tương ứng với các Entity đã thiết kế trong ERD.

**Công nghệ sử dụng:**
- **SQLAlchemy 2.0**: ORM framework
- **SQLite**: Database engine (đơn giản, không cần server riêng)
- **Pydantic**: Schema validation
- **Python 3.10+**: Runtime

**File đã tạo:**
```
backend/
├── app/
│   ├── config.py              # Cấu hình ứng dụng
│   ├── database.py            # Kết nối SQLite, SessionLocal
│   └── models/
│       └── __init__.py        # Tất cả SQLAlchemy Models
├── requirements.txt           # Dependencies
└── .env.example              # Environment variables
```

---

## 2. CẤU HÌNH DATABASE

### 2.1 database.py

```python
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.pool import StaticPool

# SQLite connection
engine = create_engine(
    "sqlite:///./warehouse.db",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    """Dependency injection cho database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

**Giải thích:**
- `StaticPool`: Để tránh thread-safety issues với SQLite
- `get_db()`: Được sử dụng trong dependency injection của FastAPI
- `check_same_thread=False`: Cho phép nhiều thread truy cập SQLite

### 2.2 config.py

Chứa tất cả cấu hình:
- Database URL
- JWT secret key
- OpenAI API key
- Application settings
- Pagination settings
- Business rules

---

## 3. SQLALCHEMY MODELS

### 3.1 Cấu trúc chung của Model

```python
class MyModel(Base):
    __tablename__ = "my_models"
    
    # Columns
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("condition", name="ck_name"),
        UniqueConstraint("col1", "col2", name="uc_name"),
        Index("idx_name", "col"),
    )
    
    # Relationships
    other_models = relationship("OtherModel", back_populates="my_model")
    
    def __repr__(self):
        return f"<MyModel(id={self.id}, name='{self.name}')>"
```

### 3.2 Các Model Chính

#### **Role** (roles)
```python
class Role(Base):
    __tablename__ = "roles"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)  # ADMIN, STOREKEEPER, ACCOUNTANT
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    users = relationship("User", back_populates="role")
```

**Dữ liệu mẫu:**
```sql
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Administrator - Full access'),
(2, 'STOREKEEPER', 'Warehouse manager - Manage inventory'),
(3, 'ACCOUNTANT', 'Accountant - View reports and AI analysis');
```

---

#### **User** (users)
```python
class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(50), unique=True, nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, default=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    role = relationship("Role", back_populates="users")
    # ... other relationships
```

**Ràng buộc:**
- `username` unique + indexed
- `email` unique + indexed
- `password_hash` không bao giờ lưu plaintext
- `is_active` để soft delete

---

#### **Category** (categories)
```python
class Category(Base):
    __tablename__ = "categories"
    id = Column(Integer, primary_key=True)
    name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    products = relationship("Product", back_populates="category")
```

**Dữ liệu mẫu:**
```sql
INSERT INTO categories (name, description) VALUES
('Điện tử', 'Electronic devices'),
('Văn phòng phẩm', 'Office supplies'),
('Phụ kiện máy tính', 'Computer accessories');
```

---

#### **Unit** (units)
```python
class Unit(Base):
    __tablename__ = "units"
    id = Column(Integer, primary_key=True)
    name = Column(String(50), unique=True, nullable=False)  # Cái, Bộ, Hộp, Thùng
    abbreviation = Column(String(10), unique=True, nullable=False)  # cái, bộ, hộp, thùng
    created_at = Column(DateTime, server_default=func.now())
    
    products = relationship("Product", back_populates="unit")
```

**Dữ liệu mẫu:**
```sql
INSERT INTO units (name, abbreviation) VALUES
('Cái', 'cái'),
('Bộ', 'bộ'),
('Hộp', 'hộp'),
('Thùng', 'thùng'),
('Bao', 'bao');
```

---

#### **Supplier** (suppliers)
```python
class Supplier(Base):
    __tablename__ = "suppliers"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)  # NCC-001
    name = Column(String(100), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    city = Column(String(50))
    country = Column(String(50))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    import_receipts = relationship("ImportReceipt", back_populates="supplier")
```

---

#### **Product** (products) - **MỨC ĐỘ QUAN TRỌNG CAO**
```python
class Product(Base):
    __tablename__ = "products"
    id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)  # HH001
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    description = Column(Text)
    minimum_stock = Column(Integer, default=0)
    current_stock = Column(Integer, default=0)  # Key field
    reorder_quantity = Column(Integer)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("current_stock >= 0", name="ck_product_current_stock_positive"),
        CheckConstraint("minimum_stock >= 0", name="ck_product_minimum_stock_positive"),
        Index("idx_products_current_stock", "current_stock"),
    )
    
    category = relationship("Category", back_populates="products")
    unit = relationship("Unit", back_populates="products")
    import_receipt_items = relationship("ImportReceiptItem", back_populates="product")
    export_receipt_items = relationship("ExportReceiptItem", back_populates="product")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product")
```

**Các ràng buộc quan trọng:**
- `current_stock >= 0`: Tồn kho không được âm
- `minimum_stock >= 0`: Tồn tối thiểu không được âm
- `code` unique: Mã hàng không được trùng
- Index trên `current_stock`: Để tìm hàng dưới tồn tối thiểu nhanh

---

#### **ImportReceipt** (import_receipts)
```python
class ImportReceipt(Base):
    __tablename__ = "import_receipts"
    id = Column(Integer, primary_key=True)
    receipt_code = Column(String(50), unique=True, nullable=False)  # IMP-20260816-001
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    receipt_date = Column(Date, nullable=False)
    status = Column(String(20), default="DRAFT")  # DRAFT, CONFIRMED, CANCELLED
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    total_amount = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')", name="ck_import_receipt_status"),
    )
    
    supplier = relationship("Supplier", back_populates="import_receipts")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="import_receipts")
    confirmed_by_user = relationship("User", foreign_keys=[confirmed_by], back_populates="import_receipts_confirmed")
    items = relationship("ImportReceiptItem", back_populates="import_receipt", cascade="all, delete-orphan")
```

**Status flow:**
```
DRAFT (new) → CONFIRMED (xác nhận, update stock) → CANCELLED (hủy)
      ↓                        ↓
   Có thể sửa          Không được sửa, cập nhật stock
```

---

#### **ImportReceiptItem** (import_receipt_items)
```python
class ImportReceiptItem(Base):
    __tablename__ = "import_receipt_items"
    id = Column(Integer, primary_key=True)
    import_receipt_id = Column(Integer, ForeignKey("import_receipts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)  # Must > 0
    unit_price = Column(Numeric(15, 2), nullable=False)
    total_amount = Column(Numeric(15, 2))  # quantity * unit_price
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_import_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_import_item_unit_price_positive"),
        UniqueConstraint("import_receipt_id", "product_id", name="uc_import_item_unique"),
    )
    
    @validates("quantity")
    def validate_quantity(self, key, value):
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        return value
    
    import_receipt = relationship("ImportReceipt", back_populates="items")
    product = relationship("Product", back_populates="import_receipt_items")
```

**Ràng buộc:**
- `quantity > 0`: Số lượng nhập phải > 0
- `unit_price >= 0`: Đơn giá không được âm
- `UNIQUE (import_receipt_id, product_id)`: Mỗi sản phẩm chỉ xuất hiện 1 lần trong phiếu
- Validator: Double check quantity > 0

---

#### **ExportReceipt** (export_receipts)
```python
class ExportReceipt(Base):
    __tablename__ = "export_receipts"
    id = Column(Integer, primary_key=True)
    receipt_code = Column(String(50), unique=True, nullable=False)  # EXP-20260816-001
    receipt_date = Column(Date, nullable=False)
    status = Column(String(20), default="DRAFT")  # DRAFT, CONFIRMED, CANCELLED
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, onupdate=func.now())
    
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')", name="ck_export_receipt_status"),
    )
    
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="export_receipts")
    confirmed_by_user = relationship("User", foreign_keys=[confirmed_by], back_populates="export_receipts_confirmed")
    items = relationship("ExportReceiptItem", back_populates="export_receipt", cascade="all, delete-orphan")
```

---

#### **ExportReceiptItem** (export_receipt_items)
```python
class ExportReceiptItem(Base):
    __tablename__ = "export_receipt_items"
    id = Column(Integer, primary_key=True)
    export_receipt_id = Column(Integer, ForeignKey("export_receipts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)  # Must > 0
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_export_item_quantity_positive"),
        UniqueConstraint("export_receipt_id", "product_id", name="uc_export_item_unique"),
    )
    
    export_receipt = relationship("ExportReceipt", back_populates="items")
    product = relationship("Product", back_populates="export_receipt_items")
```

---

#### **InventoryTransaction** (inventory_transactions) - **MỨC ĐỘ QUAN TRỌNG CAO**
```python
class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # IMPORT or EXPORT
    quantity = Column(Integer, nullable=False)  # Luôn dương
    old_stock = Column(Integer, nullable=False)  # Before transaction
    new_stock = Column(Integer, nullable=False)  # After transaction
    reference_type = Column(String(20))  # IMPORT_RECEIPT or EXPORT_RECEIPT
    reference_id = Column(Integer)  # Phiếu ID
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    
    __table_args__ = (
        CheckConstraint("transaction_type IN ('IMPORT', 'EXPORT')", name="ck_inventory_transaction_type"),
        CheckConstraint("quantity > 0", name="ck_inventory_transaction_quantity_positive"),
        CheckConstraint("new_stock >= 0", name="ck_inventory_transaction_new_stock_positive"),
        Index("idx_inventory_transactions_product_id", "product_id"),
        Index("idx_inventory_transactions_type", "transaction_type"),
    )
    
    product = relationship("Product", back_populates="inventory_transactions")
    created_by_user = relationship("User", back_populates="inventory_transactions")
```

**Ý nghĩa:**
- Ghi nhận mọi thay đổi tồn kho
- Cho phép audit trail (lịch sử truy vết)
- Kiểm chứng: `new_stock - old_stock = quantity (IMPORT)` hoặc `-quantity (EXPORT)`

---

## 4. MỐI QUAN HỆ (RELATIONSHIPS)

### One-to-Many
```python
# Role - User (1 role có nhiều user)
role = relationship("Role", back_populates="users")
users = relationship("User", back_populates="role")

# Category - Product (1 category có nhiều product)
category = relationship("Category", back_populates="products")
products = relationship("Product", back_populates="category")

# ImportReceipt - ImportReceiptItem (1 receipt có nhiều item)
import_receipt = relationship("ImportReceipt", back_populates="items")
items = relationship("ImportReceiptItem", back_populates="import_receipt")
```

### Cascade Delete
```python
# Xóa ImportReceipt → tự động xóa tất cả ImportReceiptItem
items = relationship("ImportReceiptItem", back_populates="import_receipt", cascade="all, delete-orphan")
```

---

## 5. KHỞI ĐỘNG DATABASE

### 5.1 Tạo tất cả bảng

```python
from app.database import init_db

# Gọi 1 lần khi ứng dụng khởi động
init_db()
```

**Output:**
```
Database initialized successfully!
```

### 5.2 Kết nối SessionLocal

```python
from fastapi import Depends
from app.database import get_db
from sqlalchemy.orm import Session

@app.get("/items")
def get_items(db: Session = Depends(get_db)):
    # db session được cung cấp tự động
    items = db.query(Item).all()
    return items
```

---

## 6. CONSTRAINTS VÀ VALIDATIONS

### Check Constraints (Database Level)

```sql
-- Tồn kho không được âm
ALTER TABLE products ADD CONSTRAINT ck_product_current_stock_positive 
    CHECK (current_stock >= 0);

-- Số lượng nhập phải > 0
ALTER TABLE import_receipt_items ADD CONSTRAINT ck_import_item_quantity_positive 
    CHECK (quantity > 0);

-- Status phải nằm trong danh sách
ALTER TABLE import_receipts ADD CONSTRAINT ck_import_receipt_status 
    CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED'));
```

### Application Level Validators

```python
class ImportReceiptItem(Base):
    @validates("quantity")
    def validate_quantity(self, key, value):
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        return value
```

---

## 7. INDEXING STRATEGY

### Indexes để tối ưu hiệu năng

```python
# Tìm hàng dưới tồn tối thiểu
Index("idx_products_current_stock", "current_stock")

# Lọc phiếu theo trạng thái
Index("idx_import_receipts_status", "status")

# Tìm giao dịch trong khoảng thời gian
Index("idx_inventory_transactions_created_at", "created_at")

# Query lịch sử của 1 sản phẩm
Index("idx_inventory_transactions_product_id", "product_id")
```

---

## 8. EXAMPLE DATA SETUP

### Dữ liệu khởi tạo (seed data)

```python
from app.database import SessionLocal
from app.models import Role, Unit, Category, Supplier, User, Product

def seed_database():
    db = SessionLocal()
    
    # 1. Tạo Roles
    roles = [
        Role(name="ADMIN", description="Administrator"),
        Role(name="STOREKEEPER", description="Warehouse manager"),
        Role(name="ACCOUNTANT", description="Accountant"),
    ]
    db.add_all(roles)
    db.commit()
    
    # 2. Tạo Units
    units = [
        Unit(name="Cái", abbreviation="cái"),
        Unit(name="Bộ", abbreviation="bộ"),
        Unit(name="Hộp", abbreviation="hộp"),
    ]
    db.add_all(units)
    db.commit()
    
    # 3. Tạo Categories
    categories = [
        Category(name="Điện tử"),
        Category(name="Văn phòng phẩm"),
    ]
    db.add_all(categories)
    db.commit()
    
    # 4. Tạo Users
    # (Password hash sẽ được xử lý bởi authentication service)
    
    print("Seed data created!")
    db.close()
```

---

## 9. MIGRATION (Optional: Using Alembic)

Nếu cần version control cho schema:

```bash
# Khởi tạo Alembic
alembic init alembic

# Tạo migration
alembic revision --autogenerate -m "Create initial tables"

# Apply migration
alembic upgrade head
```

---

## 10. KIỂM THỬ DATABASE

### Test query tồn kho

```python
from sqlalchemy import func

# Tìm hàng dưới tồn tối thiểu
low_stock = db.query(Product).filter(
    Product.current_stock < Product.minimum_stock
).all()

# Tổng tồn kho toàn kho
total_stock = db.query(func.sum(Product.current_stock)).scalar()

# Hàng không bán trong 30 ngày
from datetime import datetime, timedelta
thirty_days_ago = datetime.now() - timedelta(days=30)
not_sold = db.query(Product).filter(
    ~Product.inventory_transactions.any(
        (InventoryTransaction.transaction_type == "EXPORT") &
        (InventoryTransaction.created_at >= thirty_days_ago)
    )
).all()
```

---

## 11. TIẾP THEO

**Bước 4: Thiết kế kiến trúc FastAPI**

Sẽ bao gồm:
- Folder structure
- Router organization
- Middleware setup
- Error handling
- CORS configuration
- Dependency injection

---

**Ngày thiết kế: 2024-08-16**
**Phiên bản: 1.0**
**Status: ✅ HOÀN THÀNH**
