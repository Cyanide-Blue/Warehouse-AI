"""
Custom exceptions for the warehouse management system.
"""
from typing import Optional, Any


class AppException(Exception):
    """Base application exception"""
    
    def __init__(
        self,
        message: str,
        status_code: int = 400,
        error_code: str = "BAD_REQUEST",
        data: Optional[Any] = None
    ):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code
        self.data = data
        super().__init__(self.message)


# ==================== AUTHENTICATION EXCEPTIONS ====================

class UnauthorizedException(AppException):
    """401 - Unauthorized"""
    def __init__(self, message: str = "Unauthorized"):
        super().__init__(message, 401, "UNAUTHORIZED")


class InvalidCredentialsException(AppException):
    """401 - Invalid credentials"""
    def __init__(self, message: str = "Invalid username or password"):
        super().__init__(message, 401, "INVALID_CREDENTIALS")


class TokenExpiredException(AppException):
    """401 - Token expired"""
    def __init__(self, message: str = "Token has expired"):
        super().__init__(message, 401, "TOKEN_EXPIRED")


class InvalidTokenException(AppException):
    """401 - Invalid token"""
    def __init__(self, message: str = "Invalid token"):
        super().__init__(message, 401, "INVALID_TOKEN")


class ForbiddenException(AppException):
    """403 - Forbidden"""
    def __init__(self, message: str = "Forbidden"):
        super().__init__(message, 403, "FORBIDDEN")


# ==================== RESOURCE EXCEPTIONS ====================

class ResourceNotFoundException(AppException):
    """404 - Resource not found"""
    def __init__(self, resource: str = "Resource", resource_id: Any = None):
        msg = f"{resource} not found"
        if resource_id:
            msg += f" (ID: {resource_id})"
        super().__init__(msg, 404, "NOT_FOUND")


class DuplicateResourceException(AppException):
    """409 - Resource already exists"""
    def __init__(self, resource: str = "Resource", field: str = None):
        msg = f"{resource} already exists"
        if field:
            msg += f" (field: {field})"
        super().__init__(msg, 409, "DUPLICATE_RESOURCE")


# ==================== BUSINESS LOGIC EXCEPTIONS ====================

class InsufficientStockException(AppException):
    """400 - Insufficient stock"""
    def __init__(self, product_code: str, current_stock: int, required: int):
        msg = f"Insufficient stock for {product_code}: current={current_stock}, required={required}"
        super().__init__(msg, 400, "INSUFFICIENT_STOCK", {
            "product_code": product_code,
            "current_stock": current_stock,
            "required": required
        })


class InvalidReceiptStatusException(AppException):
    """400 - Invalid receipt status"""
    def __init__(self, receipt_code: str, current_status: str, action: str):
        msg = f"Cannot {action} receipt {receipt_code} with status {current_status}"
        super().__init__(msg, 400, "INVALID_RECEIPT_STATUS")


class TransactionFailedException(AppException):
    """400 - Transaction failed"""
    def __init__(self, message: str = "Transaction failed"):
        super().__init__(message, 400, "TRANSACTION_FAILED")


class InvalidOperationException(AppException):
    """400 - Invalid operation"""
    def __init__(self, message: str = "Invalid operation"):
        super().__init__(message, 400, "INVALID_OPERATION")



# ==================== VALIDATION EXCEPTIONS ====================

class ValidationException(AppException):
    """400 - Validation error"""
    def __init__(self, message: str, field: str = None):
        super().__init__(message, 400, "VALIDATION_ERROR", {"field": field})


class InvalidQuantityException(AppException):
    """400 - Invalid quantity"""
    def __init__(self, message: str = "Quantity must be greater than 0"):
        super().__init__(message, 400, "INVALID_QUANTITY")


# ==================== EXTERNAL SERVICE EXCEPTIONS ====================

class OpenAIException(AppException):
    """500 - OpenAI API error"""
    def __init__(self, message: str = "OpenAI API error"):
        super().__init__(message, 500, "OPENAI_ERROR")


class ExternalServiceException(AppException):
    """500 - External service error"""
    def __init__(self, service_name: str, message: str = None):
        msg = f"{service_name} service error"
        if message:
            msg += f": {message}"
        super().__init__(msg, 500, "EXTERNAL_SERVICE_ERROR")
