# 📦 Warehouse AI - Hệ Thống Quản Lý Kho Thông Minh Tích Hợp AI

Hệ thống quản lý kho hàng hiện đại được xây dựng trên nền tảng **FastAPI (Backend)** và **React 19 + Vite (Frontend)**, tích hợp các mô hình Trí tuệ Nhân tạo (**Google Gemini 3.5 Flash**) nhằm tối ưu hóa chuỗi cung ứng, phân tích sức khỏe kho hàng và hỗ trợ người mua thông minh.

---

## 🚀 Tính năng Nổi bật

### 1. Quản lý Kho Toàn diện (Core WMS)
- **Quản lý danh mục & hàng hóa**: Phân loại theo ngành hàng, đơn vị tính, nhà cung cấp, mã SKU/Barcode.
- **Theo dõi tồn kho thời gian thực**: Cập nhật tồn kho tự động sau mỗi giao dịch nhập/xuất, cảnh báo khi chạm ngưỡng tối thiểu.
- **Quy trình Nhập - Xuất kho chuẩn mực**: Tạo phiếu nhập/xuất kho nhiều mặt hàng, kiểm tra số dư khả dụng, phòng chống xuất âm.
- **Phân quyền người dùng (RBAC)**: Phân quyền theo vai trò `ADMIN`, `STOREKEEPER` (Thủ kho), `ACCOUNTANT` (Kế toán), `STAFF`.

### 2. Trí Tuệ Nhân Tạo & Dự Báo (AI Engine)
- **Chỉ số Sức khỏe Kho Hàng (Warehouse Health Score)**: Đánh giá sức khỏe kho từ 0 - 100 điểm dựa trên tỷ lệ thiếu hụt tồn kho, tốc độ luân chuyển và rủi ro đứt gãy cung ứng.
- **Cảnh báo Bất thường (Anomaly Detection)**: Phát hiện sản phẩm cạn kiệt, lệch định mức hoặc nguy cơ thiếu hàng trước thời hạn.
- **Gợi ý Bổ sung Tối ưu (Smart Reorder)**: Đề xuất số lượng đặt hàng tiêu chuẩn, chọn nhà cung cấp uy tín và hỗ trợ tạo nhanh phiếu nhập chỉ với 1 click.
- **Thuật toán Xếp hàng Thông minh (Smart Slotting)**: Heuristic đa mục tiêu dựa trên phân tích ABC, công thái học (Ergonomics) và khoảng cách di chuyển từ cửa nhập/xuất.

### 3. Trợ lý Mua hàng & Bóc tách Web (Buyer AI Copilot & Web Reader)
- **Web Inspector**: Đọc trực tiếp nội dung từ bất kỳ đường link sản phẩm nào (Shopee, Tiki, CellphoneS, FPT Shop, Amazon...).
- **Tư vấn người mua thông minh**: Phân tích cấu hình, so sánh giá cả, đánh giá ưu/nhược điểm và hỗ trợ người mua đưa ra quyết định tối ưu.
- **Giao diện Web & CLI đa nền tảng**: Sử dụng trực tiếp trên giao diện React hoặc thông qua CLI tương tác nhanh trên Terminal.

---

## 🛠️ Công Nghệ Sử Dụng

| Tầng (Layer) | Công nghệ |
| :--- | :--- |
| **Backend** | Python 3.10+, FastAPI, SQLAlchemy, Pydantic, Uvicorn, Passlib (Bcrypt), Python-JOSE (JWT) |
| **Database** | SQLite3 (Hỗ trợ chuyển đổi dễ dàng sang PostgreSQL / MySQL) |
| **Frontend** | React 19, Vite, Vanilla CSS hiện đại (Dark Theme, Glassmorphism, Micro-animations) |
| **AI / LLM** | Google Gemini 3.5 Flash / 3.1 Flash, Heuristic ABC Analysis Engine |

---

## 📂 Cấu Trúc Dự Án

