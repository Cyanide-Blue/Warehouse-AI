#!/usr/bin/env python
"""Test script for CRUD endpoints"""
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, SessionLocal
from app.models import Role, User, Category, Unit
from app.auth.security import hash_password

# Initialize database
init_db()

# Clear and seed data
db = SessionLocal()

# Delete in correct order due to foreign keys
try:
    db.query(User).delete()
    db.query(Role).delete()
    db.query(Category).delete()
    db.query(Unit).delete()
    db.commit()
except Exception:
    db.rollback()
    pass  # Tables might be empty already

# Add roles
db.add_all([
    Role(name='ADMIN', description='Admin'),
    Role(name='STOREKEEPER', description='Storekeeper'),
    Role(name='ACCOUNTANT', description='Accountant')
])
db.commit()

# Add user
db.add(User(
    username='admin',
    email='admin@example.com',
    full_name='Admin User',
    password_hash=hash_password('password123'),
    role_id=1,
    is_active=True
))

# Add test data
db.add_all([
    Category(name='Electronics', description='Electronics products', is_active=True),
    Category(name='Accessories', description='Accessories', is_active=True)
])
db.add_all([
    Unit(name='Piece', abbreviation='pcs'),
    Unit(name='Box', abbreviation='box')
])
db.commit()
db.close()

# Test API
client = TestClient(app)

# Login
login_resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'password123'})
token = login_resp.json()['data']['access_token']
headers = {'Authorization': f'Bearer {token}'}

print("=" * 60)
print("API ENDPOINT TESTS")
print("=" * 60)

# Test product list
print("\n1. GET /api/products")
prod_resp = client.get('/api/products', headers=headers)
print(f"   Status: {prod_resp.status_code}")
if prod_resp.status_code == 200:
    data = prod_resp.json()
    print(f"   Count: {data['pagination']['count']}")

# Test category list
print("\n2. GET /api/categories")
cat_resp = client.get('/api/categories', headers=headers)
print(f"   Status: {cat_resp.status_code}")
if cat_resp.status_code == 200:
    data = cat_resp.json()
    print(f"   Count: {data['pagination']['count']}")
    print(f"   Items: {[c['name'] for c in data['data']]}")

# Test unit list
print("\n3. GET /api/units")
unit_resp = client.get('/api/units', headers=headers)
print(f"   Status: {unit_resp.status_code}")
if unit_resp.status_code == 200:
    data = unit_resp.json()
    print(f"   Count: {data['pagination']['count']}")
    print(f"   Items: {[u['name'] for u in data['data']]}")

# Test create product
print("\n4. POST /api/products (create)")
create_prod = client.post(
    '/api/products',
    headers=headers,
    json={
        'code': 'PROD-001',
        'name': 'Laptop',
        'category_id': 1,
        'unit_id': 1,
        'minimum_stock': 5,
        'description': 'High-end laptop'
    }
)
print(f"   Status: {create_prod.status_code}")
if create_prod.status_code == 200:
    print(f"   Product: {create_prod.json()['data']['name']}")

print("\n" + "=" * 60)
print("✅ All tests completed")
print("=" * 60)
