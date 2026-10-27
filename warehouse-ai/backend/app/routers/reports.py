"""Reports and Analytics router."""
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
from decimal import Decimal
from typing import List, Dict, Any, Optional

from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models import (
    User, Product, Category, ImportReceipt, ImportReceiptItem,
    ExportReceipt, ExportReceiptItem, InventoryTransaction
)

router = APIRouter(tags=["Reports"])


@router.get("/analytics", response_model=dict)
async def get_analytics_report(
    timeframe: str = Query("WEEK", description="WEEK, MONTH, or QUARTER"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get comprehensive warehouse analytics:
    - Inbound vs Outbound trend
    - Category distribution
    - Top exported products
    - Executive KPI summary
    """
    now = datetime.now()
    
    # 1. Calculate time window
    timeframe_upper = timeframe.upper()
    if timeframe_upper == "MONTH":
        days_back = 30
        step_days = 5
    elif timeframe_upper == "QUARTER":
        days_back = 90
        step_days = 15
    else:  # WEEK
        days_back = 7
        step_days = 1

    start_date = now - timedelta(days=days_back)

    # 2. Inbound vs Outbound Trend
    trend_data = []
    vietnamese_days = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

    # Pre-fetch receipts in window
    imports = db.query(ImportReceipt).filter(
        ImportReceipt.receipt_date >= start_date.date()
    ).all()
    
    exports = db.query(ExportReceipt).filter(
        ExportReceipt.receipt_date >= start_date.date()
    ).all()

    # Build buckets
    if timeframe_upper == "WEEK":
        for i in range(6, -1, -1):
            target_date = (now - timedelta(days=i)).date()
            weekday_idx = target_date.weekday()
            day_label = f"{vietnamese_days[weekday_idx]} ({target_date.strftime('%d/%m')})"

            # Calculate inbound qty for this day
            day_inbound_qty = 0
            day_inbound_val = 0
            for imp in imports:
                if imp.receipt_date == target_date:
                    day_inbound_val += float(imp.total_amount or 0)
                    for item in imp.items:
                        day_inbound_qty += item.quantity

            # Calculate outbound qty for this day
            day_outbound_qty = 0
            for exp in exports:
                if exp.receipt_date == target_date:
                    for item in exp.items:
                        day_outbound_qty += item.quantity

            trend_data.append({
                "label": day_label,
                "date": target_date.isoformat(),
                "inbound": day_inbound_qty,
                "outbound": day_outbound_qty,
                "inbound_val": day_inbound_val
            })
    else:
        # Group by periods for Month or Quarter
        num_buckets = 6
        bucket_days = days_back // num_buckets
        for b in range(num_buckets):
            b_start = (now - timedelta(days=(num_buckets - b) * bucket_days)).date()
            b_end = (now - timedelta(days=(num_buckets - b - 1) * bucket_days)).date()
            label = f"Đợt {b+1} ({b_start.strftime('%d/%m')})"

            b_inbound = 0
            b_outbound = 0
            b_val = 0

            for imp in imports:
                if b_start <= imp.receipt_date <= b_end:
                    b_val += float(imp.total_amount or 0)
                    for item in imp.items:
                        b_inbound += item.quantity

            for exp in exports:
                if b_start <= exp.receipt_date <= b_end:
                    for item in exp.items:
                        b_outbound += item.quantity

            trend_data.append({
                "label": label,
                "date": b_start.isoformat(),
                "inbound": b_inbound,
                "outbound": b_outbound,
                "inbound_val": b_val
            })

    # 3. Category Distribution
    categories = db.query(Category).all()
    products = db.query(Product).filter(Product.is_active == True).all()

    total_units_all = sum(p.current_stock for p in products) or 1
    palette = ["#38bdf8", "#10b981", "#f59e0b", "#a855f7", "#ec4899", "#6366f1", "#14b8a6"]

    category_stats = []
    for idx, cat in enumerate(categories):
        cat_prods = [p for p in products if p.category_id == cat.id]
        cat_stock = sum(p.current_stock for p in cat_prods)
        percentage = round((cat_stock / total_units_all) * 100, 1)

        category_stats.append({
            "id": cat.id,
            "name": cat.name,
            "sku_count": len(cat_prods),
            "total_stock": cat_stock,
            "percentage": percentage,
            "color": palette[idx % len(palette)]
        })

    # Sort categories by total stock descending
    category_stats.sort(key=lambda x: x["total_stock"], reverse=True)

    # 4. Top Exported Products
    # Query aggregated exports
    top_export_rows = db.query(
        ExportReceiptItem.product_id,
        func.sum(ExportReceiptItem.quantity).label("total_exported")
    ).group_by(ExportReceiptItem.product_id).order_by(
        func.sum(ExportReceiptItem.quantity).desc()
    ).limit(10).all()

    top_exported_list = []
    export_map = {row.product_id: int(row.total_exported) for row in top_export_rows}
    
    # If not enough exported rows, supplement with all products sorted by activity
    max_exported_qty = max(list(export_map.values()) + [1])

    for p in products:
        exported_qty = export_map.get(p.id, 0)
        # Even if 0, we can show active products with their current stock
        top_exported_list.append({
            "id": p.id,
            "code": p.code,
            "name": p.name,
            "category_name": p.category.name if p.category else "Chưa phân loại",
            "unit_name": p.unit.name if p.unit else "Cái",
            "total_exported": exported_qty,
            "current_stock": p.current_stock,
            "minimum_stock": p.minimum_stock,
            "status": "Hết hàng" if p.current_stock == 0 else ("Sắp hết" if p.current_stock < p.minimum_stock else "Ổn định"),
            "percentage_of_max": round((exported_qty / max_exported_qty) * 100, 1)
        })

    # Sort: highest exported first, then highest current_stock
    top_exported_list.sort(key=lambda x: (x["total_exported"], x["current_stock"]), reverse=True)
    top_exported_list = top_exported_list[:8]

    # 5. Executive KPIs
    total_stock_count = sum(p.current_stock for p in products)
    low_stock_prods = [p for p in products if p.current_stock < p.minimum_stock]
    out_of_stock_prods = [p for p in products if p.current_stock == 0]
    healthy_prods = [p for p in products if p.current_stock >= p.minimum_stock and p.current_stock > 0]
    
    total_inbound_qty = sum(
        item.quantity for imp in imports for item in imp.items
    )
    total_outbound_qty = sum(
        item.quantity for exp in exports for item in exp.items
    )
    total_inbound_val = sum(float(imp.total_amount or 0) for imp in imports)

    health_rate = round((len(healthy_prods) / (len(products) or 1)) * 100, 1)

    return {
        "status": "success",
        "data": {
            "timeframe": timeframe_upper,
            "kpi_summary": {
                "total_stock": total_stock_count,
                "total_skus": len(products),
                "total_categories": len(categories),
                "inbound_qty": total_inbound_qty,
                "outbound_qty": total_outbound_qty,
                "inbound_total_val": total_inbound_val,
                "low_stock_count": len(low_stock_prods),
                "out_of_stock_count": len(out_of_stock_prods),
                "healthy_count": len(healthy_prods),
                "health_rate": health_rate
            },
            "inbound_outbound_trend": trend_data,
            "category_distribution": category_stats,
            "top_exported": top_exported_list
        }
    }


@router.get("/inventory", response_model=dict)
async def get_inventory_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get full inventory status breakdown"""
    products = db.query(Product).filter(Product.is_active == True).all()
    categories = db.query(Category).all()

    report_items = []
    for p in products:
        status_text = "Hết hàng" if p.current_stock == 0 else ("Cần nhập thêm" if p.current_stock < p.minimum_stock else "Đủ tồn kho")
        report_items.append({
            "code": p.code,
            "name": p.name,
            "category": p.category.name if p.category else "",
            "unit": p.unit.name if p.unit else "",
            "current_stock": p.current_stock,
            "minimum_stock": p.minimum_stock,
            "reorder_quantity": p.reorder_quantity or 0,
            "status": status_text
        })

    return {
        "status": "success",
        "total_products": len(products),
        "data": report_items
    }
