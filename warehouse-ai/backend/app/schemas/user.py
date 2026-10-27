"""
Authentication schemas for login/register and token responses
"""
from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional

class LoginRequest(BaseModel):
    """User login request"""
    username: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=1)

class TokenResponse(BaseModel):
    """JWT token response after login"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # seconds

class UserRole(BaseModel):
    """User role information"""
    id: int
    name: str  # ADMIN, STOREKEEPER, ACCOUNTANT
    
    class Config:
        from_attributes = True

class UserBase(BaseModel):
    """Base user schema"""
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=100)
    role_id: int

class UserCreate(UserBase):
    """User creation schema"""
    password: str = Field(..., min_length=8)

class UserUpdate(BaseModel):
    """User update schema"""
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = None
    role_id: Optional[int] = None

class UserResponse(UserBase):
    """User response schema"""
    id: int
    is_active: bool
    created_at: datetime
    updated_at: datetime
    role: Optional[UserRole] = None
    
    class Config:
        from_attributes = True

class LoginResponse(BaseModel):
    """Complete login response with token and user"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
