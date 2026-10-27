"""
Export receipt schemas for creating and managing exports
"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import date, datetime

class ExportReceiptItemCreate(BaseModel):
    """Export receipt item creation schema"""
    product_id: int
    quantity: int = Field(..., gt=0)
    notes: Optional[str] = None

class ExportReceiptCreate(BaseModel):
    """Export receipt creation schema"""
    receipt_date: date
    items: List[ExportReceiptItemCreate]
    notes: Optional[str] = None

class ExportReceiptItemResponse(ExportReceiptItemCreate):
    """Export receipt item response schema"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class ExportReceiptResponse(BaseModel):
    """Export receipt response schema"""
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
