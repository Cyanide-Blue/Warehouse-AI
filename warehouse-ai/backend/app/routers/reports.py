"""Reports router."""
from fastapi import APIRouter

router = APIRouter()


@router.get("/inventory")
async def get_inventory_report():
    """Get inventory report - TODO: Implement"""
    return {"message": "Inventory report - not yet implemented"}
