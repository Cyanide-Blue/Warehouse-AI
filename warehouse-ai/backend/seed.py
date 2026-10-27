"""
Script nạp toàn bộ dữ liệu mẫu (Seed Data) cho hệ thống Warehouse AI
Dựa trên tài liệu DATABASE_DESIGN.md và schema.sql.
"""
import sys
import os
from pathlib import Path

# Đảm bảo UTF-8 trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Thêm đường dẫn hiện tại vào sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from init_db_from_schema import init_database

if __name__ == "__main__":
    print("=" * 60)
    print("   KHỞI TẠO & NẠP DỮ LIỆU WAREHOUSE DATABASE (DATABASE_DESIGN.md)")
    print("=" * 60)
    init_database()
    print("=" * 60)
    print("✅ Hoàn tất! Bạn có thể khởi động backend và đăng nhập với:")
    print("   - Username: admin       | Password: password123 (Vai trò: ADMIN)")
    print("   - Username: storekeeper | Password: password123 (Vai trò: STOREKEEPER)")
    print("   - Username: accountant  | Password: password123 (Vai trò: ACCOUNTANT)")
    print("   - Username: staff       | Password: password123 (Vai trò: STOREKEEPER)")
    print("=" * 60)
