#!/usr/bin/env python3
"""
Standalone Gemini Buyer AI Copilot & Web Reader CLI.
Chạy trực tiếp từ dòng lệnh: python buyer_ai_cli.py
"""
import sys
import os

# Đảm bảo in UTF-8 không lỗi trên Windows
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stdin.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Thêm đường dẫn backend vào sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "warehouse-ai", "backend")
if os.path.exists(backend_dir) and backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

try:
    from app.services.buyer_ai_service import BuyerAIService
except ImportError:
    # Nếu chạy bên ngoài hoặc import fallback
    sys.path.append(os.path.abspath("."))
    from app.services.buyer_ai_service import BuyerAIService


def print_banner():
    print("=" * 70)
    print("  🤖 GEMINI BUYER COPILOT - TRỢ LÝ AI MUA HÀNG & ĐỌC WEB THÔNG MINH")
    print("  🔑 API Key: Đã nạp từ biến môi trường GEMINI_API_KEY")
    print("  ⚡ Engine: Google Gemini 3.1 Flash / 3.5 Flash")
    print("  🌐 Tính năng: Đọc web trực tiếp, bóc tách cấu hình, tư vấn người mua")
    print("=" * 70)
    print("  - Gõ URL bất kỳ (ví dụ https://tiki.vn/...): AI sẽ đọc và phân tích")
    print("  - Gõ câu hỏi tư vấn: AI sẽ so sánh, đánh giá ưu/nhược và tư vấn mua")
    print("  - Gõ 'exit' hoặc 'quit' để thoát")
    print("-" * 70 + "\n")


def main():
    print_banner()
    service = BuyerAIService()
    history = []

    while True:
        try:
            user_input = input("👤 Bạn (Người mua): ").strip()
            if not user_input:
                continue

            if user_input.lower() in ("exit", "quit", "q"):
                print("\n👋 Cảm ơn bạn đã sử dụng Gemini Buyer Copilot. Hẹn gặp lại!")
                break

            print("\n⏳ Gemini đang đọc dữ liệu & phân tích...")
            res = service.chat_for_buyer(message=user_input, conversation_history=history)

            if res.get("web_info") and res["web_info"].get("success"):
                w = res["web_info"]
                print(f"\n🌐 [ĐÃ ĐỌC WEBSITE]: {w.get('title')} ({w.get('domain')})")

            print(f"\n🤖 Gemini Buyer Copilot ({res.get('model_used') or 'AI'}):")
            print("-" * 50)
            print(res.get("reply", "Không có phản hồi."))
            print("-" * 50 + "\n")

            # Lưu history
            history.append({"role": "user", "content": user_input})
            history.append({"role": "model", "content": res.get("reply", "")})
            if len(history) > 8:
                history = history[-8:]

        except KeyboardInterrupt:
            print("\n\n👋 Đã dừng chương trình.")
            break
        except Exception as e:
            print(f"\n❌ Lỗi: {e}\n")


if __name__ == "__main__":
    main()
