"""AI features router with real-time intelligence, Web Reading & Gemini Buyer Copilot."""
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session
from app.database import get_db
from app.auth.dependencies import get_current_user
from app.models import User, Product
from app.services.ai_service import AIService
from app.services.buyer_ai_service import BuyerAIService
from pydantic import BaseModel
from typing import Optional, List, Dict, Any

router = APIRouter()

class ChatRequest(BaseModel):
    message: str

class BuyerChatRequest(BaseModel):
    message: str
    url: Optional[str] = None
    history: Optional[List[Dict[str, Any]]] = None
    include_warehouse_data: Optional[bool] = True

class ReadWebRequest(BaseModel):
    url: str

class ApplyRecommendationRequest(BaseModel):
    product_id: int
    quantity: int
    supplier_id: Optional[int] = 1


@router.get("/status")
async def get_ai_status():
    """Kiểm tra trạng thái kết nối của AI và Web Reader."""
    return {
        "status": "online",
        "engine": "Google Gemini (gemini-3.1-flash-lite / gemini-3.5-flash)",
        "features": [
            "Đọc và bóc tách dữ liệu website trực tiếp",
            "Trợ lý tư vấn mua sắm & so sánh giá (Buyer Copilot)",
            "Đánh giá ưu/nhược điểm sản phẩm công nghệ",
            "Đối chiếu kho hàng & phân tích tồn kho thông minh"
        ]
    }


@router.post("/buyer-chat")
async def buyer_chat_copilot(
    request: BuyerChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trợ lý AI Mua Hàng & Đọc Web (Buyer Copilot):
    - Đọc nội dung từ URL website sản phẩm được gửi kèm hoặc nằm trong tin nhắn
    - Tư vấn mua hàng, phân tích cấu hình, bóc tách giá, cảnh báo rủi ro
    - Đối chiếu sản phẩm nội bộ trong kho nếu người dùng cần
    """
    try:
        warehouse_context = None
        if request.include_warehouse_data:
            # Lấy danh sách sản phẩm hiện có trong kho để AI có thể đối chiếu
            products = db.query(Product).filter(Product.is_active == True).limit(50).all()
            if products:
                prod_lines = [
                    f"- {p.name} (Mã: {p.code}): Tồn kho: {p.current_stock} cái, Mức tối thiểu: {p.minimum_stock}"
                    for p in products
                ]
                warehouse_context = "Sản phẩm hiện có trong kho:\n" + "\n".join(prod_lines)

        service = BuyerAIService()
        result = service.chat_for_buyer(
            message=request.message,
            provided_url=request.url,
            conversation_history=request.history,
            warehouse_context=warehouse_context
        )
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/read-web")
async def read_web_page_endpoint(
    request: ReadWebRequest,
    current_user: User = Depends(get_current_user)
):
    """
    Bóc tách trực tiếp tiêu đề, thông số, nội dung của bất kỳ link website nào.
    """
    try:
        service = BuyerAIService()
        data = service.fetch_web_page(request.url)
        return {
            "status": "success" if data.get("success") else "warning",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/analytics")
async def get_ai_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Phân tích toàn diện kho hàng: Health score, Khuyến nghị nhập hàng, Bất thường, Dự báo 30 ngày.
    """
    try:
        service = AIService(db)
        data = service.analyze_warehouse()
        return {
            "status": "success",
            "data": data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/chat")
async def ai_chat_copilot(
    request: ChatRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Trợ lý AI Kho Hàng tương tác hỏi đáp trực tiếp với cơ sở dữ liệu thời gian thực.
    """
    try:
        service = AIService(db)
        result = service.chat(request.message, current_user)
        return {
            "status": "success",
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/apply-recommendation")
async def apply_ai_recommendation(
    request: ApplyRecommendationRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Tự động tạo phiếu nhập kho (DRAFT) trực tiếp từ khuyến nghị của AI.
    """
    try:
        service = AIService(db)
        result = service.apply_recommendation(
            product_id=request.product_id,
            quantity=request.quantity,
            supplier_id=request.supplier_id or 1,
            current_user=current_user
        )
        return {
            "status": "success",
            "message": result["message"],
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Backward compatibility endpoints
@router.post("/inventory-report")
async def generate_inventory_report(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AIService(db)
    return {"status": "success", "data": service.analyze_warehouse()}


@router.post("/purchase-recommendation")
async def get_purchase_recommendation(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AIService(db)
    analysis = service.analyze_warehouse()
    return {"status": "success", "data": analysis["recommendations"]}


@router.post("/anomaly-summary")
async def get_anomaly_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    service = AIService(db)
    analysis = service.analyze_warehouse()
    return {"status": "success", "data": analysis["anomalies"]}
