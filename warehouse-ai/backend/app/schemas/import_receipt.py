"""
Import receipt schemas for creating and managing imports
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime
from decimal import Decimal


class SupplierBrief(BaseModel):
    """Brief supplier info for embedding in receipt responses"""
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class ProductBrief(BaseModel):
    """Brief product info for embedding in receipt item responses"""
    id: int
    code: str
    name: str

    class Config:
        from_attributes = True


class UserBrief(BaseModel):
    """Brief user info for creator and confirmer"""
    id: int
    username: str
    full_name: str

    class Config:
        from_attributes = True


class ImportReceiptItemCreate(BaseModel):
    """Import receipt item creation schema"""
    product_id: int
    quantity: int = Field(..., gt=0)
    unit_price: Decimal = Field(..., ge=0)
    notes: Optional[str] = None


class ImportReceiptCreate(BaseModel):
    """Import receipt creation schema"""
    supplier_id: int
    receipt_date: date
    items: List[ImportReceiptItemCreate]
    notes: Optional[str] = None
    auto_confirm: Optional[bool] = False


class ImportReceiptItemResponse(BaseModel):
    """Import receipt item response schema"""
    id: int
    product_id: int
    product: Optional[ProductBrief] = None
    quantity: int
    unit_price: Decimal
    total_amount: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True


class ImportReceiptResponse(BaseModel):
    """Import receipt response schema"""
    id: int
    receipt_code: str
    supplier_id: int
    supplier: Optional[SupplierBrief] = None
    receipt_date: date
    status: str
    notes: Optional[str] = None
    total_amount: Decimal
    created_by: Optional[int] = None
    created_by_user: Optional[UserBrief] = None
    confirmed_by: Optional[int] = None
    confirmed_by_user: Optional[UserBrief] = None
    confirmed_at: Optional[datetime] = None
    items: List[ImportReceiptItemResponse] = []
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
