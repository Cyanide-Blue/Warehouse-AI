"""
Khởi tạo và nạp dữ liệu cho SQLite Database từ file schema.sql.
Hỗ trợ tạo database ở cả backend/warehouse.db và warehouse-ai/warehouse.db.
"""
import sys
import os
import sqlite3
from pathlib import Path

# Đảm bảo UTF-8 trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

def init_database():
    current_dir = Path(__file__).resolve().parent
    schema_path = current_dir / "schema.sql"
    if not schema_path.exists():
        schema_path = current_dir.parent / "schema.sql"

    if not schema_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file schema.sql tại {schema_path}")

    print(f"[INFO] Doc schema tu: {schema_path}")
    with open(schema_path, "r", encoding="utf-8") as f:
        sql_script = f.read()

    # Danh sách các đường dẫn database cần cập nhật
    db_paths = [
        current_dir / "warehouse.db",           # backend/warehouse.db
        current_dir.parent / "warehouse.db"     # warehouse-ai/warehouse.db
    ]

    for db_path in db_paths:
        print(f"\n[INFO] Dang tao/cap nhat database tai: {db_path}")
        conn = sqlite3.connect(str(db_path))
        cursor = conn.cursor()
        
        # Bật foreign keys
        cursor.execute("PRAGMA foreign_keys = ON;")
        
        # Thực thi toàn bộ script SQL
        cursor.executescript(sql_script)
        conn.commit()
        
        # Kiểm tra số lượng records các bảng
        tables = [
            "roles", "users", "categories", "units", 
            "suppliers", "products", "import_receipts", 
            "import_receipt_items", "export_receipts", 
            "export_receipt_items", "inventory_transactions"
        ]
        
        print(f"[OK] Tao thanh cong cac bang trong {db_path.name}:")
        for table in tables:
            cursor.execute(f"SELECT COUNT(*) FROM {table}")
            count = cursor.fetchone()[0]
            print(f"   - {table:<25}: {count} ban ghi")
            
        conn.close()

    print("\n[SUCCESS] Hoan thanh khoi tao toan bo database!")

if __name__ == "__main__":
    init_database()
