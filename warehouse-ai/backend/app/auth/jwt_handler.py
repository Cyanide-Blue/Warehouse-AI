"""
JWT token handling for authentication.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
from jose import JWTError, jwt

from ..config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from ..exceptions import InvalidTokenException, TokenExpiredException


def create_access_token(
    data: Dict[str, Any],
    expires_delta: Optional[timedelta] = None
) -> str:
    """
    Create JWT access token.
    
    Args:
        data: Payload data to encode (e.g., {"sub": "user_id"})
        expires_delta: Token expiration time delta. Default: ACCESS_TOKEN_EXPIRE_MINUTES
    
    Returns:
        Encoded JWT token string
    
    Example:
        token = create_access_token({"sub": "1"})
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=ACCESS_TOKEN_EXPIRE_MINUTES
        )
    
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM
    )
    
    return encoded_jwt


def verify_token(token: str) -> Dict[str, Any]:
    """
    Verify and decode JWT token.
    
    Args:
        token: JWT token string
    
    Returns:
        Decoded payload
    
    Raises:
        InvalidTokenException: If token is invalid
        TokenExpiredException: If token has expired
    
    Example:
        payload = verify_token(token)
        user_id = payload.get("sub")
    """
    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )
        return payload
        
    except JWTError as e:
        if "expired" in str(e).lower():
            raise TokenExpiredException()
        raise InvalidTokenException(str(e))


def get_token_user_id(token: str) -> int:
    """
    Extract user ID from token.
    
    Args:
        token: JWT token
    
    Returns:
        User ID
    
    Raises:
        InvalidTokenException
    """
    payload = verify_token(token)
    user_id = payload.get("sub")
    
    if not user_id:
        raise InvalidTokenException("Token does not contain user ID")
    
    return int(user_id)
