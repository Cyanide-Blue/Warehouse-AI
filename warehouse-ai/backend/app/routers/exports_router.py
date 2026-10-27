"""Export receipts router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.export_receipt import ExportReceiptCreate, ExportReceiptResponse
from app.services.receipt_service import ExportReceiptService
from app.auth.dependencies import get_current_user, require_role
from app.models import User
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Exports"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_export_receipts(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    status: str = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all export receipts with pagination"""
    try:
        service = ExportReceiptService(db)
        receipts = service.list_export_receipts(skip=skip, limit=limit, status=status)
        
        return {
            "status": "success",
            "data": [ExportReceiptResponse.from_orm(r) for r in receipts],
            "pagination": {"skip": skip, "limit": limit, "count": len(receipts)}
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("", response_model=dict)
async def create_export_receipt(
    receipt_data: ExportReceiptCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Create new export receipt"""
    try:
        service = ExportReceiptService(db)
        receipt = service.create_export_receipt(receipt_data, created_by_id=current_user.id)
        logger.info(f"Export receipt created: {receipt.receipt_code}")
        
        return {
            "status": "success",
            "message": "Export receipt created successfully",
            "data": ExportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{receipt_id}", response_model=dict)
async def get_export_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get export receipt by ID"""
    try:
        service = ExportReceiptService(db)
        receipt = service.get_export_receipt_by_id(receipt_id)
        
        return {
            "status": "success",
            "data": ExportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{receipt_id}/confirm", response_model=dict)
async def confirm_export_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Confirm export receipt and update stock"""
    try:
        service = ExportReceiptService(db)
        receipt = service.confirm_export_receipt(receipt_id, confirmed_by_id=current_user.id)
        logger.info(f"Export receipt confirmed: {receipt.receipt_code}")
        
        return {
            "status": "success",
            "message": "Export receipt confirmed successfully",
            "data": ExportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("/{receipt_id}/cancel", response_model=dict)
async def cancel_export_receipt(
    receipt_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Cancel export receipt"""
    try:
        service = ExportReceiptService(db)
        receipt = service.cancel_export_receipt(receipt_id)
        logger.info(f"Export receipt cancelled: {receipt.receipt_code}")
        
        return {
            "status": "success",
            "message": "Export receipt cancelled successfully",
            "data": ExportReceiptResponse.from_orm(receipt)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)

