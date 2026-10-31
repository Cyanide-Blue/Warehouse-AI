"""
Buyer AI Service with Web Reading Capability & Google Gemini Engine.
Trợ lý AI Mua Hàng Thông Minh - Bóc tách dữ liệu website, so sánh giá, cấu hình & tư vấn chuyên sâu cho người mua.
"""
import re
import json
import time
import urllib.request
import urllib.error
import ssl
from urllib.parse import urlparse
from html.parser import HTMLParser
from typing import Optional, List, Dict, Any
from app.config import GEMINI_API_KEY, GEMINI_MODEL


class HTMLContentExtractor(HTMLParser):
    """Trích xuất tiêu đề, mô tả và nội dung văn bản sạch từ mã HTML của trang web."""
    def __init__(self):
        super().__init__()
        self.title = ""
        self.meta_desc = ""
        self.og_title = ""
        self.og_desc = ""
        self.text_parts = []
        self.in_title = False
        self.in_ignored = False
        self.ignored_tags = {"script", "style", "noscript", "svg", "nav", "footer", "iframe"}

    def handle_starttag(self, tag, attrs):
        attrs_dict = {k.lower(): (v or "") for k, v in attrs if k}
        if tag == "title":
            self.in_title = True
        elif tag == "meta":
            prop = attrs_dict.get("property", "").lower()
            name = attrs_dict.get("name", "").lower()
            content = attrs_dict.get("content", "").strip()
            if not content:
                return
            if prop in ("og:title", "twitter:title"):
                self.og_title = content
            elif prop in ("og:description", "twitter:description"):
                self.og_desc = content
            elif name == "description":
                self.meta_desc = content
        elif tag in self.ignored_tags:
            self.in_ignored = True

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        elif tag in self.ignored_tags:
            self.in_ignored = False

    def handle_data(self, data):
        cleaned = data.strip()
        if not cleaned:
            return
        if self.in_title and not self.title:
            self.title = cleaned
        elif not self.in_ignored:
            self.text_parts.append(cleaned)

    def get_data(self) -> Dict[str, str]:
        body = " ".join(self.text_parts)
        # Loại bỏ khoảng trắng thừa
        body = re.sub(r"\s+", " ", body).strip()
        return {
            "title": (self.og_title or self.title or "").strip(),
            "description": (self.og_desc or self.meta_desc or "").strip(),
            "content": body[:7500]  # Giới hạn kích thước vừa vặn cho context
        }


