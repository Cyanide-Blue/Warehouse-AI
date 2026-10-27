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
        self.primary_model = model or GEMINI_MODEL or "gemini-3.1-flash-lite"
        self.candidate_models = [
            self.primary_model,
            "gemini-3.1-flash-lite",
            "gemini-3.5-flash",
            "gemini-3.8-flash"
        ]

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
                    with urllib.request.urlopen(req, timeout=25) as resp:
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

        # 4. Tạo chuỗi hội thoại
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

        # 5. Gọi Gemini
        ai_res = self.call_gemini(gemini_contents, system_instruction=system_instruction)

        if not ai_res.get("success"):
            error_msg = ai_res.get("error", "Lỗi tạm thời")
            fallback_text = (
                f"⚠️ **Thông báo kết nối AI:** Kết nối đến máy chủ Gemini gặp phản hồi chậm ({error_msg}).\n\n"
            )
            if web_data and web_data.get("success"):
                fallback_text += (
                    f"🌐 Tuy nhiên, hệ thống **đã đọc thành công trang web** của bạn:\n"
                    f"- **Tiêu đề:** {web_data['title']}\n"
                    f"- **Nguồn trang:** {web_data['domain']}\n"
                    f"- **Mô tả:** {web_data['description'] or web_data['content'][:220]}...\n\n"
                    f"👉 *Mẹo:* Bạn vui lòng bấm gửi lại câu hỏi để Gemini phản hồi phân tích chi tiết ngay!"
                )
            return {
                "reply": fallback_text,
                "web_info": web_data,
                "model_used": None,
                "success": False
            }

        return {
            "reply": ai_res.get("text", ""),
            "web_info": web_data,
            "model_used": ai_res.get("model_used"),
            "success": True
        }
