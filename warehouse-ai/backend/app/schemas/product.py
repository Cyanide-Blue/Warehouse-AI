"""
Product schemas for CRUD operations
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional
from datetime import datetime


class SimpleCategory(BaseModel):
    """Simple category schema for nested product response"""
    id: int
    name: str
    code: Optional[str] = None
    description: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class SimpleUnit(BaseModel):
    """Simple unit schema for nested product response"""
    id: int
    name: str
    abbreviation: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


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
    """Product response schema with full category and unit details"""
    id: int
    current_stock: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    category: Optional[SimpleCategory] = None
    unit: Optional[SimpleUnit] = None
    
    model_config = ConfigDict(from_attributes=True)

    @classmethod
    def from_orm(cls, obj):
        return cls.model_validate(obj)