```
Warehouse-AI/
├── buyer_ai_cli.py              # CLI tương tác độc lập cho Trợ lý Gemini Buyer Copilot
├── docs/                        # Tài liệu đặc tả kỹ thuật chi tiết (tiếng Việt)
│   ├── ai_log.md                # Quy trình & Nhật ký làm việc cùng AI
│   ├── database_design.md       # Thiết kế CSDL & Dictionary chi tiết
│   ├── requirements.md          # Đặc tả yêu cầu phần mềm (SRS)
│   └── use_cases.md             # Đặc tả các ca sử dụng (Use Cases)
├── warehouse-ai/
│   ├── ANALYSIS.md              # Phân tích thiết kế hệ thống
│   ├── DATABASE_DESIGN.md       # Thiết kế CSDL WMS
│   ├── ERD_DESIGN.md            # Thiết kế mô hình ERD
│   ├── FASTAPI_ARCHITECTURE.md  # Kiến trúc chi tiết FastAPI backend
│   ├── README_SETUP.md          # Hướng dẫn chi tiết thiết lập
│   ├── REST_API_DESIGN.md       # Chuẩn thiết kế RESTful API
│   ├── schema.sql               # File DDL SQL khởi tạo cơ sở dữ liệu
│   ├── backend/                 # Mã nguồn FastAPI Backend
│   │   ├── app/
│   │   │   ├── auth/            # Bảo mật, JWT & phân quyền
│   │   │   ├── models/          # SQLAlchemy ORM Models
│   │   │   ├── routers/         # Các API Endpoints
│   │   │   ├── schemas/         # Pydantic Schemas (Request/Response)
│   │   │   ├── services/        # Nghiệp vụ logic & Dịch vụ AI
│   │   │   └── main.py          # FastAPI Application Entry
│   │   ├── seed.py              # Script khởi tạo DB & nạp dữ liệu mẫu
│   │   ├── run.py               # Script chạy backend uvicorn
│   │   └── requirements.txt     # Danh sách thư viện Python
│   └── frontend/                # Mã nguồn React Frontend
│       ├── src/
│       │   ├── components/      # Các tab chức năng (Dashboard, AI, Products, Imports, Exports, Reports)
│       │   ├── services/        # Tầng giao tiếp API Backend
│       │   ├── App.jsx          # Component chính & Điều hướng vai trò
│       │   └── Login.jsx        # Giao diện Đăng nhập
│       ├── package.json         # Cấu hình dự án Node
│       └── vite.config.js       # Cấu hình Vite bundler
└── README.md
```

---

## ⚡ Hướng Dẫn Cài Đặt & Khởi Chạy

### 1. Chuẩn bị môi trường
- **Python**: Phiên bản 3.10 trở lên
- **Node.js**: Phiên bản 18 trở lên & npm

### 2. Cài đặt & Khởi chạy Backend
```bash
# Di chuyển vào thư mục backend
cd warehouse-ai/backend

# Cài đặt các thư viện phụ thuộc
pip install -r requirements.txt

# Khởi tạo cơ sở dữ liệu và nạp dữ liệu mẫu
python seed.py

# Khởi chạy máy chủ Backend (Port 8000)
python run.py
```
> Backend sẽ chạy tại `http://localhost:8000`. Xem tài liệu Swagger API tại: `http://localhost:8000/docs`

### 3. Cài đặt & Khởi chạy Frontend
```bash
# Mở một cửa sổ Terminal mới và di chuyển vào thư mục frontend
cd warehouse-ai/frontend

# Cài đặt các gói thư viện
npm install

# Khởi chạy máy chủ phát triển Vite (Port 5173)
npm run dev
```
> Truy cập giao diện ứng dụng tại: `http://localhost:5173`

### 4. Chạy Trợ lý AI Buyer Copilot qua CLI (Tùy chọn)
```bash
# Chạy trực tiếp từ thư mục gốc dự án
python buyer_ai_cli.py
```

---

## 🔐 Tài Khoản Đăng Nhập Mặc Định

Sau khi chạy lệnh `python seed.py`, hệ thống đã sẵn sàng với các tài khoản thử nghiệm:

| Tên đăng nhập | Mật khẩu | Vai trò | Quyền hạn chính |
| :--- | :--- | :--- | :--- |
| **`admin`** | `password123` | **ADMIN** | Toàn quyền quản trị, xem Dashboard, AI Insights, báo cáo, sản phẩm |
| **`storekeeper`** | `password123` | **STOREKEEPER** | Quản lý kho, tạo phiếu nhập kho, xuất kho, xem hàng hóa |
| **`accountant`** | `password123` | **ACCOUNTANT** | Xem báo cáo tài chính tồn kho, định giá nhập/xuất, xem AI Insights |
| **`staff`** | `password123` | **STOREKEEPER** | Hỗ trợ nghiệp vụ kho |

---

## 📄 Bản Quyền
Dự án được xây dựng và phát triển phục vụ mục đích nghiên cứu, học tập và ứng dụng thực tiễn hệ thống WMS thông minh.
