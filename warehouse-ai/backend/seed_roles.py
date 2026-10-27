import sys
import os

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import Role, User
from app.auth.security import hash_password

def seed_users():
    db = SessionLocal()
    try:
        # Create BUYER role if not exists
        buyer_role = db.query(Role).filter(Role.name == "BUYER").first()
        if not buyer_role:
            buyer_role = Role(name="BUYER", description="Buyer role")
            db.add(buyer_role)
            db.commit()
            db.refresh(buyer_role)
            print("BUYER role created.")
            
        storekeeper_role = db.query(Role).filter(Role.name == "STOREKEEPER").first()
        if not storekeeper_role:
            storekeeper_role = Role(name="STOREKEEPER", description="Storekeeper role")
            db.add(storekeeper_role)
            db.commit()
            db.refresh(storekeeper_role)

        # Create Staff
        staff_user = db.query(User).filter(User.username == "staff").first()
        if not staff_user:
            staff = User(
                username="staff",
                email="staff@example.com",
                full_name="Nhân viên Kho",
                password_hash=hash_password("password123"),
                role_id=storekeeper_role.id,
                is_active=True
            )
            db.add(staff)
            print("Staff user created.")
            
        # Create Buyer
        buyer_user = db.query(User).filter(User.username == "buyer").first()
        if not buyer_user:
            buyer = User(
                username="buyer",
                email="buyer@example.com",
                full_name="Người Mua Hàng",
                password_hash=hash_password("password123"),
                role_id=buyer_role.id,
                is_active=True
            )
            db.add(buyer)
            print("Buyer user created.")

        db.commit()
    except Exception as e:
        print(f"Error seeding data: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_users()
    print("Seeding new users done!")
