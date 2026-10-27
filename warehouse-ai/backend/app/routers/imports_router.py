"""Import receipts router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.import_receipt import ImportReceiptCreate, ImportReceiptResponse
from app.services.receipt_service import ImportReceiptService
from app.auth.dependencies import get_current_user, require_role
from app.models import User
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Imports"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_import_receipts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all import receipts with pagination"""
    try:
        service = ImportReceiptService(db)
        receipts = service.list_import_receipts(skip=skip, limit=limit, status=status)
        
        return {
            "status": "success",
            "data": [ImportReceiptResponse.from_orm(r) for r in receipts],
            "pagination": {"skip": skip, "limit": limit, "count": len(receipts)}
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("", response_model=dict)
async def create_import_receipt(
    receipt_data: ImportReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Create new import receipt"""
    try:
        service = ImportReceiptService(db)
        receipt = service.create_import_receipt(receipt_data, created_by_id=current_user.id)
        logger.info(f"Import receipt created: {receipt.receipt_code}")
        
        return {
            "status": "success",
            "message": "Import receipt created successfully",
            "data": ImportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{receipt_id}", response_model=dict)
async def get_import_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get import receipt by ID"""
    try:
        service = ImportReceiptService(db)
        receipt = service.get_import_receipt_by_id(receipt_id)
        
        return {
            "status": "success",
            "data": ImportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{receipt_id}/confirm", response_model=dict)
async def confirm_import_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Confirm import receipt and update stock"""
    try:
        service = ImportReceiptService(db)
        receipt = service.confirm_import_receipt(receipt_id, confirmed_by_id=current_user.id)
        logger.info(f"Import receipt confirmed: {receipt.receipt_code}")
        
        return {
            "status": "success",
            "message": "Import receipt confirmed successfully",
            "data": ImportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{receipt_id}/cancel", response_model=dict)
async def cancel_import_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Cancel import receipt"""
    try:
        service = ImportReceiptService(db)
        receipt = service.cancel_import_receipt(receipt_id)
        logger.info(f"Import receipt cancelled: {receipt.receipt_code}")
        
        return {
            "status": "success",
            "message": "Import receipt cancelled successfully",
            "data": ImportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

