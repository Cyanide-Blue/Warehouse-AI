"""Categories router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryUpdate, CategoryResponse
from app.services.master_service import CategoryService
from app.auth.dependencies import get_current_user, require_role
from app.models import User
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Categories"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_categories(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all active categories"""
    try:
        service = CategoryService(db)
        categories = service.list_categories(skip=skip, limit=limit)
        
        return {
            "status": "success",
            "data": [CategoryResponse.from_orm(c) for c in categories],
            "pagination": {"skip": skip, "limit": limit, "count": len(categories)}
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("", response_model=dict)
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Create new category"""
    try:
        service = CategoryService(db)
        category = service.create_category(name=category_data.name, description=category_data.description)
        logger.info(f"Category created: {category.name}")
        
        return {
            "status": "success",
            "message": "Category created successfully",
            "data": CategoryResponse.from_orm(category)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{category_id}", response_model=dict)
async def get_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get category by ID"""
    try:
        service = CategoryService(db)
        category = service.get_category_by_id(category_id)
        return {"status": "success", "data": CategoryResponse.from_orm(category)}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{category_id}", response_model=dict)
async def update_category(
    category_id: int,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Update category"""
    try:
        service = CategoryService(db)
        category = service.update_category(category_id, name=category_data.name, description=category_data.description)
        logger.info(f"Category updated: {category.name}")
        
        return {"status": "success", "message": "Category updated successfully", "data": CategoryResponse.from_orm(category)}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{category_id}", response_model=dict)
async def delete_category(
    category_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Delete category (soft delete)"""
    try:
        service = CategoryService(db)
        service.delete_category(category_id)
        logger.info(f"Category deleted: {category_id}")
        return {"status": "success", "message": "Category deleted successfully"}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
