-- ==============================================================================
-- DATABASE SCHEMA & SEED DATA
-- Thiết kế Database Quản Lý Kho Thông Minh (Warehouse AI System)
-- Dựa trên tài liệu: DATABASE_DESIGN.md
-- Tương thích: SQLite 3 & SQLAlchemy 2.0
-- ==============================================================================

PRAGMA foreign_keys = ON;

-- ==============================================================================
-- 1. DROP EXISTING TABLES (Theo thứ tự ràng buộc khóa ngoại)
-- ==============================================================================
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS export_receipt_items;
DROP TABLE IF EXISTS export_receipts;
DROP TABLE IF EXISTS import_receipt_items;
DROP TABLE IF EXISTS import_receipts;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS suppliers;
DROP TABLE IF EXISTS units;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS roles;

-- ==============================================================================
-- 2. CREATE TABLES
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- BẢNG 1: roles (Vai trò người dùng trong hệ thống)
-- ------------------------------------------------------------------------------
CREATE TABLE roles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- BẢNG 2: users (Tài khoản người dùng và thông tin nhân sự)
-- ------------------------------------------------------------------------------
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    role_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- BẢNG 3: categories (Nhóm/Danh mục phân loại hàng hóa)
-- ------------------------------------------------------------------------------
CREATE TABLE categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- BẢNG 4: units (Đơn vị tính hàng hóa: Cái, Bộ, Hộp, Thùng...)
-- ------------------------------------------------------------------------------
CREATE TABLE units (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    abbreviation VARCHAR(10) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- BẢNG 5: suppliers (Nhà cung cấp hàng hóa)
-- ------------------------------------------------------------------------------
CREATE TABLE suppliers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    address TEXT,
    city VARCHAR(50),
    country VARCHAR(50) DEFAULT 'Việt Nam',
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------------------------
-- BẢNG 6: products (Hàng hóa trong kho - Thực thể cốt lõi)
-- ------------------------------------------------------------------------------
CREATE TABLE products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    category_id INTEGER NOT NULL,
    unit_id INTEGER NOT NULL,
    description TEXT,
    minimum_stock INTEGER NOT NULL DEFAULT 0,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_quantity INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_product_current_stock_positive CHECK (current_stock >= 0),
    CONSTRAINT ck_product_minimum_stock_positive CHECK (minimum_stock >= 0),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (unit_id) REFERENCES units(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- BẢNG 7: import_receipts (Phiếu nhập kho)
-- ------------------------------------------------------------------------------
CREATE TABLE import_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_code VARCHAR(50) NOT NULL UNIQUE,
    supplier_id INTEGER NOT NULL,
    receipt_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by INTEGER NOT NULL,
    confirmed_by INTEGER,
    confirmed_at DATETIME,
    notes TEXT,
    total_amount NUMERIC(15, 2) DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_import_receipt_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- BẢNG 8: import_receipt_items (Chi tiết mặt hàng trong phiếu nhập)
-- ------------------------------------------------------------------------------
CREATE TABLE import_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    import_receipt_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(15, 2) NOT NULL,
    total_amount NUMERIC(15, 2),
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_import_item_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ck_import_item_unit_price_positive CHECK (unit_price >= 0),
    CONSTRAINT uc_import_item_unique UNIQUE (import_receipt_id, product_id),
    FOREIGN KEY (import_receipt_id) REFERENCES import_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- BẢNG 9: export_receipts (Phiếu xuất kho)
-- ------------------------------------------------------------------------------
CREATE TABLE export_receipts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    receipt_code VARCHAR(50) NOT NULL UNIQUE,
    receipt_date DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
    created_by INTEGER NOT NULL,
    confirmed_by INTEGER,
    confirmed_at DATETIME,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_export_receipt_status CHECK (status IN ('DRAFT', 'CONFIRMED', 'CANCELLED')),
    FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- BẢNG 10: export_receipt_items (Chi tiết mặt hàng trong phiếu xuất)
-- ------------------------------------------------------------------------------
CREATE TABLE export_receipt_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    export_receipt_id INTEGER NOT NULL,
    product_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_export_item_quantity_positive CHECK (quantity > 0),
    CONSTRAINT uc_export_item_unique UNIQUE (export_receipt_id, product_id),
    FOREIGN KEY (export_receipt_id) REFERENCES export_receipts(id) ON DELETE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ------------------------------------------------------------------------------
-- BẢNG 11: inventory_transactions (Nhật ký biến động tồn kho - Audit Trail)
-- ------------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    product_id INTEGER NOT NULL,
    transaction_type VARCHAR(20) NOT NULL,
    quantity INTEGER NOT NULL,
    old_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    reference_type VARCHAR(20),
    reference_id INTEGER,
    created_by INTEGER NOT NULL,
    notes TEXT,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_inventory_transaction_type CHECK (transaction_type IN ('IMPORT', 'EXPORT')),
    CONSTRAINT ck_inventory_transaction_quantity_positive CHECK (quantity > 0),
    CONSTRAINT ck_inventory_transaction_new_stock_positive CHECK (new_stock >= 0),
    FOREIGN KEY (product_id) REFERENCES products(id) ON UPDATE CASCADE ON DELETE RESTRICT,
    FOREIGN KEY (created_by) REFERENCES users(id) ON UPDATE CASCADE ON DELETE RESTRICT
);

-- ==============================================================================
-- 3. INDEXES TỐI ƯU TRUY VẤN
-- ==============================================================================
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_unit ON products(unit_id);
CREATE INDEX idx_products_current_stock ON products(current_stock);
CREATE INDEX idx_products_is_active ON products(is_active);

CREATE INDEX idx_import_receipts_supplier ON import_receipts(supplier_id);
CREATE INDEX idx_import_receipts_status ON import_receipts(status);
CREATE INDEX idx_import_receipts_date ON import_receipts(receipt_date);
CREATE INDEX idx_import_items_receipt ON import_receipt_items(import_receipt_id);
CREATE INDEX idx_import_items_product ON import_receipt_items(product_id);

CREATE INDEX idx_export_receipts_status ON export_receipts(status);
CREATE INDEX idx_export_receipts_date ON export_receipts(receipt_date);
CREATE INDEX idx_export_items_receipt ON export_receipt_items(export_receipt_id);
CREATE INDEX idx_export_items_product ON export_receipt_items(product_id);

CREATE INDEX idx_inv_trans_product ON inventory_transactions(product_id);
CREATE INDEX idx_inv_trans_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inv_trans_created_at ON inventory_transactions(created_at);

-- ==============================================================================
-- 4. DỮ LIỆU KHỞI TẠO MẪU (SEED DATA)
-- Mật khẩu mặc định của tất cả các tài khoản: password123
-- ==============================================================================

-- 4.1. Roles
INSERT INTO roles (id, name, description) VALUES
(1, 'ADMIN', 'Quản trị viên toàn hệ thống - Quản lý nhân sự, danh mục, cấu hình và xem tất cả báo cáo'),
(2, 'STOREKEEPER', 'Thủ kho - Quản lý hàng hóa, lập và xác nhận phiếu nhập/xuất kho, kiểm kê tồn kho'),
(3, 'ACCOUNTANT', 'Kế toán kho - Theo dõi doanh thu, chi phí nhập xuất, đối chiếu công nợ và xem báo cáo AI');

-- 4.2. Users (Tất cả có mật khẩu: password123)
INSERT INTO users (id, username, email, password_hash, full_name, is_active, role_id) VALUES
(1, 'admin', 'admin@example.com', '$2b$12$.SaMx5kq5BKRPXfqKN.kjOdVZsJq32SL.KRqCEkGuup00nUKOfiOK', 'Quản Trị Viên', 1, 1),
(2, 'storekeeper', 'storekeeper@example.com', '$2b$12$.SaMx5kq5BKRPXfqKN.kjOdVZsJq32SL.KRqCEkGuup00nUKOfiOK', 'Nguyễn Văn Kho', 1, 2),
(3, 'accountant', 'accountant@example.com', '$2b$12$.SaMx5kq5BKRPXfqKN.kjOdVZsJq32SL.KRqCEkGuup00nUKOfiOK', 'Trần Thị Kế Toán', 1, 3),
(4, 'staff', 'staff@example.com', '$2b$12$.SaMx5kq5BKRPXfqKN.kjOdVZsJq32SL.KRqCEkGuup00nUKOfiOK', 'Lê Hoàng Nhân Viên', 1, 2);

-- 4.3. Categories
INSERT INTO categories (id, name, description, is_active) VALUES
(1, 'Linh kiện & Phụ kiện máy tính', 'Chuột máy tính, bàn phím cơ, tai nghe, cáp kết nối', 1),
(2, 'Máy tính & Laptop', 'Laptop văn phòng, máy tính để bàn, màn hình đồ họa', 1),
(3, 'Thiết bị mạng & Viễn thông', 'Router WiFi 6, bộ chia mạng Switch, cân bằng tải', 1),
(4, 'Văn phòng phẩm & Tiêu hao', 'Giấy in A4, bìa hồ sơ, mực in và thiết bị phụ trợ', 1);

-- 4.4. Units
INSERT INTO units (id, name, abbreviation) VALUES
(1, 'Cái', 'cái'),
(2, 'Bộ', 'bộ'),
(3, 'Hộp', 'hộp'),
(4, 'Thùng', 'thùng'),
(5, 'Chiếc', 'chiếc');

-- 4.5. Suppliers
INSERT INTO suppliers (id, code, name, contact_person, phone, email, address, city, country, is_active) VALUES
(1, 'SUP-001', 'Công ty Cổ phần Synnex FPT', 'Nguyễn Hoàng Long', '0901234567', 'synnex@fpt.com.vn', 'Tòa nhà FPT Cầu Giấy', 'Hà Nội', 'Việt Nam', 1),
(2, 'SUP-002', 'Công ty Cổ phần Thế Giới Số (Digiworld)', 'Trần Minh Quân', '0912345678', 'contact@digiworld.com.vn', '195 Điện Biên Phủ, P.15, Bình Thạnh', 'TP. Hồ Chí Minh', 'Việt Nam', 1),
(3, 'SUP-003', 'Công ty TNHH Công nghệ Viễn Sơn', 'Phạm Hồng Hải', '0987654321', 'support@vienson.vn', '175 Bùi Thị Xuân, Quận 1', 'TP. Hồ Chí Minh', 'Việt Nam', 1);

-- 4.6. Products
INSERT INTO products (id, code, name, category_id, unit_id, description, minimum_stock, current_stock, reorder_quantity, is_active) VALUES
(1, 'PROD-001', 'Laptop Dell Latitude 5420 Core i7-1185G7 / 16GB / 512GB', 2, 1, 'Laptop doanh nghiệp mỏng nhẹ, độ bền tiêu chuẩn quân đội', 5, 15, 10, 1),
(2, 'PROD-002', 'Chuột không dây công thái học Logitech MX Master 3S', 1, 1, 'Cảm biến 8000 DPI, cuộn điện từ MagSpeed êm ái', 10, 3, 20, 1),
(3, 'PROD-003', 'Bàn phím cơ Bluetooth Keychron K2 Pro Hot-swap RGB', 1, 1, 'Switch Gateron G Pro Brown, layout 75%, kết nối 3 thiết bị', 8, 0, 15, 1),
(4, 'PROD-004', 'Màn hình chuyên đồ họa Dell UltraSharp U2723QE 27 inch 4K IPS Black', 2, 1, 'Tỉ lệ tương phản 2000:1, 98% DCI-P3, cổng Type-C 90W', 5, 12, 10, 1),
(5, 'PROD-005', 'Hệ thống Mesh WiFi 6 TP-Link Deco X50 (Bộ 3 thiết bị AX3000)', 3, 2, 'Phủ sóng lên đến 600m2, roaming liền mạch chuẩn 802.11k/v/r', 6, 2, 12, 1),
(6, 'PROD-006', 'Tai nghe chụp tai chống ồn không dây Sony WH-1000XM5', 1, 1, 'Bộ xử lý chống ồn V1/QN1, hỗ trợ codec LDAC cao cấp', 5, 8, 10, 1),
(7, 'PROD-007', 'Thùng giấy in ảnh cao cấp Double A A4 định lượng 80gsm (5 ram/thùng)', 4, 4, 'Độ trắng 148 CIE, chống kẹt giấy khi in ấn số lượng lớn', 20, 50, 30, 1);

-- 4.7. Import Receipts (Phiếu nhập kho)
INSERT INTO import_receipts (id, receipt_code, supplier_id, receipt_date, status, created_by, confirmed_by, confirmed_at, notes, total_amount) VALUES
(1, 'IMP-20260901-001', 1, '2026-09-01', 'CONFIRMED', 2, 1, '2026-09-01 10:30:00', 'Nhập đợt 1 thiết bị đầu tháng 9 từ FPT Synnex', 190000000),
(2, 'IMP-20260915-002', 2, '2026-09-15', 'CONFIRMED', 2, 1, '2026-09-15 14:15:00', 'Nhập bổ sung màn hình đồ họa Dell từ Digiworld', 144000000),
(3, 'IMP-20260924-003', 3, '2026-09-24', 'DRAFT', 2, NULL, NULL, 'Phiếu dự thảo nhập thiết bị mạng Viễn Sơn', 36000000);

-- 4.8. Import Receipt Items (Chi tiết phiếu nhập)
INSERT INTO import_receipt_items (id, import_receipt_id, product_id, quantity, unit_price, total_amount, notes) VALUES
(1, 1, 1, 10, 18000000, 180000000, 'Laptop Dell Latitude 5420 nguyên seal'),
(2, 1, 2, 5, 2000000, 10000000, 'Chuột Logitech MX Master 3S Graphite'),
(3, 2, 4, 12, 12000000, 144000000, 'Màn hình Dell U2723QE thùng nguyên vẹn'),
(4, 3, 5, 12, 3000000, 36000000, 'Đợt hàng TP-Link Deco X50 chờ giao');

-- 4.9. Export Receipts (Phiếu xuất kho)
INSERT INTO export_receipts (id, receipt_code, receipt_date, status, created_by, confirmed_by, confirmed_at, notes) VALUES
(1, 'EXP-20260910-001', '2026-09-10', 'CONFIRMED', 2, 1, '2026-09-10 16:45:00', 'Xuất cấp thiết bị cho phòng Marketing và IT'),
(2, 'EXP-20260922-002', '2026-09-22', 'DRAFT', 2, NULL, NULL, 'Dự thảo xuất phục vụ văn phòng mới');

-- 4.10. Export Receipt Items (Chi tiết phiếu xuất)
INSERT INTO export_receipt_items (id, export_receipt_id, product_id, quantity, notes) VALUES
(1, 1, 2, 2, 'Cấp 2 chuột MX Master 3S cho Designer'),
(2, 2, 1, 1, 'Dự kiến cấp laptop cho nhân sự mới');

-- 4.11. Inventory Transactions (Nhật ký giao dịch tồn kho)
INSERT INTO inventory_transactions (id, product_id, transaction_type, quantity, old_stock, new_stock, reference_type, reference_id, created_by, notes, created_at) VALUES
(1, 1, 'IMPORT', 10, 5, 15, 'IMPORT_RECEIPT', 1, 2, 'Nhập kho phiếu IMP-20260901-001', '2026-09-01 10:30:00'),
(2, 2, 'IMPORT', 5, 0, 5, 'IMPORT_RECEIPT', 1, 2, 'Nhập kho phiếu IMP-20260901-001', '2026-09-01 10:30:00'),
(3, 4, 'IMPORT', 12, 0, 12, 'IMPORT_RECEIPT', 2, 2, 'Nhập kho phiếu IMP-20260915-002', '2026-09-15 14:15:00'),
(4, 2, 'EXPORT', 2, 5, 3, 'EXPORT_RECEIPT', 1, 2, 'Xuất kho phiếu EXP-20260910-001', '2026-09-10 16:45:00');
