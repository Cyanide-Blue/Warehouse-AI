"""Products router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.services.product_service import ProductService
from app.auth.dependencies import get_current_user, require_role
from app.models import User
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Products"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    is_active: bool = Query(True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List all products with pagination
    
    Args:
        skip: Number of records to skip
        limit: Maximum number of records to return
        is_active: Filter by active status
    
    Returns:
        List of products
    """
    try:
        service = ProductService(db)
        products = service.list_products(skip=skip, limit=limit, is_active=is_active)
        
        return {
            "status": "success",
            "data": [ProductResponse.from_orm(p) for p in products],
            "pagination": {
                "skip": skip,
                "limit": limit,
                "count": len(products)
            }
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("", response_model=dict)
async def create_product(
    product_data: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """
    Create new product
    
    Args:
        product_data: Product creation data
    
    Returns:
        Created product
    """
    try:
        service = ProductService(db)
        product = service.create_product(product_data)
        logger.info(f"Product created: {product.code}")
        
        return {
            "status": "success",
            "message": "Product created successfully",
            "data": ProductResponse.from_orm(product)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{product_id}", response_model=dict)
async def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get product by ID
    
    Args:
        product_id: Product ID
    
    Returns:
        Product details
    """
    try:
        service = ProductService(db)
        product = service.get_product_by_id(product_id)
        
        return {
            "status": "success",
            "data": ProductResponse.from_orm(product)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{product_id}", response_model=dict)
async def update_product(
    product_id: int,
    product_data: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """
    Update product
    
    Args:
        product_id: Product ID
        product_data: Product update data
    
    Returns:
        Updated product
    """
    try:
        service = ProductService(db)
        product = service.update_product(product_id, product_data)
        logger.info(f"Product updated: {product.code}")
        
        return {
            "status": "success",
            "message": "Product updated successfully",
            "data": ProductResponse.from_orm(product)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{product_id}", response_model=dict)
async def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """
    Delete (soft delete) product
    
    Args:
        product_id: Product ID
    
    Returns:
        Success message
    """
    try:
        service = ProductService(db)
        service.delete_product(product_id)
        logger.info(f"Product deleted: {product_id}")
        
        return {
            "status": "success",
            "message": "Product deleted successfully"
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/stock/low-stock", response_model=dict)
async def get_low_stock_products(
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get products below minimum stock level
    
    Args:
        limit: Maximum number of records to return
    
    Returns:
        List of low-stock products
    """
    try:
        service = ProductService(db)
        products = service.get_low_stock_products(limit=limit)
        
        return {
            "status": "success",
            "data": [ProductResponse.from_orm(p) for p in products],
            "pagination": {
                "count": len(products)
            }
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