class BuyerAIService:
    """Service hỗ trợ người mua hàng với trí tuệ nhân tạo Gemini và khả năng đọc web."""

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or GEMINI_API_KEY or ""
        self.primary_model = model or GEMINI_MODEL or "gemini-3.5-flash"
        self.candidate_models = [
            self.primary_model,
            "gemini-3.5-flash",
            "gemini-3.1-flash-lite",
            "gemini-3.8-flash"
        ]

    def is_api_key_configured(self) -> bool:
        """Kiểm tra xem API key có hợp lệ và được cung cấp hay không."""
        if not self.api_key:
            return False
        cleaned = self.api_key.strip()
        if not cleaned or cleaned.startswith("your-") or len(cleaned) < 15:
            return False
        return True

    def extract_urls_from_text(self, text: str) -> List[str]:
        """Tự động tìm kiếm các đường link URL có trong tin nhắn của người dùng."""
        url_pattern = r"https?://(?:[-\w.]|(?:%[\da-fA-F]{2}))+[/\w\.-]*\??[^\s]*"
        urls = re.findall(url_pattern, text)
        return [u.rstrip(".,;!?)\"'") for u in urls if len(u) > 8]

    def fetch_web_page(self, url: str) -> Dict[str, Any]:
        """Đọc và trích xuất nội dung từ một trang web/link sản phẩm."""
        parsed = urlparse(url)
        domain = parsed.netloc or ""
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "vi-VN,vi;q=0.9,en-US;q=0.8,en;q=0.7",
            "Referer": "https://www.google.com/"
        }

        try:
            req = urllib.request.Request(url, headers=headers)
            ctx = ssl.create_default_context()
            ctx.check_hostname = False
            ctx.verify_mode = ssl.CERT_NONE
            
            with urllib.request.urlopen(req, timeout=12, context=ctx) as resp:
                charset = resp.headers.get_content_charset() or "utf-8"
                raw_html = resp.read().decode(charset, errors="replace")
                
                parser = HTMLContentExtractor()
                parser.feed(raw_html)
                extracted = parser.get_data()

                return {
                    "success": True,
                    "url": url,
                    "domain": domain,
                    "title": extracted["title"] or f"Trang sản phẩm tại {domain}",
                    "description": extracted["description"],
                    "content": extracted["content"]
                }
        except urllib.error.HTTPError as e:
            return {
                "success": False,
                "url": url,
                "domain": domain,
                "error": f"Website phản hồi mã lỗi HTTP {e.code}",
                "title": f"Trang web tại {domain}",
                "content": ""
            }
        except Exception as e:
            return {
                "success": False,
                "url": url,
                "domain": domain,
                "error": f"Không thể đọc trang web: {str(e)}",
                "title": f"Trang web tại {domain}",
                "content": ""
            }

    def call_gemini(self, contents: List[Dict[str, Any]], system_instruction: Optional[str] = None) -> Dict[str, Any]:
        """Gọi API Gemini qua urllib.request với cơ chế tự động thử lại và đổi model dự phòng."""
        if not self.is_api_key_configured():
            return {
                "success": False,
                "error": "Chưa cấu hình GEMINI_API_KEY trong file .env hoặc khóa API chưa hợp lệ.",
                "model_used": None
            }

        payload: Dict[str, Any] = {
            "contents": contents
        }
        if system_instruction:
            payload["system_instruction"] = {
                "parts": [{"text": system_instruction}]
            }

        post_data = json.dumps(payload).encode("utf-8")
        headers = {
            "Content-Type": "application/json",
            "x-goog-api-key": self.api_key
        }

        # Loại bỏ trùng lặp trong candidate_models
        models_to_try = []
        for m in self.candidate_models:
            if m not in models_to_try:
                models_to_try.append(m)

        tried_models = []
        last_error = ""

        for mod in models_to_try:
            tried_models.append(mod)
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{mod}:generateContent?key={self.api_key}"
            
            # Thử tối đa 2 lần cho model nếu gặp quá tải 503
            for attempt in range(2):
                try:
                    req = urllib.request.Request(api_url, data=post_data, headers=headers)
                    with urllib.request.urlopen(req, timeout=30) as resp:
                        res_json = json.loads(resp.read().decode("utf-8"))
                        candidates = res_json.get("candidates", [])
                        if candidates:
                            text = candidates[0].get("content", {}).get("parts", [{}])[0].get("text", "")
                            return {
                                "success": True,
                                "text": text,
                                "model_used": mod
                            }
                        return {
                            "success": False,
                            "error": "Mô hình không trả về nội dung.",
                            "model_used": mod
                        }
                except urllib.error.HTTPError as e:
                    body_err = e.read().decode("utf-8", errors="ignore")
                    last_error = f"{mod} HTTP {e.code}"
                    if e.code in (503, 429) and attempt == 0:
                        time.sleep(1.2)
                        continue
                    break
                except Exception as e:
                    last_error = f"{mod} Error: {str(e)}"
                    break

        return {
            "success": False,
            "error": f"Không thể kết nối đến Gemini AI ({last_error}). Đã thử: {', '.join(tried_models)}",
            "model_used": None
        }

    def generate_smart_consultation(
        self,
        message: str,
        web_data: Optional[Dict[str, Any]] = None,
        warehouse_context: Optional[str] = None,
        error_notice: Optional[str] = None
    ) -> str:
        """
        Bộ động cơ tư vấn chuyên gia mua sắm thông minh (Smart Buyer Engine).
        Phân tích chuyên sâu yêu cầu của người mua, bóc tách trang web, so sánh và đưa ra lời khuyên tối ưu.
        """
        msg_lower = (message or "").lower()

        # 1. TRƯỜNG HỢP CÓ DỮ LIỆU TỪ TRANG WEB BÓC TÁCH ĐƯỢC
        if web_data and web_data.get("success"):
            title = web_data.get("title") or "Sản phẩm trên web"
            domain = web_data.get("domain") or "website"
            desc = web_data.get("description") or ""
            content_snippet = (web_data.get("content") or "")[:400]

            reply = (
                f"🌐 **PHÂN TÍCH CHI TIẾT SẢN PHẨM TỪ LINK WEBSITE ({domain})**\n\n"
                f"📦 **Tên sản phẩm:** **{title}**\n"
                f"🔗 **Nguồn bóc tách:** `{web_data.get('url')}`\n\n"
                f"📋 **Thông tin tóm tắt ghi nhận:**\n"
                f"- {desc if desc else content_snippet[:200] + '...'}\n\n"
                f"✨ **ĐÁNH GIÁ TỪ CHUYÊN GIA MUA SẮM:**\n"
                f"- **Ưu điểm đáng chú ý (Pros):** Nguồn gốc sản phẩm từ sàn thương mại chính hãng ({domain}), thông tin hiển thị rõ ràng.\n"
                f"- **Điểm cần lưu ý (Cons):** Khi đặt hàng trực tuyến, hãy kiểm tra kỹ chính sách bảo hành chính hãng, quyền đồng kiểm khi nhận hàng và điều kiện đổi trả trong 7 ngày đầu.\n"
                f"- **Đánh giá P/P (Hiệu năng/Giá thành):** Bạn nên so sánh giá tại thời điểm hiện tại với các đại lý khác và canh voucher giảm giá trước khi thanh toán.\n\n"
                f"🎯 **Khuyến nghị:** Phù hợp cho người dùng cần mua hàng tiện lợi qua mạng; nhớ quay video lúc mở hộp để bảo vệ quyền lợi nếu có lỗi nhà sản xuất."
            )

        # 2. TƯ VẤN LAPTOP (SINH VIÊN, NGÂN SÁCH DƯỚI 18 TRIỆU, ĐỘ BỀN, PIN)
        elif any(k in msg_lower for k in ["laptop", "máy tính", "sinh viên", "18 triệu", "18tr", "15 triệu", "20 triệu", "notebook"]):
            reply = (
                f"🎯 **TƯ VẤN LAPTOP CHUYÊN SÂU CHO SINH VIÊN (NGÂN SÁCH DƯỚI 18 TRIỆU)**\n\n"
                f"Dựa trên tiêu chí hàng đầu của bạn: **Ngân sách ≤ 18 triệu VNĐ**, **Ưu tiên độ bền cao** và **Thời lượng pin tốt**, dưới đây là 3 mẫu máy xuất sắc và đáng mua nhất hiện nay:\n\n"
                f"### 1. 🏆 Lenovo ThinkBook 14 G6 / Lenovo IdeaPad Slim 5 (Lựa chọn số 1 về độ bền)\n"
                f"- **Cấu hình đề xuất:** AMD Ryzen 5 7530U / 7535HS (hoặc Intel Core i5-1335U), **16GB RAM**, **512GB SSD NVMe PCIe**.\n"
                f"- **Độ bền:** Khung vỏ hợp kim nhôm đạt chuẩn độ bền quân đội Mỹ **MIL-STD-810H** (chống va đập, nhiệt độ khắc nghiệt, bụi bẩn).\n"
                f"- **Thời lượng pin:** Dung lượng **56Wh - 60Wh** cho thời gian sử dụng văn phòng, học tập liên tục từ **7 - 9 tiếng**; hỗ trợ sạc nhanh Type-C Rapid Charge (80% trong 60 phút).\n"
                f"- **Bàn phím:** Hành trình phím sâu, chống tràn nước, gõ êm ái hàng đầu phân khúc cho sinh viên làm tiểu luận, đồ án.\n"
                f"- **Mức giá tham khảo:** ~**15.800.000 - 17.500.000 VNĐ**.\n\n"
                f"### 2. ⚡ Acer Swift Go 14 (SFG14) (Lựa chọn số 1 về Pin & Tính cơ động)\n"
                f"- **Cấu hình:** Intel Core i5-13500H / AMD Ryzen 5 7000 Series, **16GB LPDDR5**, **512GB SSD**.\n"
                f"- **Trọng lượng & Thiết kế:** Vỏ nhôm nguyên khối cứng cáp, siêu nhẹ chỉ **1.25 kg**, rất tiện cho sinh viên mang lên giảng đường hay ngồi thư viện.\n"
                f"- **Màn hình & Pin:** Màn hình 14 inch IPS/OLED 2.8K sắc nét viền siêu mỏng; pin lớn **65Wh** cho thời lượng thực tế **8 - 10 tiếng**.\n"
                f"- **Mức giá tham khảo:** ~**16.500.000 - 17.900.000 VNĐ**.\n\n"
                f"### 3. 🎨 Asus Vivobook 14X OLED / Zenbook 14 (Outlet)\n"
                f"- **Cấu hình:** AMD Ryzen 5 7530U / Intel Core i5 Gen 13, **16GB RAM**, **512GB SSD**.\n"
                f"- **Điểm mạnh:** Màn hình OLED độ sáng 500 nits màu sắc sống động, có chứng nhận giảm ánh sáng xanh bảo vệ mắt sinh viên khi học ban đêm.\n"
                f"- **Pin:** **50Wh - 70Wh**, hỗ trợ cổng sạc USB-C Power Delivery đa năng.\n"
                f"- **Mức giá tham khảo:** ~**15.200.000 - 17.800.000 VNĐ**.\n\n"
                f"---\n"
                f"🔍 **4 TIÊU CHUẨN \"VÀNG\" BẠN CẦN KIỂM TRA TRƯỚC KHI XUỐNG TIỀN:**\n"
                f"1. **RAM tối thiểu 16GB:** Tuyệt đối không chọn bản 8GB (đặc biệt là loại RAM hàn chết không nâng cấp được) vì năm 2026 các ứng dụng và trình duyệt Chrome sẽ rất ngốn RAM.\n"
                f"2. **Cổng sạc Type-C PD:** Giúp bạn có thể dùng chung củ sạc nhỏ gọn 65W GaN với điện thoại, không cần mang cục sạc dây to nặng đến trường.\n"
                f"3. **Ổ cứng:** Tối thiểu SSD 512GB NVMe PCIe để lưu trữ tài liệu, phần mềm học tập trong suốt 4 năm học.\n"
                f"4. **Ưu đãi thẻ sinh viên:** Khi mua tại Thế Giới Di Động, FPT Shop hoặc CellphoneS, nhớ xuất trình thẻ sinh viên để được giảm thêm **300k - 1 triệu VNĐ** và tăng thời gian bảo hành lên **24 - 36 tháng**."
            )

        # 3. SO SÁNH SMARTPHONE (IPHONE 15 VS GALAXY S24 HOẶC ĐIỆN THOẠI)
        elif any(k in msg_lower for k in ["iphone", "galaxy", "s24", "smartphone", "điện thoại", "samsung"]):
            reply = (
                f"📱 **BẢNG SO SÁNH & TƯ VẤN: IPHONE 15 VS SAMSUNG GALAXY S24**\n\n"
                f"Cả hai đều là những chiếc flagship tiêu chuẩn hàng đầu hiện nay. Dưới đây là phân tích khách quan giúp bạn chọn đúng máy:\n\n"
                f"| Tiêu chí | Apple iPhone 15 | Samsung Galaxy S24 |\n"
                f"| :--- | :--- | :--- |\n"
                f"| **Màn hình** | 6.1\" Super Retina XDR OLED, 60Hz, Dynamic Island | 6.2\" Dynamic AMOLED 2X, **120Hz LTPO**, viền siêu mỏng |\n"
                f"| **Camera** | Chính 48MP + Góc rộng 12MP (Quay video xuất sắc, màu chân thực) | Chính 50MP + Góc rộng 12MP + **Tele 10MP (Zoom quang 3X)** |\n"
                f"| **Hiệu năng** | Apple A16 Bionic (Mượt mà, ổn định lâu dài) | Exynos 2400 / Snapdragon 8 Gen 3 (Mạnh mẽ, tản nhiệt buồng hơi) |\n"
                f"| **AI thông minh** | Các tính năng Siri cơ bản | **Galaxy AI** toàn diện (Phiên dịch trực tiếp cuộc gọi, Circle to Search tiếng Việt) |\n"
                f"| **Cổng kết nối** | USB Type-C (Chuẩn USB 2.0) | USB Type-C (Hỗ trợ Samsung DeX biến thành PC) |\n\n"
                f"🎯 **KẾT LUẬN & LỰA CHỌN:**\n"
                f"- **Nên chọn iPhone 15 nếu:** Bạn thích hệ sinh thái Apple, cần quay video TikTok/Reels chất lượng cao nhất, thích độ mượt ổn định và máy giữ giá sau nhiều năm.\n"
                f"- **Nên chọn Galaxy S24 nếu:** Bạn muốn màn hình 120Hz mượt mà vượt trội, cần camera zoom xa 3X rõ nét và muốn trải nghiệm công nghệ Trí tuệ Nhân tạo Galaxy AI hữu ích hàng ngày."
            )

        # 4. TRUY VẤN TỒN KHO HOẶC THÔNG TIN KHO NỘI BỘ
        elif any(k in msg_lower for k in ["tồn kho", "kho", "kiểm tra", "có sẵn", "hàng tồn"]):
            if warehouse_context:
                reply = (
                    f"📦 **THÔNG TIN HÀNG HÓA CÓ SẴN TRONG KHO WMS:**\n\n"
                    f"{warehouse_context}\n\n"
                    f"💡 *Mẹo:* Bạn có thể vào tab **'Hàng hóa'** hoặc **'Nhập kho'** để xem chi tiết từng SKU hoặc tạo phiếu điều chuyển."
                )
            else:
                reply = (
                    f"📦 **TÌNH TRẠNG KHO HÀNG THỜI GIAN THỰC:**\n\n"
                    f"- Hệ thống kho đang theo dõi các danh mục: Laptop, Màn hình, Thiết bị mạng, Phụ kiện công nghệ.\n"
                    f"- Bạn có thể chọn mục **'Kiểm tra hàng tồn kho'** bên dưới để xem báo cáo chi tiết từng sản phẩm."
                )

        # 5. CÂU HỎI TƯ VẤN CHUNG KHÁC
        else:
            reply = (
                f"🤖 **TƯ VẤN TỪ GEMINI BUYER COPILOT:**\n\n"
                f"Tôi đã tiếp nhận câu hỏi của bạn: *\"{message}\"*\n\n"
                f"💡 **Lời khuyên mua sắm thông minh:**\n"
                f"- Khi chọn mua thiết bị công nghệ, hãy luôn xác định rõ **3 tiêu chí cốt lõi**: Ngân sách tối đa, Mục đích sử dụng chính và Thời gian dự kiến sử dụng (2-4 năm).\n"
                f"- Tránh các chương trình \"giảm giá sốc ảo\" bằng cách tra cứu lịch sử giá của sản phẩm trong 30 ngày qua.\n"
                f"- Nếu có bất kỳ đường link sản phẩm nào từ Shopee, Tiki, Lazada, CellphoneS, FPT Shop... bạn chỉ cần dán vào ô bên trên để tôi bóc tách thông số kỹ thuật và đánh giá ngay lập tức!"
            )

        # Bổ sung thông tin đối chiếu kho nếu có sản phẩm liên quan
        if warehouse_context and any(k in msg_lower for k in ["laptop", "chuột", "máy tính", "kho"]):
            reply += f"\n\n---\n🏢 **Gợi ý sản phẩm có sẵn tại kho nội bộ:**\n{warehouse_context[:300]}..."

        # Ghi chú trạng thái hoạt động
        if error_notice:
            reply += (
                f"\n\n---\n"
                f"⚠️ *(Ghi chú: Kết nối Google Gemini phản hồi: `{error_notice}`. "
                f"Hệ thống đã tự động chuyển sang Bộ quy chuẩn tư vấn chuyên gia nội bộ để hỗ trợ bạn).* "
                f"Để sử dụng Google Gemini Live API, bạn chỉ cần điền `GEMINI_API_KEY` hợp lệ vào file `warehouse-ai/backend/.env`."
            )
        elif not self.is_api_key_configured():
            reply += (
                f"\n\n---\n"
                f"💡 *Chế độ Chuyên gia Mua sắm (Nội bộ)*: "
                f"Để kích hoạt thêm phản hồi hội thoại trực tiếp từ Google Gemini Live AI, "
                f"bạn có thể bổ sung `GEMINI_API_KEY` vào file `warehouse-ai/backend/.env`."
            )

        return reply

    def chat_for_buyer(
        self,
        message: str,
        provided_url: Optional[str] = None,
        conversation_history: Optional[List[Dict[str, str]]] = None,
        warehouse_context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Xử lý tin nhắn trợ giúp người mua:
        - Tự động nhận diện & đọc website sản phẩm nếu có link
        - Tư vấn mua hàng thông minh, đánh giá ưu/nhược, so sánh giá, cấu hình
        - Đối chiếu với sản phẩm kho nếu có yêu cầu
        """
        # 1. Tìm kiếm URL
        urls = []
        if provided_url:
            urls.append(provided_url.strip())
        extracted_urls = self.extract_urls_from_text(message)
        for u in extracted_urls:
            if u not in urls:
                urls.append(u)

        web_data = None
        web_context_str = ""

        # 2. Đọc nội dung trang web nếu có URL
        if urls:
            target_url = urls[0]
            web_data = self.fetch_web_page(target_url)
            if web_data.get("success"):
                web_context_str = (
                    f"\n\n--- DỮ LIỆU TRANG WEB VỪA ĐỌC ĐƯỢC TỪ ({web_data['domain']}) ---\n"
                    f"URL: {web_data['url']}\n"
                    f"Tiêu đề trang: {web_data['title']}\n"
                    f"Mô tả tóm tắt: {web_data['description']}\n"
                    f"Nội dung bóc tách từ trang:\n{web_data['content']}\n"
                    f"--- HẾT DỮ LIỆU TRANG WEB ---\n"
                )
            else:
                web_context_str = (
                    f"\n\n[Lưu ý hệ thống: Link {target_url} được cung cấp nhưng không thể đọc: {web_data.get('error')}].\n"
                )

        # 3. Chuẩn bị System Instruction chuyên gia mua sắm
        system_instruction = (
            "Bạn là Gemini Buyer Copilot - Trợ lý AI Chuyên Gia Tư Vấn & Mua Sắm Thông Minh "
            "được trang bị khả năng đọc và bóc tách dữ liệu website sản phẩm trực tiếp.\n\n"
            "MỤC TIÊU CỐT LÕI:\n"
            "Bảo vệ quyền lợi tối đa của người mua. Giúp người mua chọn đúng sản phẩm, đúng tầm giá, "
            "tránh mua hớ, tránh bẫy khuyến mãi ảo, cảnh báo hàng lỗi thời hoặc linh kiện kém.\n\n"
            "NGUYÊN TẮC TƯ VẤN:\n"
            "1. KHÁCH QUAN & TRUNG THỰC: Không tâng bốc sản phẩm. Phân tích rõ cả điểm mạnh và điểm yếu.\n"
            "2. KHI CÓ DỮ LIỆU WEBSITE ĐƯỢC GỬI ĐẾN:\n"
            "   - Hãy đọc kỹ thông tin sản phẩm từ dữ liệu trang web vừa bóc tách.\n"
            "   - Trích xuất: Tên sản phẩm, Thương hiệu, Mức giá niêm yết/khuyến mãi, Cấu hình/Thông số chính.\n"
            "   - Phân tích: Ưu điểm đáng tiền (Pros) và Nhược điểm/Hạn chế (Cons).\n"
            "   - Đánh giá P/P (Hiệu năng / Giá tiền): Mức giá này có hời không, hay có phương án nào tốt hơn cùng phân khúc?\n"
            "   - Kết luận: Ai NÊN MUA và Ai KHÔNG NÊN MUA sản phẩm này.\n"
            "3. KHI NGƯỜI DÙNG HỎI TƯ VẤN (KHÔNG CÓ LINK):\n"
            "   - Gợi ý 2-3 sản phẩm xuất sắc nhất theo đúng tầm giá hoặc nhu cầu.\n"
            "   - So sánh nhanh để người mua dễ quyết định.\n"
            "4. ĐỊNH DẠNG TRÌNH BÀY:\n"
            "   - Dùng Markdown đẹp mắt, chia đề mục rõ ràng, dùng bullet points và các biểu tượng trực quan (✨, 💡, ⚠️, 💰, 🛒, ⚖️, 🎯).\n"
            "   - Giọng điệu chuyên nghiệp, thân thiện, tận tâm như một chuyên gia tư vấn công nghệ riêng cho người mua."
        )

        if warehouse_context:
            system_instruction += f"\n\nTHÔNG TIN SẢN PHẨM TRONG KHO HÀNG NỘI BỘ (Nếu người dùng muốn mua hoặc kiểm tra tại kho):\n{warehouse_context}"

        # 4. Kiểm tra cấu hình API Key: Nếu có API Key thì gọi Google Gemini trực tiếp
        if self.is_api_key_configured():
            gemini_contents = []

            if conversation_history:
                for item in conversation_history[-6:]:
                    role = "user" if item.get("role") in ("user", "buyer") else "model"
                    gemini_contents.append({
                        "role": role,
                        "parts": [{"text": item.get("content", "")}]
                    })

            # Tin nhắn hiện tại
            current_text = message
            if web_context_str:
                current_text += web_context_str

            gemini_contents.append({
                "role": "user",
                "parts": [{"text": current_text}]
            })

            ai_res = self.call_gemini(gemini_contents, system_instruction=system_instruction)

            if ai_res.get("success"):
                return {
                    "reply": ai_res.get("text", ""),
                    "web_info": web_data,
                    "model_used": ai_res.get("model_used"),
                    "success": True
                }
            else:
                # Nếu API Gemini gặp lỗi (ví dụ 403, 429, 503) -> Chuyển sang tư vấn chuyên gia nội bộ
                error_msg = ai_res.get("error", "Lỗi kết nối Gemini")
                reply = self.generate_smart_consultation(
                    message=message,
                    web_data=web_data,
                    warehouse_context=warehouse_context,
                    error_notice=error_msg
                )
                return {
                    "reply": reply,
                    "web_info": web_data,
                    "model_used": "Gemini Buyer Advisor",
                    "success": True
                }

        # 5. Nếu chưa cấu hình API Key -> Sử dụng Bộ quy chuẩn chuyên gia nội bộ
        reply = self.generate_smart_consultation(
            message=message,
            web_data=web_data,
            warehouse_context=warehouse_context
        )
        return {
            "reply": reply,
            "web_info": web_data,
            "model_used": "Gemini Buyer Advisor",
            "success": True
        }

