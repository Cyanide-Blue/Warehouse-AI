#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
WAREHOUSE AI - COMPREHENSIVE SYSTEM TEST SUITE (32 TEST CASES)
Kiểm thử tự động toàn diện các chức năng của hệ thống Quản lý kho thông minh.
Bao gồm: Auth/RBAC, Master Data, Products, Imports, Exports, Reports, AI Engine, Web Inspector.
"""
import sys
import os
import unittest
import time
from datetime import date
from fastapi.testclient import TestClient

# Đảm bảo UTF-8 trên Windows console
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Thêm đường dẫn backend vào sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.main import app
from app.database import init_db, SessionLocal
from app.models import Role, User, Category, Unit, Supplier, Product, ImportReceipt, ExportReceipt
from app.auth.security import hash_password

class WarehouseAISystemTestSuite(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        """Khởi tạo môi trường kiểm thử và client"""
        init_db()
        cls.client = TestClient(app)
        cls.db = SessionLocal()
        
        # Đảm bảo roles và tài khoản admin tồn tại
        admin_role = cls.db.query(Role).filter(Role.name == 'ADMIN').first()
        if not admin_role:
            cls.db.add_all([
                Role(name='ADMIN', description='Admin'),
                Role(name='STOREKEEPER', description='Storekeeper'),
                Role(name='ACCOUNTANT', description='Accountant')
            ])
            cls.db.commit()
            
        admin_user = cls.db.query(User).filter(User.username == 'admin').first()
        if not admin_user:
            cls.db.add(User(
                username='admin',
                email='admin@warehouse.ai',
                full_name='System Administrator',
                password_hash=hash_password('password123'),
                role_id=1,
                is_active=True
            ))
            cls.db.commit()
            
        # Lấy token đăng nhập cho Admin
        login_res = cls.client.post('/api/auth/login', json={'username': 'admin', 'password': 'password123'})
        assert login_res.status_code == 200, "Đăng nhập admin thất bại trong quá trình setup"
        cls.admin_token = login_res.json()['data']['access_token']
        cls.headers = {'Authorization': f'Bearer {cls.admin_token}'}

    @classmethod
    def tearDownClass(cls):
        cls.db.close()

    # =========================================================================
    # MODULE 1: XÁC THỰC & PHÂN QUYỀN (AUTHENTICATION & RBAC)
    # =========================================================================
    def test_tc01_login_success_admin(self):
        """TC-01: Đăng nhập thành công với tài khoản Admin hợp lệ"""
        resp = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'password123'})
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data.get('status'), 'success')
        self.assertIn('access_token', data['data'])
        self.assertEqual(data['data']['user']['username'], 'admin')

    def test_tc02_login_fail_wrong_password(self):
        """TC-02: Đăng nhập thất bại khi nhập sai mật khẩu (Báo lỗi 401 Unauthorized)"""
        resp = self.client.post('/api/auth/login', json={'username': 'admin', 'password': 'wrong_password_999'})
        self.assertEqual(resp.status_code, 401)
        self.assertIn('detail', resp.json())

    def test_tc03_login_fail_nonexistent_user(self):
        """TC-03: Đăng nhập thất bại khi tên đăng nhập không tồn tại (401)"""
        resp = self.client.post('/api/auth/login', json={'username': 'user_khong_ton_tai_xyz', 'password': 'password123'})
        self.assertEqual(resp.status_code, 401)

    def test_tc04_get_current_user_profile(self):
        """TC-04: Lấy thông tin tài khoản hiện tại qua GET /api/auth/me với Bearer Token"""
        resp = self.client.get('/api/auth/me', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        user_info = resp.json().get('data', resp.json())
        self.assertEqual(user_info['username'], 'admin')
        self.assertIn('email', user_info)

    def test_tc05_rbac_unauthorized_access(self):
        """TC-05: Kiểm tra từ chối truy cập tài nguyên khi không đính kèm Bearer Token (401)"""
        resp = self.client.get('/api/products')
        self.assertEqual(resp.status_code, 401)

    # =========================================================================
    # MODULE 2: QUẢN LÝ DỮ LIỆU NỀN TẢNG (MASTER DATA)
    # =========================================================================
    def test_tc06_get_categories_list(self):
        """TC-06: Lấy danh sách ngành hàng / danh mục (GET /api/categories)"""
        resp = self.client.get('/api/categories', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)

    def test_tc07_get_units_list(self):
        """TC-07: Lấy danh sách đơn vị tính (GET /api/units)"""
        resp = self.client.get('/api/units', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)

    def test_tc08_get_suppliers_list(self):
        """TC-08: Lấy danh sách nhà cung cấp (GET /api/suppliers)"""
        resp = self.client.get('/api/suppliers', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)

    def test_tc09_create_new_supplier(self):
        """TC-09: Thêm mới nhà cung cấp hợp lệ (POST /api/suppliers)"""
        unique_code = f"SUP-TEST-{int(time.time())}"
        payload = {
            'code': unique_code,
            'name': 'Nhà Cung Cấp Test Thiết Bị',
            'contact_person': 'Nguyễn Văn Test',
            'phone': '0987654321',
            'email': f'{unique_code.lower()}@supplier.vn',
            'address': 'Hà Nội, Việt Nam',
            'city': 'Hà Nội',
            'country': 'Việt Nam'
        }
        resp = self.client.post('/api/suppliers', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['data']['code'], unique_code)

    # =========================================================================
    # MODULE 3: QUẢN LÝ HÀNG HÓA & ĐỊNH MỨC TỒN (PRODUCTS MANAGEMENT)
    # =========================================================================
    def test_tc10_get_products_list(self):
        """TC-10: Lấy danh sách hàng hóa kèm số lượng tồn và đơn vị (GET /api/products)"""
        resp = self.client.get('/api/products', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)

    def test_tc11_create_new_product(self):
        """TC-11: Thêm mới sản phẩm với mã SKU duy nhất và mức tồn an toàn"""
        unique_sku = f"SKU-{int(time.time())}"
        payload = {
            'code': unique_sku,
            'name': 'Sản phẩm Test Tự Động',
            'description': 'Mô tả sản phẩm test hệ thống WMS',
            'category_id': 1,
            'unit_id': 1,
            'minimum_stock': 15,
            'price': 250000
        }
        resp = self.client.post('/api/products', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        created = resp.json()['data']
        self.assertEqual(created['code'], unique_sku)
        self.assertEqual(created['minimum_stock'], 15)

    def test_tc12_create_product_duplicate_sku(self):
        """TC-12: Ngăn chặn tạo sản phẩm trùng mã SKU (Trả về lỗi 409 Conflict hoặc 400)"""
        duplicate_sku = f"DUP-SKU-{int(time.time())}"
        payload = {
            'code': duplicate_sku,
            'name': 'Sản phẩm gốc',
            'category_id': 1,
            'unit_id': 1,
            'minimum_stock': 5
        }
        resp1 = self.client.post('/api/products', headers=self.headers, json=payload)
        self.assertEqual(resp1.status_code, 200)

        # Cố tình tạo sản phẩm thứ hai cùng SKU
        resp2 = self.client.post('/api/products', headers=self.headers, json=payload)
        self.assertIn(resp2.status_code, [400, 409])

    def test_tc13_get_low_stock_products(self):
        """TC-13: Lọc danh sách sản phẩm dưới mức tồn tối thiểu (GET /api/products/stock/low-stock)"""
        resp = self.client.get('/api/products/stock/low-stock', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)

    def test_tc14_delete_product(self):
        """TC-14: Soft delete sản phẩm (DELETE /api/products/{id} -> is_active=False)"""
        temp_sku = f"TEMP-DEL-{int(time.time())}"
        res = self.client.post('/api/products', headers=self.headers, json={
            'code': temp_sku,
            'name': 'Sản phẩm tạm xóa',
            'category_id': 1,
            'unit_id': 1,
            'minimum_stock': 0
        })
        prod_id = res.json()['data']['id']

        # Xóa sản phẩm
        del_res = self.client.delete(f'/api/products/{prod_id}', headers=self.headers)
        self.assertEqual(del_res.status_code, 200)

        # Kiểm tra sản phẩm đã chuyển trạng thái is_active=False
        get_res = self.client.get(f'/api/products/{prod_id}', headers=self.headers)
        self.assertEqual(get_res.status_code, 200)
        self.assertFalse(get_res.json()['data']['is_active'])

    # =========================================================================
    # MODULE 4: QUẢN LÝ NHẬP KHO (IMPORT MANAGEMENT)
    # =========================================================================
    def test_tc15_create_import_receipt_draft(self):
        """TC-15: Lập phiếu nhập kho ở trạng thái Bản nháp (DRAFT) - Chưa tăng tồn kho"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        self.assertTrue(len(prods) > 0, "Không có sản phẩm để test")
        target_prod = prods[0]
        initial_stock = target_prod['current_stock']

        payload = {
            'supplier_id': 1,
            'receipt_date': str(date.today()),
            'notes': 'Test lập phiếu nhập kho bản nháp',
            'auto_confirm': False,
            'items': [{'product_id': target_prod['id'], 'quantity': 10, 'unit_price': 50000}]
        }
        resp = self.client.post('/api/imports', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        receipt = resp.json()['data']
        self.assertEqual(receipt['status'], 'DRAFT')

        # Tồn kho không đổi khi phiếu ở trạng thái DRAFT
        after_prod = self.client.get(f"/api/products/{target_prod['id']}", headers=self.headers).json()['data']
        self.assertEqual(after_prod['current_stock'], initial_stock)

    def test_tc16_create_import_receipt_auto_confirm(self):
        """TC-16: Lập phiếu nhập kho với auto_confirm=True - Tồn kho tăng ngay lập tức"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        target_prod = prods[0]
        initial_stock = target_prod['current_stock']
        import_qty = 15

        payload = {
            'supplier_id': 1,
            'receipt_date': str(date.today()),
            'notes': 'Test lập phiếu nhập kho auto_confirm',
            'auto_confirm': True,
            'items': [{'product_id': target_prod['id'], 'quantity': import_qty, 'unit_price': 60000}]
        }
        resp = self.client.post('/api/imports', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['data']['status'], 'CONFIRMED')

        # Kiểm tra tồn kho tăng đúng bằng import_qty
        after_prod = self.client.get(f"/api/products/{target_prod['id']}", headers=self.headers).json()['data']
        self.assertEqual(after_prod['current_stock'], initial_stock + import_qty)

    def test_tc17_confirm_draft_import_receipt(self):
        """TC-17: Xác nhận phiếu nhập kho bản nháp (POST /api/imports/{id}/confirm) - Tăng tồn kho"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        target_prod = prods[0]
        initial_stock = target_prod['current_stock']
        qty = 8

        draft_resp = self.client.post('/api/imports', headers=self.headers, json={
            'supplier_id': 1,
            'receipt_date': str(date.today()),
            'notes': 'Phiếu nháp chờ duyệt',
            'auto_confirm': False,
            'items': [{'product_id': target_prod['id'], 'quantity': qty, 'unit_price': 70000}]
        })
        receipt_id = draft_resp.json()['data']['id']

        confirm_resp = self.client.post(f'/api/imports/{receipt_id}/confirm', headers=self.headers)
        self.assertEqual(confirm_resp.status_code, 200)
        self.assertEqual(confirm_resp.json()['data']['status'], 'CONFIRMED')

        after_prod = self.client.get(f"/api/products/{target_prod['id']}", headers=self.headers).json()['data']
        self.assertEqual(after_prod['current_stock'], initial_stock + qty)

    def test_tc18_cancel_draft_import_receipt(self):
        """TC-18: Hủy phiếu nhập kho đang ở trạng thái bản nháp (POST /api/imports/{id}/cancel)"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        draft_resp = self.client.post('/api/imports', headers=self.headers, json={
            'supplier_id': 1,
            'receipt_date': str(date.today()),
            'notes': 'Phiếu chuẩn bị hủy',
            'auto_confirm': False,
            'items': [{'product_id': prods[0]['id'], 'quantity': 5, 'unit_price': 10000}]
        })
        receipt_id = draft_resp.json()['data']['id']

        cancel_resp = self.client.post(f'/api/imports/{receipt_id}/cancel', headers=self.headers)
        self.assertEqual(cancel_resp.status_code, 200)
        self.assertEqual(cancel_resp.json()['data']['status'], 'CANCELLED')

    def test_tc19_import_validation_zero_negative_qty(self):
        """TC-19: Kiểm thực dữ liệu (Validation): Từ chối số lượng nhập <= 0 (422/400)"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        payload = {
            'supplier_id': 1,
            'receipt_date': str(date.today()),
            'items': [{'product_id': prods[0]['id'], 'quantity': -5, 'unit_price': 10000}]
        }
        resp = self.client.post('/api/imports', headers=self.headers, json=payload)
        self.assertIn(resp.status_code, [400, 422])

    # =========================================================================
    # MODULE 5: QUẢN LÝ XUẤT KHO & CHỐNG XUẤT ÂM (EXPORT MANAGEMENT)
    # =========================================================================
    def test_tc20_create_and_confirm_export_receipt(self):
        """TC-20: Xuất kho thành công & Khấu trừ tồn kho sau khi xác nhận xuất"""
        # Đảm bảo sản phẩm có tồn kho bằng cách nạp 20 cái
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        target_prod = prods[0]
        self.client.post('/api/imports', headers=self.headers, json={
            'supplier_id': 1,
            'receipt_date': str(date.today()),
            'auto_confirm': True,
            'items': [{'product_id': target_prod['id'], 'quantity': 20, 'unit_price': 50000}]
        })
        current_stock = self.client.get(f"/api/products/{target_prod['id']}", headers=self.headers).json()['data']['current_stock']

        export_qty = 5
        payload = {
            'receipt_date': str(date.today()),
            'notes': 'Test tạo và xác nhận xuất kho',
            'items': [{'product_id': target_prod['id'], 'quantity': export_qty}]
        }
        create_resp = self.client.post('/api/exports', headers=self.headers, json=payload)
        self.assertEqual(create_resp.status_code, 200)
        receipt_id = create_resp.json()['data']['id']

        # Xác nhận xuất kho để trừ tồn thực tế
        confirm_resp = self.client.post(f'/api/exports/{receipt_id}/confirm', headers=self.headers)
        self.assertEqual(confirm_resp.status_code, 200)

        # Kiểm tra tồn kho đã giảm chính xác bằng export_qty
        after_stock = self.client.get(f"/api/products/{target_prod['id']}", headers=self.headers).json()['data']['current_stock']
        self.assertEqual(after_stock, current_stock - export_qty)

    def test_tc21_prevent_negative_stock_on_export(self):
        """TC-21: Chống xuất âm - Từ chối xuất kho khi số lượng vượt tồn kho khả dụng (400)"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        target_prod = prods[0]
        current_stock = target_prod['current_stock']

        # Cố tình yêu cầu xuất vượt quá tồn kho
        over_quantity = current_stock + 99999
        payload = {
            'receipt_date': str(date.today()),
            'notes': 'Test cố tình xuất âm kho',
            'items': [{'product_id': target_prod['id'], 'quantity': over_quantity}]
        }
        resp = self.client.post('/api/exports', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 400)
        detail = resp.json().get('detail', '').lower()
        self.assertTrue('insufficient' in detail or 'không đủ' in detail)

    def test_tc22_get_export_receipts_list(self):
        """TC-22: Lấy danh sách lịch sử phiếu xuất kho (GET /api/exports)"""
        resp = self.client.get('/api/exports', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)
        self.assertIsInstance(data['data'], list)

    def test_tc23_get_export_receipt_by_id(self):
        """TC-23: Xem chi tiết chứng từ phiếu xuất kho kèm danh sách mặt hàng (GET /api/exports/{id})"""
        exports = self.client.get('/api/exports', headers=self.headers).json()['data']
        if exports:
            first_id = exports[0]['id']
            resp = self.client.get(f'/api/exports/{first_id}', headers=self.headers)
            self.assertEqual(resp.status_code, 200)
            self.assertEqual(resp.json()['data']['id'], first_id)

    # =========================================================================
    # MODULE 6: BÁO CÁO & THỐNG KÊ KHO (REPORTS & ANALYTICS)
    # =========================================================================
    def test_tc24_get_analytics_report_week(self):
        """TC-24: Lấy báo cáo phân tích tổng quan theo tuần (GET /api/reports/analytics?timeframe=WEEK)"""
        resp = self.client.get('/api/reports/analytics?timeframe=WEEK', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()['data']
        self.assertIn('kpi_summary', data)
        self.assertIn('total_stock', data['kpi_summary'])
        self.assertIn('inbound_outbound_trend', data)

    def test_tc25_get_analytics_report_month(self):
        """TC-25: Lấy báo cáo phân tích tổng quan theo tháng (GET /api/reports/analytics?timeframe=MONTH)"""
        resp = self.client.get('/api/reports/analytics?timeframe=MONTH', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()['data']
        self.assertEqual(data['timeframe'], 'MONTH')

    def test_tc26_get_inventory_status_report(self):
        """TC-26: Trích xuất báo cáo tình trạng toàn bộ tồn kho (GET /api/reports/inventory)"""
        resp = self.client.get('/api/reports/inventory', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertIn('data', data)
        self.assertIn('total_products', data)

    # =========================================================================
    # MODULE 7: TRÍ TUỆ NHÂN TẠO AI ENGINE (WAREHOUSE HEALTH & REORDER)
    # =========================================================================
    def test_tc27_get_ai_status(self):
        """TC-27: Kiểm tra trạng thái hoạt động của mô hình AI (GET /api/ai/status)"""
        resp = self.client.get('/api/ai/status')
        self.assertEqual(resp.status_code, 200)
        data = resp.json()
        self.assertEqual(data['status'], 'online')
        self.assertIn('Gemini', data['engine'])

    def test_tc28_ai_warehouse_analytics_and_health_score(self):
        """TC-28: Tính toán Chỉ số Sức khỏe Kho Hàng (0-100 điểm) và phát hiện bất thường"""
        resp = self.client.get('/api/ai/analytics', headers=self.headers)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()['data']
        self.assertIn('health_score', data)
        self.assertTrue(0 <= data['health_score'] <= 100)
        self.assertIn('health_status', data)
        self.assertIn('recommendations', data)

    def test_tc29_apply_ai_smart_reorder_recommendation(self):
        """TC-29: Tự động tạo phiếu nhập kho từ khuyến nghị Smart Reorder của AI"""
        prods = self.client.get('/api/products', headers=self.headers).json()['data']
        payload = {
            'product_id': prods[0]['id'],
            'quantity': 25,
            'supplier_id': 1
        }
        resp = self.client.post('/api/ai/apply-recommendation', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        self.assertIn('thành công', resp.json().get('message', '').lower())

    # =========================================================================
    # MODULE 8: TRỢ LÝ MUA HÀNG & BÓC TÁCH WEB (BUYER AI COPILOT & WEB INSPECTOR)
    # =========================================================================
    def test_tc30_web_inspector_read_url(self):
        """TC-30: Trợ lý đọc và bóc tách cấu trúc liên kết website (POST /api/ai/read-web)"""
        test_url = "https://tiki.vn"
        resp = self.client.post('/api/ai/read-web', headers=self.headers, json={'url': test_url})
        self.assertIn(resp.status_code, [200, 400])
        if resp.status_code == 200:
            data = resp.json()['data']
            self.assertIn('domain', data)

    def test_tc31_buyer_copilot_chat(self):
        """TC-31: Tương tác tư vấn mua sắm và đối chiếu kho với Gemini Buyer Copilot"""
        payload = {
            'message': 'Sản phẩm nào trong kho đang có sẵn số lượng lớn?',
            'include_warehouse_data': True
        }
        resp = self.client.post('/api/ai/buyer-chat', headers=self.headers, json=payload)
        self.assertEqual(resp.status_code, 200)
        data = resp.json()['data']
        self.assertIn('reply', data)
        self.assertTrue(len(data['reply']) > 0)

    # =========================================================================
    # MODULE 9: KIỂM TRA HỆ THỐNG & HEALTH CHECK
    # =========================================================================
    def test_tc32_system_health_check(self):
        """TC-32: Kiểm tra endpoint giám sát tình trạng hệ thống tổng thể (GET /health)"""
        resp = self.client.get('/health')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.json()['status'], 'ok')


if __name__ == '__main__':
    print("=" * 80)
    print("🚀 BẮT ĐẦU CHẠY BỘ KIỂM THỬ TỰ ĐỘNG WAREHOUSE AI (32 TEST CASES)")
    print("=" * 80)
    suite = unittest.TestLoader().loadTestsFromTestCase(WarehouseAISystemTestSuite)
    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)
    print("=" * 80)
    if result.wasSuccessful():
        print(f"✅ HOÀN TẤT: {result.testsRun}/{result.testsRun} TEST CASES ĐÃ ĐẠT (100% PASS)!")
    else:
        print(f"❌ KẾT QUẢ: {len(result.failures)} thất bại, {len(result.errors)} lỗi trên tổng số {result.testsRun} test cases.")
    print("=" * 80)
    sys.exit(0 if result.wasSuccessful() else 1)
