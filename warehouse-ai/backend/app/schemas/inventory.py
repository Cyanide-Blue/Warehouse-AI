"""
Inventory schemas for monitoring stock levels
"""
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class InventoryTransactionResponse(BaseModel):
    """Inventory transaction response schema"""
    id: int
    product_id: int
    transaction_type: str  # IMPORT or EXPORT
    quantity: int
    old_stock: int
    new_stock: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

class InventoryStatusResponse(BaseModel):
    """Current inventory status for a product"""
    product_id: int
    product_code: str
    product_name: str
    unit_name: str
    current_stock: int
    minimum_stock: int
    reorder_quantity: Optional[int] = None
    below_minimum: bool
    
    class Config:
        from_attributes = True

class InventoryLowStockResponse(BaseModel):
    """Low stock alert response"""
    product_id: int
    product_code: str
    product_name: str
    current_stock: int
    minimum_stock: int
    below_minimum_by: int  # minimum - current

class InventoryDetailResponse(BaseModel):
    """Detailed inventory information for a product"""
    product_id: int
    product_code: str
    product_name: str
    current_stock: int
    minimum_stock: int
    last_import: Optional[datetime] = None
    last_export: Optional[datetime] = None
    days_in_stock: Optional[int] = None
    export_7days: int = 0
    export_30days: int = 0
