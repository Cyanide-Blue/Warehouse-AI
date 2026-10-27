"""Suppliers router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.supplier import SupplierCreate, SupplierUpdate, SupplierResponse
from app.services.master_service import SupplierService
from app.auth.dependencies import get_current_user, require_role
from app.models import User
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Suppliers"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_suppliers(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all active suppliers"""
    try:
        service = SupplierService(db)
        suppliers = service.list_suppliers(skip=skip, limit=limit)
        
        return {
            "status": "success",
            "data": [SupplierResponse.from_orm(s) for s in suppliers],
            "pagination": {"skip": skip, "limit": limit, "count": len(suppliers)}
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("", response_model=dict)
async def create_supplier(
    supplier_data: SupplierCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER", "STAFF"))
):
    """Create new supplier"""
    try:
        service = SupplierService(db)
        supplier = service.create_supplier(
            code=supplier_data.code,
            name=supplier_data.name,
            contact_person=supplier_data.contact_person,
            phone=supplier_data.phone,
            email=supplier_data.email,
            address=supplier_data.address,
            city=supplier_data.city,
            country=supplier_data.country
        )
        logger.info(f"Supplier created: {supplier.code}")
        
        return {
            "status": "success",
            "message": "Supplier created successfully",
            "data": SupplierResponse.from_orm(supplier)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{supplier_id}", response_model=dict)
async def get_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get supplier by ID"""
    try:
        service = SupplierService(db)
        supplier = service.get_supplier_by_id(supplier_id)
        return {"status": "success", "data": SupplierResponse.from_orm(supplier)}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{supplier_id}", response_model=dict)
async def update_supplier(
    supplier_id: int,
    supplier_data: SupplierUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Update supplier"""
    try:
        service = SupplierService(db)
        supplier = service.update_supplier(supplier_id, **supplier_data.dict(exclude_unset=True))
        logger.info(f"Supplier updated: {supplier.code}")
        
        return {"status": "success", "message": "Supplier updated successfully", "data": SupplierResponse.from_orm(supplier)}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{supplier_id}", response_model=dict)
async def delete_supplier(
    supplier_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Delete supplier (soft delete)"""
    try:
        service = SupplierService(db)
        service.delete_supplier(supplier_id)
        logger.info(f"Supplier deleted: {supplier_id}")
        return {"status": "success", "message": "Supplier deleted successfully"}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
