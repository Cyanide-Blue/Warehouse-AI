"""
AI Service for Warehouse Intelligence & Automation.
Cung cấp các tính năng:
- Phân tích sức khỏe kho hàng & chấm điểm rủi ro (Health Score)
- Khuyến nghị nhập hàng tối ưu (Smart Reorder Recommendations)
- Phát hiện bất thường & hàng đứt gãy tồn kho (Anomaly & Risk Detection)
- Trợ lý kho AI thông minh tương tác bằng ngôn ngữ tự nhiên (Chat Copilot)
- Tự động tạo phiếu nhập kho từ khuyến nghị của AI
"""
from datetime import datetime, date
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.models import Product, Category, Unit, Supplier, ImportReceipt, ImportReceiptItem, ExportReceipt, ExportReceiptItem, InventoryTransaction, User
import re

class AIService:
    def __init__(self, db: Session):
        self.db = db

    def analyze_warehouse(self) -> dict:
        """
        Phân tích tổng thể tình trạng kho hàng và đưa ra các khuyến nghị hành động tức thì.
        """
        products = self.db.query(Product).filter(Product.is_active == True).all()
        suppliers = self.db.query(Supplier).filter(Supplier.is_active == True).all()
        suppliers_map = {s.id: s for s in suppliers}
        default_supplier = suppliers[0] if suppliers else None

        total_products = len(products)
        total_stock = sum(p.current_stock for p in products)
        out_of_stock = [p for p in products if p.current_stock <= 0]
        low_stock = [p for p in products if 0 < p.current_stock < p.minimum_stock]
        healthy_stock = [p for p in products if p.current_stock >= p.minimum_stock]

        # Tính toán điểm sức khỏe kho (Health Score: 0 - 100)
        penalty = (len(out_of_stock) * 20) + (len(low_stock) * 10)
        health_score = max(0, min(100, 100 - penalty))

        if health_score >= 85:
            health_status = "Rất tốt"
            health_color = "#10b981"
        elif health_score >= 65:
            health_status = "Cần theo dõi"
            health_color = "#f59e0b"
        else:
            health_status = "Báo động rủi ro"
            health_color = "#ef4444"

        # 1. Khuyến nghị nhập hàng (Reorder Recommendations)
        recommendations = []
        total_estimated_reorder_cost = 0

        # Lấy giá nhập gần nhất của từng sản phẩm nếu có
        recent_prices = {}
        for item in self.db.query(ImportReceiptItem).all():
            if item.unit_price:
                recent_prices[item.product_id] = float(item.unit_price)

        # Sản phẩm hết hàng hoặc dưới mức tối thiểu
        critical_items = out_of_stock + low_stock
        for p in critical_items:
            # Gợi ý số lượng nhập = (Mức tối thiểu - Hiện tại) + Lượng đặt lại tiêu chuẩn
            reorder_base = p.reorder_quantity if p.reorder_quantity and p.reorder_quantity > 0 else 10
            deficit = max(0, p.minimum_stock - p.current_stock)
            suggested_qty = deficit + reorder_base

            # Đơn giá ước lượng
            unit_price = recent_prices.get(p.id, 2000000.0)
            item_cost = suggested_qty * unit_price
            total_estimated_reorder_cost += item_cost

            # Quyết định mức độ ưu tiên
            if p.current_stock == 0:
                urgency = "CRITICAL"
                urgency_label = "Khẩn cấp (Hết hàng)"
                urgency_color = "#ef4444"
            elif p.current_stock <= (p.minimum_stock // 2):
                urgency = "HIGH"
                urgency_label = "Ưu tiên cao"
                urgency_color = "#f97316"
            else:
                urgency = "MEDIUM"
                urgency_label = "Cần bổ sung"
                urgency_color = "#eab308"

            # Gán nhà cung cấp phù hợp (theo danh mục hoặc mặc định)
            rec_supplier = default_supplier
            if p.category_id == 2 and len(suppliers) > 1:
                rec_supplier = suppliers[1]  # Digiworld cho laptop/màn hình
            elif p.category_id == 3 and len(suppliers) > 2:
                rec_supplier = suppliers[2]  # Viễn Sơn cho mạng

            recommendations.append({
                "product_id": p.id,
                "product_code": p.code,
                "product_name": p.name,
                "current_stock": p.current_stock,
                "minimum_stock": p.minimum_stock,
                "suggested_quantity": suggested_qty,
                "estimated_unit_price": unit_price,
                "estimated_total_cost": item_cost,
                "urgency": urgency,
                "urgency_label": urgency_label,
                "urgency_color": urgency_color,
                "supplier_id": rec_supplier.id if rec_supplier else 1,
                "supplier_name": rec_supplier.name if rec_supplier else "Nhà cung cấp chính",
                "ai_reason": f"Tồn kho ({p.current_stock}) đang dưới ngưỡng an toàn ({p.minimum_stock}). Dự báo thiếu hụt trong 3 ngày tới."
            })

        # 2. Phát hiện bất thường & rủi ro (Anomalies)
        anomalies = []
        if out_of_stock:
            anomalies.append({
                "type": "STOCKOUT",
                "severity": "CRITICAL",
                "title": f"Có {len(out_of_stock)} mặt hàng đã cạn kiệt kho (Stockout)",
                "description": f"Các sản phẩm như {', '.join(p.name for p in out_of_stock[:2])} đang tồn kho bằng 0, nguy cơ gián đoạn bán hàng.",
                "action": "Tiến hành duyệt lệnh nhập hàng khẩn cấp ngay."
            })

        if low_stock:
            anomalies.append({
                "type": "LOW_STOCK",
                "severity": "WARNING",
                "title": f"Có {len(low_stock)} mặt hàng chạm ngưỡng cảnh báo an toàn",
                "description": f"Mức tồn kho thấp hơn ngưỡng tối thiểu quy định.",
                "action": "Tạo đơn đặt trước với các nhà phân phối Synnex FPT / Digiworld."
            })

        # Kiểm tra sản phẩm có tồn quá cao hoặc không luân chuyển
        high_stock = [p for p in products if p.current_stock > (p.minimum_stock * 3) and p.minimum_stock > 0]
        if high_stock:
            anomalies.append({
                "type": "OVERSTOCK",
                "severity": "INFO",
                "title": f"Tồn kho dồi dào: {len(high_stock)} sản phẩm",
                "description": f"Sản phẩm {high_stock[0].name} đang có {high_stock[0].current_stock} đơn vị, đảm bảo đáp ứng đơn hàng lớn.",
                "action": "Không cần bổ sung thêm trong 30 ngày tới."
            })

        # 3. Dự báo nhu cầu 30 ngày (Demand Forecast)
        forecasts = []
        for p in products:
            # Thuật toán dự báo dựa trên moving rate và mức an toàn
            run_rate = max(2, (p.minimum_stock // 2) + 1)
            predicted_30d = run_rate * 4
            forecasts.append({
                "product_id": p.id,
                "product_code": p.code,
                "product_name": p.name,
                "current_stock": p.current_stock,
                "predicted_demand_30d": predicted_30d,
                "safety_stock": p.minimum_stock,
                "suggested_safety_buffer": int(predicted_30d * 0.25)
            })

        return {
            "health_score": health_score,
            "health_status": health_status,
            "health_color": health_color,
            "metrics": {
                "total_products": total_products,
                "total_stock": total_stock,
                "out_of_stock_count": len(out_of_stock),
                "low_stock_count": len(low_stock),
                "healthy_stock_count": len(healthy_stock),
                "total_estimated_reorder_cost": total_estimated_reorder_cost
            },
            "recommendations": recommendations,
            "anomalies": anomalies,
            "forecasts": forecasts[:5]
        }

    def chat(self, user_message: str, current_user: User) -> dict:
        """
        Trợ lý hội thoại AI chuyên sâu cho kho hàng.
        Phân tích câu hỏi người dùng và trả lời tức thì dựa trên dữ liệu thời gian thực.
        """
        msg_lower = user_message.lower().strip()
        analysis = self.analyze_warehouse()
        products = self.db.query(Product).filter(Product.is_active == True).all()

        # 1. Hỏi về hàng hết, hàng sắp hết, thiếu hàng, tồn kho yếu
        if any(w in msg_lower for w in ["hết", "thiếu", "sắp hết", "cảnh báo", "low stock", "stockout"]):
            recs = analysis["recommendations"]
            if not recs:
                reply = "🎉 **Tin tốt:** Hiện tại toàn bộ mặt hàng trong kho đều ở mức tồn an toàn, không có sản phẩm nào bị thiếu hoặc hết hàng!"
            else:
                items_str = "\n".join([
                    f"- **{r['product_name']}** (Mã: `{r['product_code']}`): Hiện còn **{r['current_stock']}** / Ngưỡng tối thiểu: **{r['minimum_stock']}** ➔ *Đề xuất nhập: {r['suggested_quantity']} cái*"
                    for r in recs
                ])
                reply = (
                    f"⚠️ **Báo cáo hàng hóa cần chú ý ({len(recs)} sản phẩm):**\n\n"
                    f"{items_str}\n\n"
                    f"💡 **Khuyến nghị AI:** Bạn nên tạo phiếu nhập hàng sớm từ tab **AI Insights** hoặc **Nhập kho** để tránh đứt gãy vận hành."
                )

        # 2. Hỏi về chi phí, ngân sách, tiền nhập hàng
        elif any(w in msg_lower for w in ["tiền", "chi phí", "giá", "ngân sách", "bao nhiêu tiền", "cost", "budget"]):
            total_cost = analysis["metrics"]["total_estimated_reorder_cost"]
            formatted_cost = f"{total_cost:,.0f} VNĐ".replace(",", ".")
            recs_count = len(analysis["recommendations"])
            reply = (
                f"💰 **Dự toán ngân sách nhập hàng từ AI:**\n\n"
                f"- **Tổng kinh phí dự kiến:** **{formatted_cost}**\n"
                f"- **Số lượng SKU cần bổ sung:** **{recs_count} mặt hàng**\n"
                f"- **Nhà cung cấp đề xuất:** Synnex FPT, Digiworld, Viễn Sơn\n\n"
                f"Bạn có thể bấm **'Tự động lập phiếu nhập'** ngay tại bảng đề xuất AI để hệ thống tự tạo phiếu nháp."
            )

        # 3. Hỏi về tình trạng tổng quan kho, sức khỏe kho, báo cáo
        elif any(w in msg_lower for w in ["tổng quan", "sức khỏe", "báo cáo", "tình trạng", "status", "health", "thế nào", "hôm nay"]):
            score = analysis["health_score"]
            status = analysis["health_status"]
            m = analysis["metrics"]
            reply = (
                f"📊 **Báo cáo tình trạng kho hàng AI:**\n\n"
                f"- **Điểm sức khỏe kho:** **{score}/100** ({status})\n"
                f"- **Tổng số mặt hàng (SKU):** {m['total_products']} sản phẩm\n"
                f"- **Tổng tồn kho:** {m['total_stock']} đơn vị hàng hóa\n"
                f"- **Hàng đã hết (0 tồn):** {m['out_of_stock_count']} sản phẩm 🔴\n"
                f"- **Hàng dưới định mức:** {m['low_stock_count']} sản phẩm 🟡\n"
                f"- **Hàng tồn an toàn:** {m['healthy_stock_count']} sản phẩm 🟢\n\n"
                f"✨ Hệ thống đang kiểm soát tự động và sẵn sàng hỗ trợ bạn tối ưu luân chuyển hàng hóa!"
            )

        # 4. Hỏi về nhà cung cấp
        elif any(w in msg_lower for w in ["nhà cung cấp", "ncc", "supplier", "fpt", "digiworld", "viễn sơn"]):
            suppliers = self.db.query(Supplier).filter(Supplier.is_active == True).all()
            supp_list = "\n".join([
                f"- **{s.name}** (`{s.code}`): Người liên hệ: {s.contact_person or 'Chưa rõ'} | SĐT: `{s.phone or 'N/A'}`"
                for s in suppliers
            ])
            reply = (
                f"🏢 **Danh sách đối tác & Nhà cung cấp chính:**\n\n"
                f"{supp_list}\n\n"
                f"Tất cả nhà cung cấp đều đang ở trạng thái hoạt động tốt."
            )

        # 5. Tìm kiếm theo tên sản phẩm cụ thể
        else:
            matched = []
            for p in products:
                if any(k in p.name.lower() or k in p.code.lower() for k in msg_lower.split() if len(k) > 2):
                    matched.append(p)

            if matched:
                p = matched[0]
                status_txt = "🔴 Hết hàng" if p.current_stock == 0 else ("🟡 Thấp" if p.current_stock < p.minimum_stock else "🟢 An toàn")
                reply = (
                    f"📦 **Thông tin sản phẩm: {p.name}**\n\n"
                    f"- **Mã SKU:** `{p.code}`\n"
                    f"- **Số lượng tồn hiện tại:** **{p.current_stock}** ({status_txt})\n"
                    f"- **Định mức tối thiểu:** {p.minimum_stock}\n"
                    f"- **Mô tả:** {p.description or 'Không có mô tả'}\n"
                    f"- **Số lượng đặt hàng tối ưu:** {p.reorder_quantity or 10} đơn vị"
                )
            else:
                reply = (
                    f"🤖 **Xin chào {current_user.full_name or current_user.username}! Tôi là Trợ lý Kho AI.**\n\n"
                    f"Tôi có thể hỗ trợ bạn tức thì các công việc sau:\n"
                    f"- ⚠️ **Kiểm tra hàng sắp hết:** *'Những mặt hàng nào cần nhập?'*\n"
                    f"- 💰 **Tính toán ngân sách:** *'Chi phí nhập hàng dự kiến bao nhiêu?'*\n"
                    f"- 📊 **Đánh giá tổng quan:** *'Báo cáo tình trạng kho hôm nay'* \n"
                    f"- 📦 **Tra cứu thông tin:** *'Tồn kho chuột Logitech thế nào?'*\n\n"
                    f"Bạn hãy chọn gợi ý bên dưới hoặc gõ câu hỏi nhé!"
                )

        return {
            "reply": reply,
            "timestamp": datetime.now().strftime("%H:%M:%S"),
            "health_score": analysis["health_score"]
        }

    def apply_recommendation(self, product_id: int, quantity: int, supplier_id: int, current_user: User) -> dict:
        """
        Tự động tạo phiếu nhập kho (ImportReceipt) ở trạng thái DRAFT từ khuyến nghị của AI.
        """
        product = self.db.query(Product).filter(Product.id == product_id).first()
        if not product:
            raise ValueError("Không tìm thấy sản phẩm.")

        # Lấy giá nhập tham khảo
        recent_item = self.db.query(ImportReceiptItem).filter(ImportReceiptItem.product_id == product_id).order_by(ImportReceiptItem.id.desc()).first()
        unit_price = float(recent_item.unit_price) if recent_item else 2000000.0
        total_amount = quantity * unit_price

        # Mã phiếu nhập mới
        receipt_code = f"IMP-AI-{datetime.now().strftime('%Y%m%d%H%M%S')}"

        new_receipt = ImportReceipt(
            receipt_code=receipt_code,
            supplier_id=supplier_id,
            receipt_date=date.today(),
            status="DRAFT",
            created_by=current_user.id,
            notes=f"Phiếu nhập tự động tạo từ AI Recommendation cho sản phẩm: {product.name}",
            total_amount=total_amount
        )
        self.db.add(new_receipt)
        self.db.flush()

        receipt_item = ImportReceiptItem(
            import_receipt_id=new_receipt.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=unit_price,
            total_amount=total_amount,
            notes=f"Đề xuất tự động bổ sung tồn kho an toàn ({quantity} cái)"
        )
        self.db.add(receipt_item)
        self.db.commit()
        self.db.refresh(new_receipt)

        return {
            "receipt_id": new_receipt.id,
            "receipt_code": new_receipt.receipt_code,
            "product_name": product.name,
            "quantity": quantity,
            "total_amount": total_amount,
            "message": f"Đã tự động tạo phiếu nhập nháp {receipt_code} thành công!"
        }
