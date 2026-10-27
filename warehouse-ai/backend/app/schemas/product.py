"""
Product schemas for CRUD operations
"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductBase(BaseModel):
    """Base product schema"""
    code: str = Field(..., min_length=1, max_length=50)
    name: str = Field(..., min_length=1, max_length=200)
    category_id: int
    unit_id: int
    minimum_stock: int = Field(default=0, ge=0)
    description: Optional[str] = None
    reorder_quantity: Optional[int] = None

class ProductCreate(ProductBase):
    """Product creation schema"""
    pass

class ProductUpdate(BaseModel):
    """Product update schema"""
    name: Optional[str] = None
    category_id: Optional[int] = None
    unit_id: Optional[int] = None
    minimum_stock: Optional[int] = None
    description: Optional[str] = None
    reorder_quantity: Optional[int] = None

class ProductResponse(ProductBase):
    """Product response schema"""
    id: int
    current_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
