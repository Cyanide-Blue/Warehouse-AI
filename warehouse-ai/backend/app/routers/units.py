"""Units router."""
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from app.database import get_db
from app.schemas.unit import UnitCreate, UnitUpdate, UnitResponse
from app.services.master_service import UnitService
from app.auth.dependencies import get_current_user, require_role
from app.models import User
from app.exceptions import AppException
import logging

router = APIRouter(tags=["Units"])
logger = logging.getLogger(__name__)


@router.get("", response_model=dict)
async def list_units(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all units"""
    try:
        service = UnitService(db)
        units = service.list_units(skip=skip, limit=limit)
        
        return {
            "status": "success",
            "data": [UnitResponse.from_orm(u) for u in units],
            "pagination": {"skip": skip, "limit": limit, "count": len(units)}
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.post("", response_model=dict)
async def create_unit(
    unit_data: UnitCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Create new unit"""
    try:
        service = UnitService(db)
        unit = service.create_unit(name=unit_data.name, abbreviation=unit_data.abbreviation)
        logger.info(f"Unit created: {unit.name}")
        
        return {
            "status": "success",
            "message": "Unit created successfully",
            "data": UnitResponse.from_orm(unit)
        }
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.get("/{unit_id}", response_model=dict)
async def get_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get unit by ID"""
    try:
        service = UnitService(db)
        unit = service.get_unit_by_id(unit_id)
        return {"status": "success", "data": UnitResponse.from_orm(unit)}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.put("/{unit_id}", response_model=dict)
async def update_unit(
    unit_id: int,
    unit_data: UnitUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN", "STOREKEEPER"))
):
    """Update unit"""
    try:
        service = UnitService(db)
        unit = service.update_unit(unit_id, name=unit_data.name, abbreviation=unit_data.abbreviation)
        logger.info(f"Unit updated: {unit.name}")
        
        return {"status": "success", "message": "Unit updated successfully", "data": UnitResponse.from_orm(unit)}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)


@router.delete("/{unit_id}", response_model=dict)
async def delete_unit(
    unit_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_role("ADMIN"))
):
    """Delete unit"""
    try:
        service = UnitService(db)
        service.delete_unit(unit_id)
        logger.info(f"Unit deleted: {unit_id}")
        return {"status": "success", "message": "Unit deleted successfully"}
    except AppException as e:
        raise HTTPException(status_code=e.status_code, detail=e.message)
