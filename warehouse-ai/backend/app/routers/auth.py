"""
Authentication endpoints - Login, Register, User info
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user, get_current_admin
from app.models import User, Role
from app.services.auth_service import AuthService
from app.schemas.user import LoginRequest, LoginResponse, UserResponse, UserCreate
from app.schemas.base import SuccessResponse
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Authentication"])
logger = logging.getLogger(__name__)

@router.post("/login", response_model=SuccessResponse)
async def login(login_request: LoginRequest, db: Session = Depends(get_db)):
    """
    POST /api/auth/login
    Đăng nhập - xác thực username/password và trả JWT token
    
    Request:
        {
            "username": "admin",
            "password": "password123"
        }
    
    Response (200):
        {
            "status": "success",
            "message": "Login successful",
            "data": {
                "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
                "token_type": "bearer",
                "user": {
                    "id": 1,
                    "username": "admin",
                    "email": "admin@example.com",
                    "full_name": "Admin User",
                    "role_id": 1,
                    "is_active": true,
                    "created_at": "2024-08-16T10:00:00",
                    "updated_at": "2024-08-16T10:00:00"
                }
            }
        }
    
    Error (401):
        {
            "status": "error",
            "message": "Invalid username or password",
            "error_code": "INVALID_CREDENTIALS"
        }
    """
    try:
        auth_service = AuthService(db)
        result = auth_service.login(login_request.username, login_request.password)
        
        logger.info(f"User {login_request.username} logged in successfully")
        
        return SuccessResponse(
            status="success",
            message="Login successful",
            data=LoginResponse(
                access_token=result["access_token"],
                token_type=result["token_type"],
                user=UserResponse.from_orm(result["user"])
            )
        )
    except AppException as e:
        logger.warning(f"Login failed for user {login_request.username}: {e.message}")
        raise HTTPException(status_code=e.status_code, detail={
            "message": e.message,
            "error_code": e.error_code
        })
    except Exception as e:
        logger.error(f"Unexpected error during login: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Internal server error", "error_code": "INTERNAL_ERROR"}
        )

@router.get("/me", response_model=SuccessResponse)
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    GET /api/auth/me
    Lấy thông tin người dùng hiện tại (phải đăng nhập)
    Headers: Authorization: Bearer {token}
    
    Response (200):
        {
            "status": "success",
            "data": {
                "id": 1,
                "username": "admin",
                "email": "admin@example.com",
                "full_name": "Admin User",
                "role_id": 1,
                "is_active": true,
                "role": {
                    "id": 1,
                    "name": "ADMIN"
                },
                "created_at": "2024-08-16T10:00:00",
                "updated_at": "2024-08-16T10:00:00"
            }
        }
    
    Error (401):
        {
            "status": "error",
            "message": "Token expired or invalid",
            "error_code": "TOKEN_EXPIRED"
        }
    """
    try:
        # Reload user from database to get fresh data
        user = db.query(User).filter(User.id == current_user.id).first()
        
        # Load user's role
        role = db.query(Role).filter(Role.id == user.role_id).first()
        
        # Convert to response with role
        user_response = UserResponse.from_orm(user)
        if role:
            user_response.role = {"id": role.id, "name": role.name}
        
        logger.info(f"Retrieved user info for user {current_user.username}")
        
        return SuccessResponse(
            status="success",
            message="User information retrieved successfully",
            data=user_response
        )
    except Exception as e:
        logger.error(f"Error retrieving user info: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Internal server error", "error_code": "INTERNAL_ERROR"}
        )

@router.post("/users", response_model=SuccessResponse)
async def create_user(
    user_create: UserCreate,
    current_admin: User = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    POST /api/auth/users
    Tạo người dùng mới (admin only)
    Headers: Authorization: Bearer {token}
    
    Request:
        {
            "username": "storekeeper1",
            "email": "storekeeper@example.com",
            "full_name": "Storekeeper One",
            "password": "SecurePass123!",
            "role_id": 2
        }
    
    Response (201):
        {
            "status": "success",
            "message": "User created successfully",
            "data": {
                "id": 2,
                "username": "storekeeper1",
                "email": "storekeeper@example.com",
                "full_name": "Storekeeper One",
                "role_id": 2,
                "is_active": true,
                "created_at": "2024-08-16T11:00:00"
            }
        }
    
    Error (409):
        {
            "status": "error",
            "message": "User with this username already exists (field: username)",
            "error_code": "DUPLICATE_RESOURCE"
        }
    
    Error (403):
        {
            "status": "error",
            "message": "Only admin can create users",
            "error_code": "FORBIDDEN"
        }
    """
    try:
        auth_service = AuthService(db)
        new_user = auth_service.create_user(
            username=user_create.username,
            email=user_create.email,
            full_name=user_create.full_name,
            password=user_create.password,
            role_id=user_create.role_id
        )
        
        logger.info(f"New user created: {user_create.username} by admin {current_admin.username}")
        
        return SuccessResponse(
            status="success",
            message="User created successfully",
            data=UserResponse.from_orm(new_user)
        )
    except AppException as e:
        logger.warning(f"User creation failed: {e.message}")
        raise HTTPException(status_code=e.status_code, detail={
            "message": e.message,
            "error_code": e.error_code
        })
    except Exception as e:
        logger.error(f"Unexpected error during user creation: {str(e)}")
        raise HTTPException(
            status_code=500,
            detail={"message": "Internal server error", "error_code": "INTERNAL_ERROR"}
        )
