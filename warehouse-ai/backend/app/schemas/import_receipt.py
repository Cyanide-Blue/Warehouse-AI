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

class ImportReceiptItemResponse(ImportReceiptItemCreate):
    """Import receipt item response schema"""
    id: int
    total_amount: Optional[Decimal] = None
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
    items: List[ImportReceiptItemResponse]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
