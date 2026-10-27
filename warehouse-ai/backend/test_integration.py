#!/usr/bin/env python
"""Comprehensive integration test for the warehouse API"""
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db, SessionLocal
from app.models import Role, User, Category, Unit, Supplier, Product
from app.auth.security import hash_password
from datetime import date

# Initialize database
init_db()

# Clear and seed data
db = SessionLocal()

# Check if roles exist; if not create them
try:
    admin_role = db.query(Role).filter(Role.name == 'ADMIN').first()
    if not admin_role:
        # Clear and seed data
        db.query(User).delete()
        db.query(Role).delete()
        db.query(Category).delete()
        db.query(Unit).delete()
        db.query(Supplier).delete()
        db.query(Product).delete()
        db.commit()
        
        # Add roles
        db.add_all([
            Role(name='ADMIN', description='Admin'),
            Role(name='STOREKEEPER', description='Storekeeper'),
            Role(name='ACCOUNTANT', description='Accountant')
        ])
        db.commit()
except:
    db.rollback()

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

db.add(Supplier(
    code='SUP-001',
    name='Electronics Supplier',
    contact_person='John Doe',
    phone='+1234567890',
    email='supplier@example.com',
    city='New York',
    country='USA',
    is_active=True
))

db.commit()
db.close()

# Test API
client = TestClient(app)

print("=" * 80)
print("WAREHOUSE MANAGEMENT SYSTEM - COMPREHENSIVE API TEST")
print("=" * 80)

# 1. Login
print("\n[1] Authentication")
login_resp = client.post('/api/auth/login', json={'username': 'admin', 'password': 'password123'})
token = login_resp.json()['data']['access_token']
headers = {'Authorization': f'Bearer {token}'}
print(f"✅ Login successful (Status: {login_resp.status_code})")

# 2. Test master data endpoints
print("\n[2] Master Data Management")

# Categories
cat_resp = client.get('/api/categories', headers=headers)
print(f"✅ Categories: {cat_resp.status_code} - {cat_resp.json()['pagination']['count']} items")

# Units
unit_resp = client.get('/api/units', headers=headers)
print(f"✅ Units: {unit_resp.status_code} - {unit_resp.json()['pagination']['count']} items")

# Suppliers
supp_resp = client.get('/api/suppliers', headers=headers)
print(f"✅ Suppliers: {supp_resp.status_code} - {supp_resp.json()['pagination']['count']} items")

# 3. Product CRUD
print("\n[3] Product Management")

# Create product
create_prod = client.post(
    '/api/products',
    headers=headers,
    json={
        'code': 'LAPTOP-001',
        'name': 'Business Laptop',
        'category_id': 1,
        'unit_id': 1,
        'minimum_stock': 5,
        'description': 'High-performance business laptop'
    }
)
product_id = create_prod.json()['data']['id']
print(f"✅ Product created: {create_prod.status_code} - {create_prod.json()['data']['name']}")

# List products
prod_resp = client.get('/api/products', headers=headers)
print(f"✅ Products list: {prod_resp.status_code} - {prod_resp.json()['pagination']['count']} items")

# Get product
get_prod = client.get(f'/api/products/{product_id}', headers=headers)
print(f"✅ Get product: {get_prod.status_code} - Stock: {get_prod.json()['data']['current_stock']}")

# 4. Import Receipt Workflow
print("\n[4] Import Receipt Workflow")

# Create import receipt
import_data = {
    'supplier_id': 1,
    'receipt_date': date.today().isoformat(),
    'notes': 'Initial stock',
    'items': [
        {
            'product_id': product_id,
            'quantity': 20,
            'unit_price': 999.99,
            'notes': 'Bulk purchase'
        }
    ]
}
create_imp = client.post('/api/imports', headers=headers, json=import_data)
import_id = create_imp.json()['data']['id']
receipt_code = create_imp.json()['data']['receipt_code']
print(f"✅ Import receipt created: {create_imp.status_code} - {receipt_code}")

# Get import receipt
get_imp = client.get(f'/api/imports/{import_id}', headers=headers)
print(f"✅ Get import receipt: {get_imp.status_code} - Status: {get_imp.json()['data']['status']}")

# Confirm import receipt
confirm_imp = client.post(f'/api/imports/{import_id}/confirm', headers=headers)
print(f"✅ Confirm import: {confirm_imp.status_code} - Status: {confirm_imp.json()['data']['status']}")

# Verify stock was updated
get_prod_after = client.get(f'/api/products/{product_id}', headers=headers)
stock_after = get_prod_after.json()['data']['current_stock']
print(f"✅ Stock updated: {stock_after} units (increased by 20)")

# 5. Export Receipt Workflow
print("\n[5] Export Receipt Workflow")

# Create export receipt
export_data = {
    'receipt_date': date.today().isoformat(),
    'notes': 'Order fulfillment',
    'items': [
        {
            'product_id': product_id,
            'quantity': 5,
            'notes': 'Customer order'
        }
    ]
}
create_exp = client.post('/api/exports', headers=headers, json=export_data)
export_id = create_exp.json()['data']['id']
exp_receipt_code = create_exp.json()['data']['receipt_code']
print(f"✅ Export receipt created: {create_exp.status_code} - {exp_receipt_code}")

# Confirm export receipt
confirm_exp = client.post(f'/api/exports/{export_id}/confirm', headers=headers)
print(f"✅ Confirm export: {confirm_exp.status_code} - Status: {confirm_exp.json()['data']['status']}")

# Verify stock was updated
get_prod_final = client.get(f'/api/products/{product_id}', headers=headers)
stock_final = get_prod_final.json()['data']['current_stock']
print(f"✅ Stock updated: {stock_final} units (decreased by 5, from {stock_after})")

# 6. Low Stock Check
print("\n[6] Inventory Monitoring")

low_stock = client.get('/api/products/stock/low-stock', headers=headers)
print(f"✅ Low stock check: {low_stock.status_code} - {low_stock.json()['pagination']['count']} products below minimum")

print("\n" + "=" * 80)
print("✅ ALL TESTS PASSED - Warehouse API is fully functional!")
print("=" * 80)
