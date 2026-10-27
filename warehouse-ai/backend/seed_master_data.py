import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Supplier, Category, Unit, Product

def seed_sample_data():
    db = SessionLocal()
    try:
        # Suppliers
        if db.query(Supplier).count() == 0:
            suppliers = [
                Supplier(
                    code="SUP-001",
                    name="Công ty TNHH Synnex FPT",
                    contact_person="Nguyễn Hoàng Long",
                    phone="0901234567",
                    email="fpt_synnex@fpt.com.vn",
                    address="Tòa nhà FPT, Cầu Giấy, Hà Nội",
                    city="Hà Nội",
                    country="Việt Nam",
                    is_active=True
                ),
                Supplier(
                    code="SUP-002",
                    name="Tập đoàn Digiworld (DGW)",
                    contact_person="Trần Minh Quân",
                    phone="0912345678",
                    email="contact@digiworld.com.vn",
                    address="195 Điện Biên Phủ, P.15, Bình Thạnh",
                    city="TP. Hồ Chí Minh",
                    country="Việt Nam",
                    is_active=True
                ),
                Supplier(
                    code="SUP-003",
                    name="Công ty Công nghệ Viễn Sơn",
                    contact_person="Phạm Hồng Hải",
                    phone="0987654321",
                    email="support@vienson.vn",
                    address="175 Bùi Thị Xuân, Q.1",
                    city="TP. Hồ Chí Minh",
                    country="Việt Nam",
                    is_active=True
                ),
            ]
            db.add_all(suppliers)
            db.commit()
            print("✅ Suppliers seeded.")

        # Ensure Categories
        cat_map = {c.name: c.id for c in db.query(Category).all()}
        if "Linh kiện & Phụ kiện" not in cat_map:
            c = Category(name="Linh kiện & Phụ kiện", description="Chuột, phím, tai nghe, cáp chuyển", is_active=True)
            db.add(c)
            db.commit()
            db.refresh(c)
            cat_map[c.name] = c.id

        if "Máy tính & Laptop" not in cat_map:
            c = Category(name="Máy tính & Laptop", description="Laptop văn phòng, Gaming, Workstation", is_active=True)
            db.add(c)
            db.commit()
            db.refresh(c)
            cat_map[c.name] = c.id

        if "Thiết bị mạng" not in cat_map:
            c = Category(name="Thiết bị mạng", description="Router, Switch, Cáp mạng", is_active=True)
            db.add(c)
            db.commit()
            db.refresh(c)
            cat_map[c.name] = c.id

        # Ensure Units
        unit_map = {u.name: u.id for u in db.query(Unit).all()}
        if "Cái" not in unit_map and "Piece" not in unit_map:
            u = Unit(name="Cái", abbreviation="cái")
            db.add(u)
            db.commit()
            db.refresh(u)
            unit_map["Cái"] = u.id

        if "Bộ" not in unit_map:
            u = Unit(name="Bộ", abbreviation="bộ")
            db.add(u)
            db.commit()
            db.refresh(u)
            unit_map["Bộ"] = u.id

        default_cat_id = list(cat_map.values())[0]
        default_unit_id = list(unit_map.values())[0]

        # Seed products if low count
        if db.query(Product).count() < 4:
            new_products = [
                Product(
                    code="PROD-002",
                    name="Chuột không dây Logitech MX Master 3S",
                    category_id=cat_map.get("Linh kiện & Phụ kiện", default_cat_id),
                    unit_id=default_unit_id,
                    description="Chuột công thái học cao cấp",
                    minimum_stock=10,
                    current_stock=2,  # Low stock -> AI will flag!
                    reorder_quantity=20,
                    is_active=True
                ),
                Product(
                    code="PROD-003",
                    name="Bàn phím cơ Keychron K2 Pro",
                    category_id=cat_map.get("Linh kiện & Phụ kiện", default_cat_id),
                    unit_id=default_unit_id,
                    description="Bàn phím cơ Bluetooth Hot-swappable",
                    minimum_stock=8,
                    current_stock=0,  # Out of stock -> AI CRITICAL!
                    reorder_quantity=15,
                    is_active=True
                ),
                Product(
                    code="PROD-004",
                    name="Màn hình Dell UltraSharp U2723QE 4K",
                    category_id=cat_map.get("Máy tính & Laptop", default_cat_id),
                    unit_id=default_unit_id,
                    description="Màn hình đồ họa 27 inch IPS Black",
                    minimum_stock=5,
                    current_stock=12,  # Healthy stock
                    reorder_quantity=10,
                    is_active=True
                ),
                Product(
                    code="PROD-005",
                    name="Bộ phát WiFi 6 Mesh TP-Link Deco X50",
                    category_id=cat_map.get("Thiết bị mạng", default_cat_id),
                    unit_id=unit_map.get("Bộ", default_unit_id),
                    description="Hệ thống Mesh WiFi 6 AX3000",
                    minimum_stock=6,
                    current_stock=1,  # Low stock -> AI will flag!
                    reorder_quantity=12,
                    is_active=True
                )
            ]
            db.add_all(new_products)
            db.commit()
            print("✅ Products seeded.")

    except Exception as e:
        print(f"❌ Error seeding sample data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_data()
