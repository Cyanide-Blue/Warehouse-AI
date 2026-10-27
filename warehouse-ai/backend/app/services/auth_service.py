"""
Authentication service - handles login and user operations
"""
from sqlalchemy.orm import Session
from app.models import User, Role
from app.auth.security import hash_password, verify_password
from app.auth.jwt_handler import create_access_token
from app.exceptions import InvalidCredentialsException, DuplicateResourceException, ResourceNotFoundException
from app.config import ACCESS_TOKEN_EXPIRE_MINUTES
from datetime import timedelta
from typing import Optional

class AuthService:
    """Service for authentication operations"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def login(self, username: str, password: str) -> dict:
        """
        Authenticate user and generate JWT token
        
        Args:
            username: User's username
            password: User's password (plain text)
        
        Returns:
            dict with access_token, token_type, and user object
        
        Raises:
            InvalidCredentialsException: If username not found or password incorrect
        """
        # Find user by username
        user = self.db.query(User).filter(User.username == username).first()
        
        if not user:
            raise InvalidCredentialsException("Invalid username or password")
        
        # Verify password
        if not verify_password(password, user.password_hash):
            raise InvalidCredentialsException("Invalid username or password")
        
        # Check if user is active
        if not user.is_active:
            raise InvalidCredentialsException("User account is inactive")
        
        # Generate JWT token
        expires_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
        token = create_access_token(
            data={"sub": str(user.id)},
            expires_delta=expires_delta
        )
        
        return {
            "access_token": token,
            "token_type": "bearer",
            "user": user,
            "expires_in": ACCESS_TOKEN_EXPIRE_MINUTES * 60  # Convert to seconds
        }
    
    def create_user(self, username: str, email: str, full_name: str, password: str, role_id: int) -> User:
        """
        Create new user (admin only)
        
        Args:
            username: Unique username
            email: User's email
            full_name: User's full name
            password: User's password (will be hashed)
            role_id: User's role ID
        
        Returns:
            Created User object
        
        Raises:
            DuplicateResourceException: If username or email already exists
            ResourceNotFoundException: If role_id doesn't exist
        """
        # Check if username already exists
        existing_user = self.db.query(User).filter(User.username == username).first()
        if existing_user:
            raise DuplicateResourceException("User with this username already exists (field: username)")
        
        # Check if email already exists
        existing_email = self.db.query(User).filter(User.email == email).first()
        if existing_email:
            raise DuplicateResourceException("User with this email already exists (field: email)")
        
        # Check if role exists
        role = self.db.query(Role).filter(Role.id == role_id).first()
        if not role:
            raise ResourceNotFoundException(f"Role not found (ID: {role_id})")
        
        # Hash password
        hashed_password = hash_password(password)
        
        # Create new user
        new_user = User(
            username=username,
            email=email,
            full_name=full_name,
            password_hash=hashed_password,
            role_id=role_id,
            is_active=True
        )
        
        self.db.add(new_user)
        self.db.commit()
        self.db.refresh(new_user)
        
        return new_user
    
    def get_user_by_id(self, user_id: int) -> Optional[User]:
        """
        Get user by ID
        
        Args:
            user_id: User's ID
        
        Returns:
            User object or None if not found
        """
        return self.db.query(User).filter(User.id == user_id).first()
    
    def get_user_by_username(self, username: str) -> Optional[User]:
        """
        Get user by username
        
        Args:
            username: User's username
        
        Returns:
            User object or None if not found
        """
        return self.db.query(User).filter(User.username == username).first()
    
    def update_password(self, user_id: int, old_password: str, new_password: str) -> User:
        """
        Update user's password
        
        Args:
            user_id: User's ID
            old_password: Current password (plain text)
            new_password: New password (will be hashed)
        
        Returns:
            Updated User object
        
        Raises:
            ResourceNotFoundException: If user not found
            InvalidCredentialsException: If old password is incorrect
        """
        user = self.db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise ResourceNotFoundException(f"User not found (ID: {user_id})")
        
        # Verify old password
        if not verify_password(old_password, user.password_hash):
            raise InvalidCredentialsException("Current password is incorrect")
        
        # Hash and set new password
        user.password_hash = hash_password(new_password)
        
        self.db.commit()
        self.db.refresh(user)
        
        return user
