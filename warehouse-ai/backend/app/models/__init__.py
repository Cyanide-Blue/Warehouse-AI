"""
SQLAlchemy Models for the Warehouse Management System.
"""
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Text, Boolean, DateTime,
    ForeignKey, Numeric, Date, Index, UniqueConstraint, CheckConstraint
)
from sqlalchemy.orm import relationship, validates
from sqlalchemy.sql import func
from ..database import Base


# ==================== ROLES ====================
class Role(Base):
    __tablename__ = "roles"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    description = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    users = relationship("User", back_populates="role")
    
    def __repr__(self):
        return f"<Role(id={self.id}, name='{self.name}')>"


# ==================== USERS ====================
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    full_name = Column(String(100), nullable=False)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    role_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    role = relationship("Role", back_populates="users")
    import_receipts = relationship("ImportReceipt", foreign_keys="ImportReceipt.created_by", back_populates="created_by_user")
    import_receipts_confirmed = relationship("ImportReceipt", foreign_keys="ImportReceipt.confirmed_by", back_populates="confirmed_by_user")
    export_receipts = relationship("ExportReceipt", foreign_keys="ExportReceipt.created_by", back_populates="created_by_user")
    export_receipts_confirmed = relationship("ExportReceipt", foreign_keys="ExportReceipt.confirmed_by", back_populates="confirmed_by_user")
    inventory_transactions = relationship("InventoryTransaction", back_populates="created_by_user")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', role_id={self.role_id})>"


# ==================== CATEGORIES ====================
class Category(Base):
    __tablename__ = "categories"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text)
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    products = relationship("Product", back_populates="category")
    
    def __repr__(self):
        return f"<Category(id={self.id}, name='{self.name}')>"


