import sys, os
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal
from app.models import User
from app.auth.security import verify_password

db = SessionLocal()
users = db.query(User).all()

print("=== Users in DB ===")
for u in users:
    result = verify_password("password123", u.password_hash)
    print(f"Username: {u.username} | Hash: {u.password_hash[:40]}... | verify('password123'): {result}")

db.close()
