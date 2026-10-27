"""
Authentication module - JWT and password handling.
"""
from .jwt_handler import create_access_token, verify_token, get_token_user_id
from .security import hash_password, verify_password
from .dependencies import (
    get_current_user,
    require_role,
    get_current_admin,
    get_current_storekeeper,
    get_current_accountant,
    get_current_user_optional
)

__all__ = [
    "create_access_token",
    "verify_token",
    "get_token_user_id",
    "hash_password",
    "verify_password",
    "get_current_user",
    "require_role",
    "get_current_admin",
    "get_current_storekeeper",
    "get_current_accountant",
    "get_current_user_optional"
]
