"""
Category schemas for CRUD operations
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class CategoryBase(BaseModel):
    """Base category schema"""
    name: str = Field(..., min_length=1, max_length=100)
    code: Optional[str] = Field(None, max_length=50)
    description: Optional[str] = None

class CategoryCreate(CategoryBase):
    """Category creation schema"""
    pass

class CategoryUpdate(BaseModel):
    """Category update schema"""
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None

class CategoryResponse(CategoryBase):
    """Category response schema"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
