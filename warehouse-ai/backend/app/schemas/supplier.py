"""
Supplier schemas for CRUD operations
"""
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

class SupplierBase(BaseModel):
    """Base supplier schema"""
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    email: Optional[EmailStr] = None
    phone: Optional[str] = Field(None, max_length=20)
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None

class SupplierCreate(SupplierBase):
    """Supplier creation schema"""
    pass

class SupplierUpdate(BaseModel):
    """Supplier update schema"""
    name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    country: Optional[str] = None
    contact_person: Optional[str] = None
    notes: Optional[str] = None

class SupplierResponse(SupplierBase):
    """Supplier response schema"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
