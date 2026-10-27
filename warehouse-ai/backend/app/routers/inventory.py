"""Inventory router."""
from fastapi import APIRouter

router = APIRouter()


@router.get("")
async def list_inventory():
    """List inventory - TODO: Implement"""
    return {"message": "List inventory - not yet implemented"}


@router.get("/transactions")
async def list_transactions():
    """List inventory transactions - TODO: Implement"""
    return {"message": "List transactions - not yet implemented"}
