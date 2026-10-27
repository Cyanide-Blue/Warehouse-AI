"""
Unit schemas for CRUD operations
"""
from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional

class UnitBase(BaseModel):
    """Base unit schema"""
    name: str = Field(..., min_length=1, max_length=50)
    abbreviation: str = Field(..., min_length=1, max_length=10)

class UnitCreate(UnitBase):
    """Unit creation schema"""
    pass

class UnitUpdate(BaseModel):
    """Unit update schema"""
    name: Optional[str] = None
    abbreviation: Optional[str] = None

class UnitResponse(UnitBase):
    """Unit response schema"""
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