# ==================== UNITS ====================
class Unit(Base):
    __tablename__ = "units"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(50), unique=True, nullable=False, index=True)
    abbreviation = Column(String(10), unique=True, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Relationships
    products = relationship("Product", back_populates="unit")
    
    def __repr__(self):
        return f"<Unit(id={self.id}, name='{self.name}', abbreviation='{self.abbreviation}')>"


# ==================== SUPPLIERS ====================
class Supplier(Base):
    __tablename__ = "suppliers"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    contact_person = Column(String(100))
    phone = Column(String(20))
    email = Column(String(100))
    address = Column(Text)
    city = Column(String(50))
    country = Column(String(50))
    is_active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Relationships
    import_receipts = relationship("ImportReceipt", back_populates="supplier")
    
    def __repr__(self):
        return f"<Supplier(id={self.id}, code='{self.code}', name='{self.name}')>"


# ==================== PRODUCTS ====================
class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(200), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id"), nullable=False)
    unit_id = Column(Integer, ForeignKey("units.id"), nullable=False)
    description = Column(Text)
    minimum_stock = Column(Integer, nullable=False, default=0)
    current_stock = Column(Integer, nullable=False, default=0)
    reorder_quantity = Column(Integer)
    is_active = Column(Boolean, nullable=False, default=True, index=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("current_stock >= 0", name="ck_product_current_stock_positive"),
        CheckConstraint("minimum_stock >= 0", name="ck_product_minimum_stock_positive"),
        Index("idx_products_current_stock", "current_stock"),
    )
    
    # Relationships
    category = relationship("Category", back_populates="products")
    unit = relationship("Unit", back_populates="products")
    import_receipt_items = relationship("ImportReceiptItem", back_populates="product", cascade="all, delete-orphan")
    export_receipt_items = relationship("ExportReceiptItem", back_populates="product", cascade="all, delete-orphan")
    inventory_transactions = relationship("InventoryTransaction", back_populates="product", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Product(id={self.id}, code='{self.code}', name='{self.name}', current_stock={self.current_stock})>"


# ==================== IMPORT RECEIPTS ====================
class ImportReceipt(Base):
    __tablename__ = "import_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    receipt_code = Column(String(50), unique=True, nullable=False, index=True)
    supplier_id = Column(Integer, ForeignKey("suppliers.id"), nullable=False)
    receipt_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="DRAFT", index=True)  # DRAFT, CONFIRMED, CANCELLED
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    total_amount = Column(Numeric(15, 2), default=0)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')", name="ck_import_receipt_status"),
    )
    
    # Relationships
    supplier = relationship("Supplier", back_populates="import_receipts")
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="import_receipts")
    confirmed_by_user = relationship("User", foreign_keys=[confirmed_by], back_populates="import_receipts_confirmed")
    items = relationship("ImportReceiptItem", back_populates="import_receipt", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ImportReceipt(id={self.id}, receipt_code='{self.receipt_code}', status='{self.status}')>"


# ==================== IMPORT RECEIPT ITEMS ====================
class ImportReceiptItem(Base):
    __tablename__ = "import_receipt_items"
    
    id = Column(Integer, primary_key=True, index=True)
    import_receipt_id = Column(Integer, ForeignKey("import_receipts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Numeric(15, 2), nullable=False)
    total_amount = Column(Numeric(15, 2))
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_import_item_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_import_item_unit_price_positive"),
        UniqueConstraint("import_receipt_id", "product_id", name="uc_import_item_unique"),
        Index("idx_import_receipt_items_receipt_id", "import_receipt_id"),
        Index("idx_import_receipt_items_product_id", "product_id"),
    )
    
    # Relationships
    import_receipt = relationship("ImportReceipt", back_populates="items")
    product = relationship("Product", back_populates="import_receipt_items")
    
    @validates("quantity")
    def validate_quantity(self, key, value):
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        return value
    
    def __repr__(self):
        return f"<ImportReceiptItem(id={self.id}, product_id={self.product_id}, quantity={self.quantity})>"


# ==================== EXPORT RECEIPTS ====================
class ExportReceipt(Base):
    __tablename__ = "export_receipts"
    
    id = Column(Integer, primary_key=True, index=True)
    receipt_code = Column(String(50), unique=True, nullable=False, index=True)
    receipt_date = Column(Date, nullable=False, index=True)
    status = Column(String(20), nullable=False, default="DRAFT", index=True)  # DRAFT, CONFIRMED, CANCELLED
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    confirmed_by = Column(Integer, ForeignKey("users.id"), nullable=True)
    confirmed_at = Column(DateTime, nullable=True)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')", name="ck_export_receipt_status"),
    )
    
    # Relationships
    created_by_user = relationship("User", foreign_keys=[created_by], back_populates="export_receipts")
    confirmed_by_user = relationship("User", foreign_keys=[confirmed_by], back_populates="export_receipts_confirmed")
    items = relationship("ExportReceiptItem", back_populates="export_receipt", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ExportReceipt(id={self.id}, receipt_code='{self.receipt_code}', status='{self.status}')>"


# ==================== EXPORT RECEIPT ITEMS ====================
class ExportReceiptItem(Base):
    __tablename__ = "export_receipt_items"
    
    id = Column(Integer, primary_key=True, index=True)
    export_receipt_id = Column(Integer, ForeignKey("export_receipts.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    quantity = Column(Integer, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_export_item_quantity_positive"),
        UniqueConstraint("export_receipt_id", "product_id", name="uc_export_item_unique"),
        Index("idx_export_receipt_items_receipt_id", "export_receipt_id"),
        Index("idx_export_receipt_items_product_id", "product_id"),
    )
    
    # Relationships
    export_receipt = relationship("ExportReceipt", back_populates="items")
    product = relationship("Product", back_populates="export_receipt_items")
    
    @validates("quantity")
    def validate_quantity(self, key, value):
        if value <= 0:
            raise ValueError("Quantity must be greater than 0")
        return value
    
    def __repr__(self):
        return f"<ExportReceiptItem(id={self.id}, product_id={self.product_id}, quantity={self.quantity})>"


# ==================== INVENTORY TRANSACTIONS ====================
class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    transaction_type = Column(String(20), nullable=False)  # IMPORT or EXPORT
    quantity = Column(Integer, nullable=False)
    old_stock = Column(Integer, nullable=False)
    new_stock = Column(Integer, nullable=False)
    reference_type = Column(String(20))  # IMPORT_RECEIPT or EXPORT_RECEIPT
    reference_id = Column(Integer)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, server_default=func.now(), nullable=False, index=True)
    
    # Constraints
    __table_args__ = (
        CheckConstraint("transaction_type IN ('IMPORT', 'EXPORT')", name="ck_inventory_transaction_type"),
        CheckConstraint("quantity > 0", name="ck_inventory_transaction_quantity_positive"),
        CheckConstraint("new_stock >= 0", name="ck_inventory_transaction_new_stock_positive"),
        Index("idx_inventory_transactions_product_id", "product_id"),
        Index("idx_inventory_transactions_type", "transaction_type"),
    )
    
    # Relationships
    product = relationship("Product", back_populates="inventory_transactions")
    created_by_user = relationship("User", back_populates="inventory_transactions")
    
    def __repr__(self):
        return f"<InventoryTransaction(id={self.id}, product_id={self.product_id}, type='{self.transaction_type}', qty={self.quantity})>"
