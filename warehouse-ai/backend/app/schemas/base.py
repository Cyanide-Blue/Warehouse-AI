"""
Base response schemas for API standardization
"""
from pydantic import BaseModel
from typing import Generic, TypeVar, Optional, Any

T = TypeVar('T')

class PaginationInfo(BaseModel):
    """Pagination information in response"""
    total: int
    skip: int
    limit: int
    pages: int

class SuccessResponse(BaseModel, Generic[T]):
    """Standard success response wrapper"""
    status: str = "success"
    message: str = ""
    data: Optional[T] = None
    pagination: Optional[PaginationInfo] = None

class ErrorResponse(BaseModel):
    """Standard error response wrapper"""
    status: str = "error"
    message: str
    error_code: str
    data: Optional[Any] = None
