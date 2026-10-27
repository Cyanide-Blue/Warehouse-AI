"""
Dependency injection for authentication and authorization.
"""
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from typing import Callable, Optional

from ..database import get_db
from ..models import User
from .jwt_handler import verify_token
from ..exceptions import UnauthorizedException, ForbiddenException

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Get current authenticated user from JWT token.
    
    This is a dependency that can be used in route handlers to:
    1. Require authentication (401 if missing/invalid token)
    2. Get the authenticated user object
    
    Usage:
        @app.get("/me")
        async def get_me(current_user: User = Depends(get_current_user)):
            return current_user
    
    Args:
        credentials: HTTP Bearer token from request header
        db: Database session
    
    Returns:
        Authenticated User object
    
    Raises:
        UnauthorizedException: If token is missing, invalid, or user not found
    """
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if not user_id:
            raise UnauthorizedException("Invalid token")
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        
        if not user:
            raise UnauthorizedException("User not found")
        
        if not user.is_active:
            raise UnauthorizedException("User is inactive")
        
        return user
        
    except Exception as e:
        if isinstance(e, UnauthorizedException):
            raise
        raise UnauthorizedException(str(e))


def require_role(*allowed_roles: str) -> Callable:
    """
    Create a dependency that requires user to have one of the specified roles.
    
    This higher-order function returns a dependency that:
    1. Gets the current user (via get_current_user)
    2. Checks if user's role is in allowed_roles
    3. Returns user if authorized, raises ForbiddenException if not
    
    Usage:
        @app.delete("/products/{id}")
        async def delete_product(
            id: int,
            current_user: User = Depends(require_role("ADMIN"))
        ):
            return {"message": "Deleted"}
        
        # Multiple roles
        @app.post("/imports")
        async def create_import(
            current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
        ):
            pass
    
    Args:
        allowed_roles: One or more role names (e.g., "ADMIN", "STOREKEEPER")
    
    Returns:
        Dependency function that checks role
    
    Raises:
        ForbiddenException: If user's role is not in allowed_roles
    """
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.name not in allowed_roles:
            raise ForbiddenException(
                f"Access denied. Required role(s): {', '.join(allowed_roles)}"
            )
        return current_user
    
    return role_checker


# ==================== CONVENIENCE SHORTCUTS ====================

def get_current_admin(
    current_user: User = Depends(require_role("ADMIN"))
) -> User:
    """
    Shortcut dependency: Requires ADMIN role.
    
    Usage:
        @app.post("/users")
        async def create_user(
            current_user: User = Depends(get_current_admin)
        ):
            pass
    """
    return current_user


def get_current_storekeeper(
    current_user: User = Depends(require_role("STOREKEEPER"))
) -> User:
    """Shortcut dependency: Requires STOREKEEPER role"""
    return current_user


def get_current_accountant(
    current_user: User = Depends(require_role("ACCOUNTANT"))
) -> User:
    """Shortcut dependency: Requires ACCOUNTANT role"""
    return current_user


def get_current_admin_or_storekeeper(
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
) -> User:
    """Shortcut dependency: Requires ADMIN or STOREKEEPER role"""
    return current_user


def get_current_admin_or_accountant(
    current_user: User = Depends(require_role("ADMIN", "ACCOUNTANT"))
) -> User:
    """Shortcut dependency: Requires ADMIN or ACCOUNTANT role"""
    return current_user


# ==================== OPTIONAL AUTHENTICATION ====================

async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
    db: Session = Depends(get_db)
) -> Optional[User]:
    """
    Get current user if authenticated, otherwise return None.
    
    Useful for endpoints that work both with and without authentication.
    
    Usage:
        @app.get("/public-data")
        async def get_public_data(
            current_user: Optional[User] = Depends(get_current_user_optional)
        ):
            if current_user:
                return {"data": "private data"}
            return {"data": "public data"}
    """
    if not credentials:
        return None
    
    try:
        payload = verify_token(credentials.credentials)
        user_id = payload.get("sub")
        
        if not user_id:
            return None
        
        user = db.query(User).filter(User.id == int(user_id)).first()
        
        if not user or not user.is_active:
            return None
        
        return user
        
    except Exception:
        return None
