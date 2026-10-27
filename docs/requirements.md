# TÀI LIỆU YÊU CẦU HỆ THỐNG (SYSTEM REQUIREMENTS SPECIFICATION)
## Dự án: Hệ Thống Quản Lý Kho Áp Dụng AI (AI-powered Warehouse Management System - AI-WMS)

---

## 1. TỔNG QUAN DỰ ÁN (PROJECT OVERVIEW)

### 1.1. Mục tiêu (Objectives)
Hệ thống **AI-powered Warehouse Management System (AI-WMS)** là giải pháp phần mềm quản lý kho bãi thế hệ mới, kết hợp giữa nghiệp vụ quản trị kho truyền thống chuẩn mực và các công nghệ Trí tuệ Nhân tạo (Machine Learning, Deep Learning, Vision OCR, GenAI).

Mục tiêu cốt lõi của hệ thống:
1. **Số hóa và tự động hóa toàn diện**: Chuẩn hóa luồng vận hành từ Nhập kho (Inbound), Lưu trữ (Storage), Kiểm kê (Stocktake) đến Xuất kho (Outbound) với độ chính xác thời gian thực.
2. **Tối ưu hóa không gian và vận hành bằng AI**:
   - Tự động hóa đề xuất vị trí lưu kho tối ưu (Smart Slotting) nhằm tiết kiệm diện tích và rút ngắn thời gian di chuyển nhặt hàng lên đến 30%.
   - Dự báo chính xác nhu cầu nhập hàng và luân chuyển tồn kho (Demand Forecasting), giảm thiểu rủi ro đứt gãy chuỗi cung ứng hoặc ứ đọng vốn lưu động.
   - Nhận diện chứng từ, phiếu giao nhận, hóa đơn tự động bằng AI/OCR, cắt giảm 80% thời gian nhập liệu thủ công.
3. **Kiểm soát rủi ro chủ động**: Phát hiện sớm các bất thường tồn kho, cảnh báo hàng cận date theo nguyên tắc FEFO (First-Expired, First-Out), ngăn ngừa thất thoát hàng hóa.

### 1.2. Phạm vi Dự án (Project Scope)

#### 1.2.1. Trong phạm vi (In-Scope)
- **Quản trị hệ thống & Phân quyền (Security & RBAC)**: Quản lý người dùng, vai trò, nhật ký hoạt động (Audit trail).
- **Quản lý danh mục & Không gian kho (Master Data & Facility Modeling)**: Quản lý thông tin đa kho, phân cấp không gian chi tiết (`Warehouse` $\rightarrow$ `Zone` $\rightarrow$ `Aisle` $\rightarrow$ `Shelf` $\rightarrow$ `Bin`), thông số kỹ thuật sản phẩm (SKU, kích thước, tải trọng, điều kiện bảo quản).
- **Quản lý Nghiệp vụ Nhập kho (Inbound Logistics)**: Quản lý đơn nhập, hỗ trợ OCR hóa đơn/phiếu giao hàng tự động, kiểm đếm, in mã vạch lô hàng, xếp dỡ vào vị trí (Put-away).
- **Quản lý Nghiệp vụ Lưu kho & Nội bộ (Storage & Internal Operations)**: Theo dõi tồn kho thời gian thực đa chiều (theo kho, vị trí bin, số lô, hạn dùng), điều chuyển kho/vị trí nội bộ, kiểm kê kho định kỳ/xoay vòng (Cycle counting), điều chỉnh chênh lệch.
- **Quản lý Nghiệp vụ Xuất kho (Outbound Logistics)**: Quản lý đơn xuất, cấp phát tồn kho tự động (FIFO/FEFO), tối ưu hóa lộ trình nhặt hàng (Pick list), đóng gói (Packing), xác nhận xuất kho và bàn giao vận chuyển.
- **Phân hệ Trí tuệ Nhân tạo (AI Core Modules)**:
  - *AI Demand Forecasting*: Dự báo nhu cầu xuất/nhập theo SKU và chuỗi thời gian (time-series).
  - *AI Smart Placement / Slotting*: Gợi ý ô lưu trữ tối ưu dựa trên phân loại ABC, kích thước, tải trọng, tần suất xuất nhập và khoảng cách di chuyển.
  - *AI Document / Invoice OCR*: Trích xuất bảng dữ liệu từ ảnh chụp hoặc file PDF của hóa đơn/phiếu giao hàng vào phiếu nhập kho.
  - *AI Anomaly & Expiry Alert*: Cảnh báo sai lệch tồn kho bất thường, cảnh báo hàng sắp hết hạn dùng và hàng tồn đọng lâu ngày (Dead stock).

#### 1.2.2. Ngoài phạm vi (Out-of-Scope)
- Quản lý đội xe giao vận đường trường ngoài phạm vi khuôn viên kho (Transportation Management System - TMS chuyên sâu).
- Tự động hóa điều khiển phần cứng robot công nghiệp cấp thấp (AGV/AMR physical firmware control - hệ thống chỉ cung cấp REST API/Webhook cho hệ thống WCS/WES của bên thứ ba).
- Kế toán tài chính chuyên sâu (hệ thống cung cấp API đồng bộ chứng từ với các ERP/phần mềm kế toán như SAP, Oracle, Odoo, MISA).

---

## 2. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS - FR)

### 2.1. Phân hệ Quản lý Hệ thống & Xác thực (Auth & System Administration)
| Mã FR | Tên chức năng | Mô tả chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **FR-AUTH-001** | Đăng nhập & Xác thực | Xác thực người dùng qua Email/Username và Mật khẩu băm an toàn (Argon2id/Bcrypt). Hỗ trợ xác thực đa yếu tố (2FA TOTP). Cấp phát JWT Access Token & Refresh Token. | **High** |
| **FR-AUTH-002** | Phân quyền RBAC | Quản lý vai trò (Admin, Warehouse Manager, Staff) và gán ma trận quyền hạn chi tiết (Menu, Action: Create, Read, Update, Delete, Approve). | **High** |
| **FR-AUTH-003** | Quản lý Người dùng | Thêm mới, chỉnh sửa thông tin, đặt lại mật khẩu, kích hoạt hoặc khóa tài khoản nhân sự kho. | **High** |
| **FR-AUTH-004** | Nhật ký Kiểm toán (Audit Log) | Tự động ghi lại mọi thao tác quan trọng (thay đổi tồn kho, duyệt phiếu, đăng nhập, điều chỉnh cấu hình) kèm User ID, Timestamp, IP Address, Dữ liệu Before/After. | **Medium** |

### 2.2. Phân hệ Quản lý Danh mục & Không gian Kho (Master Data & Warehouse Layout)
| Mã FR | Tên chức năng | Mô tả chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **FR-MST-001** | Quản lý Đa Kho | Hỗ trợ cấu hình nhiều kho vật lý độc lập. Quản lý mã kho, tên kho, địa chỉ, sức chứa tổng (CBM/Tấn). | **High** |
| **FR-MST-002** | Phân cấp Vị trí Kho | Thiết lập sơ đồ không gian phân cấp: Kho $\rightarrow$ Khu vực (Zone) $\rightarrow$ Dãy (Aisle) $\rightarrow$ Kệ (Shelf) $\rightarrow$ Ô (Bin). Khai báo kích thước ($D \times R \times C$), tải trọng tối đa, loại vị trí (Picking, Bulk, Cold Storage, Quarantine). | **High** |
| **FR-MST-003** | Mã vạch Vị trí & In ấn | Tự động tạo barcode/QR code chuẩn cho từng Ô (Bin) và hỗ trợ kết xuất mẫu in mã vạch để dán thực địa. | **High** |
| **FR-MST-004** | Quản lý Danh mục Sản phẩm | Quản lý phân cấp ngành hàng (Category tree). | **High** |
| **FR-MST-005** | Quản lý Hồ sơ Sản phẩm (SKU) | Quản lý mã SKU, barcode thương phẩm (EAN-13, UPC), tên, quy cách đóng gói, kích thước, trọng lượng, hạn sử dụng (shelf-life), nhiệt độ bảo quản, ngưỡng tồn tối thiểu/tối đa. | **High** |
| **FR-MST-006** | Phân loại ABC Hàng hóa | Tự động hoặc thủ công phân loại sản phẩm theo giá trị và tần suất xuất nhập: Nhóm A (20% SKU đóng góp 80% luân chuyển), Nhóm B (30%), Nhóm C (50%). | **Medium** |
| **FR-MST-007** | Quản lý Đối tác | Quản lý danh bạ Nhà cung cấp (Suppliers) và Khách hàng/Điểm nhận hàng (Customers/Destinations). | **Medium** |

### 2.3. Phân hệ Quản lý Tồn kho & Vận hành Nội bộ (Inventory & Internal Operations)
| Mã FR | Tên chức năng | Mô tả chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **FR-INV-001** | Tra cứu Tồn kho Đa chiều | Tra cứu tồn kho tức thời (On-hand, Reserved, Available) theo SKU, Lô hàng (Lot Number), Hạn sử dụng, Kho và Vị trí Bin cụ thể. | **High** |
| **FR-INV-002** | Khóa & Giữ hàng (Reservation) | Tự động khóa số lượng tồn tương ứng khi đơn xuất kho được tạo hoặc xác nhận đơn hàng, ngăn ngừa tình trạng bán quá số lượng có sẵn. | **High** |
| **FR-INV-003** | Điều chuyển Kho & Vị trí | Lập và thực thi phiếu chuyển hàng giữa các kho vật lý khác nhau hoặc chuyển vị trí nội bộ giữa các Bin (Re-slotting / Consolidation). | **High** |
| **FR-INV-004** | Kiểm kê Kho (Stocktaking) | Tạo đợt kiểm kê theo toàn kho, theo Zone hoặc theo nhóm SKU. Tạm khóa vị trí kiểm kê. Cho phép nhân viên quét mã vạch kiểm đếm thực tế bằng thiết bị cầm tay (PDA/Mobile). | **High** |
| **FR-INV-005** | Đối soát & Điều chỉnh Tồn | So sánh tự động giữa số liệu tồn trên phần mềm và số lượng thực đếm. Hỗ trợ quy trình phê duyệt chênh lệch (Variance Approval) và sinh phiếu điều chỉnh (Adjustment). | **High** |
| **FR-INV-006** | Thẻ kho & Lịch sử Giao dịch | Ghi nhận chi tiết mọi biến động nhập-xuất-chuyển-kiểm kê cho từng SKU theo từng giao dịch nguyên tử, hỗ trợ truy vết nguồn gốc (Traceability). | **High** |

### 2.4. Phân hệ Quản lý Nhập kho (Inbound Logistics)
| Mã FR | Tên chức năng | Mô tả chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **FR-INB-001** | Tạo Phiếu Nhập kho (PO/Receipt) | Tạo phiếu nhập thủ công hoặc tích hợp từ ERP. Khai báo Nhà cung cấp, danh sách hàng dự kiến, số lượng, đơn giá, ngày tiếp nhận. | **High** |
| **FR-INB-002** | Tiếp nhận Hàng & Kiểm tra (QC) | Thực hiện kiểm đếm thực tế tại khu vực tiếp nhận (Dock), ghi nhận số lô (Lot), hạn dùng (Expiry Date), phân loại hàng đạt chuẩn và hàng lỗi/hư hỏng. | **High** |
| **FR-INB-003** | In Mã vạch Lô hàng | Tự động sinh mã định danh và in tem nhãn barcode cho từng pallet, thùng hoặc đơn vị sản phẩm vừa tiếp nhận. | **Medium** |
| **FR-INB-004** | Phân bổ Vị trí & Cất hàng (Put-away)| Khởi tạo lệnh cất hàng. Nhân viên quét mã pallet, quét mã Bin đích để xác nhận đã đưa hàng vào đúng vị trí lưu trữ an toàn. | **High** |

### 2.5. Phân hệ Quản lý Xuất kho (Outbound Logistics)
| Mã FR | Tên chức năng | Mô tả chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **FR-OUT-001** | Tạo Phiếu Xuất kho (Shipment) | Tạo yêu cầu xuất hàng theo đơn đặt hàng của khách hàng hoặc lệnh điều phối sản xuất/bán lẻ. | **High** |
| **FR-OUT-002** | Cấp phát Tồn kho Thông minh | Tự động tìm kiếm và phân bổ lô hàng theo quy tắc: FEFO (hàng hạn dùng gần nhất xuất trước) cho hàng thực phẩm/y tế, hoặc FIFO (hàng nhập trước xuất trước) cho hàng thông thường. | **High** |
| **FR-OUT-003** | Sinh Danh sách Nhặt hàng (Pick List)| Tạo danh sách nhặt hàng tối ưu hóa thứ tự các Bin theo khoảng cách đường đi ngắn nhất trong kho (S-shape / TSP heuristic). | **High** |
| **FR-OUT-004** | Kiểm tra & Đóng gói (Packing) | Quét mã kiểm tra đối chiếu lại sản phẩm tại bàn đóng gói (Pack station), in phiếu đóng gói (Packing Slip) và nhãn vận chuyển (Shipping Label). | **High** |
| **FR-OUT-005** | Xác nhận Xuất kho & Trừ tồn | Xác nhận bàn giao cho đơn vị vận chuyển, chính thức trừ tồn kho thực tế, cập nhật trạng thái phiếu sang `SHIPPED`. | **High** |

### 2.6. Phân hệ Tính năng AI Nâng cao (AI Modules)
| Mã FR | Tên chức năng | Mô tả chi tiết | Mức độ ưu tiên |
| :--- | :--- | :--- | :---: |
| **FR-AI-001** | AI Demand Forecasting | Phân tích chuỗi thời gian dữ liệu lịch sử xuất kho (kết hợp mùa vụ, xu hướng, khuyến mãi) để dự báo nhu cầu tiêu thụ từng SKU trong 30/60/90 ngày tới. Đưa ra khuyến nghị ngưỡng tồn an toàn (Safety Stock) và điểm đặt hàng lại (Reorder Point). | **High** |
| **FR-AI-002** | AI Smart Placement / Slotting | Tự động tính toán và gợi ý Top 3 vị trí Bin tối ưu nhất khi nhập hàng mới dựa trên: Phân nhóm ABC, kích thước/thể tích kiện hàng, tải trọng còn lại của kệ, độ tương thích môi trường (nhiệt độ) và khoảng cách di chuyển tới cửa xuất. | **High** |
| **FR-AI-003** | AI Invoice / Document OCR | Nhận diện và bóc tách tự động dữ liệu từ ảnh chụp hoặc file PDF hóa đơn VAT, phiếu giao nhận của Nhà cung cấp (Nhà cung cấp, Ngày chứng từ, Danh sách mã hàng, Tên hàng, Số lượng, Đơn giá). Điền tự động vào Phiếu nhập kho. | **High** |
| **FR-AI-004** | AI Anomaly & Expiry Alert | Tự động quét và phát hiện các mẫu dị thường: Tồn kho sụt giảm bất thường không rõ nguyên nhân, cảnh báo các lô hàng cận date theo khung thời gian động (30/15/7 ngày), phát hiện hàng hóa không có phát sinh giao dịch xuất trong thời gian dài (Dead Stock). | **Medium** |

---

## 3. YÊU CẦU PHI CHỨC NĂNG (NON-FUNCTIONAL REQUIREMENTS - NFR)

### 3.1. Hiệu năng & Độ trễ Suy luận AI (Performance & Latency)
- **NFR-PERF-001 (API Response Time)**: Các tác vụ nghiệp vụ chuẩn (CRUD danh mục, tra cứu tồn kho, tạo phiếu) phải có thời gian phản hồi ở mức P95 < 200ms và P99 < 500ms dưới tải thông thường.
- **NFR-PERF-002 (AI Slotting Latency)**: Thời gian suy luận thuật toán gợi ý vị trí kho (Smart Slotting) phải phản hồi trong thời gian $\le 1.5$ giây cho mỗi yêu cầu cất hàng.
- **NFR-PERF-003 (AI OCR Processing Latency)**: Tác vụ bóc tách hóa đơn OCR được xử lý bất đồng bộ (Asynchronous Queue qua Celery/Redis). Thời gian xử lý hoàn tất $\le 5$ giây cho mỗi trang tài liệu chuẩn (A4).
- **NFR-PERF-004 (AI Forecasting Throughput)**: Tác vụ dự báo nhu cầu chạy batch định kỳ vào ban đêm hoặc on-demand trong thời gian $\le 3$ phút cho tập dữ liệu 10.000 SKU.
- **NFR-PERF-005 (Concurrency)**: Hệ thống chịu tải tối thiểu 500 người dùng đồng thời (Concurrent Users) và xử lý tối thiểu 50.000 giao dịch quét mã vạch mỗi ngày không gây suy hao hiệu năng hoặc nghẽn CSDL.

### 3.2. Bảo mật & Phân quyền (Security & Compliance)
- **NFR-SEC-001 (Authentication Security)**: Sử dụng JWT với thời hạn Access Token ngắn (15 phút), Refresh Token (7 ngày) lưu trữ an toàn trong HttpOnly Cookie có cờ `Secure` và `SameSite=Strict`.
- **NFR-SEC-002 (Data Encryption)**:
  - Mã hóa toàn bộ dữ liệu truyền tải (Data in Transit) bằng giao thức HTTPS với chứng chỉ TLS 1.3.
  - Mã hóa dữ liệu nhạy cảm lưu trữ (Data at Rest) như thông tin cá nhân, API keys bằng thuật toán AES-256-GCM.
- **NFR-SEC-003 (OWASP Compliance)**: Hệ thống được thiết kế phòng ngừa toàn diện các lỗ hổng theo OWASP Top 10: Sử dụng ORM Parameterized Query để chống triệt để SQL Injection; thiết lập Content Security Policy (CSP) và mã hóa đầu ra chống XSS; áp dụng Rate Limiting chống Brute-force/DDoS.
- **NFR-SEC-004 (Auditability)**: Mọi thao tác làm thay đổi số lượng tồn kho hoặc trạng thái chứng từ bắt buộc phải lưu định danh người dùng và dấu thời gian không thể sửa đổi (Immutable log).

### 3.3. Khả năng Mở rộng & Tin cậy (Scalability & Reliability)
- **NFR-REL-001 (Database Consistency)**: Sử dụng CSDL quan hệ chuẩn SQL (PostgreSQL / MySQL InnoDB) tuân thủ triệt để tính chất ACID (Atomicity, Consistency, Isolation, Durability). Mọi giao dịch trừ/cộng tồn kho phải đặt trong Transaction cô lập mức `READ COMMITTED` hoặc `REPEATABLE READ` kèm cơ chế Pessimistic Locking (`SELECT FOR UPDATE`) để triệt tiêu Race Condition.
- **NFR-REL-002 (High Availability)**: Đảm bảo độ sẵn sàng của hệ thống đạt mức 99.9% uptime (thời gian gián đoạn tối đa không quá 8.76 giờ/năm).
- **NFR-REL-003 (Database Scalability)**: Hỗ trợ kiến trúc Master-Slave (Read Replicas). Tách biệt luồng ghi nghiệp vụ kho vào Master và luồng đọc phân tích báo cáo/AI Feature Extraction sang Replica.
- **NFR-REL-004 (Graceful Degradation / AI Fallback)**: Nếu phân hệ AI (OCR service, Slotting model, Forecasting service) gặp sự cố mạng hoặc quá tải, hệ thống phải tự động chuyển hướng về quy tắc cơ sở (Fallback Heuristic):
  - Gợi ý vị trí: Tự động chọn Ô (Bin) trống đầu tiên cùng chủng loại gần nhất.
  - Bóc tách hóa đơn: Cho phép người dùng chuyển ngay sang chế độ nhập liệu thủ công mà không làm nghẽn luồng nhập kho.

---

## 4. RÀNG BUỘC KỸ THUẬT & GIẢ ĐỊNH (TECHNICAL CONSTRAINTS & ASSUMPTIONS)

### 4.1. Ràng buộc Kỹ thuật (Technical Constraints)
- **Kiến trúc Hệ thống**: Client-Server hiện đại, phân tách rõ ràng Backend REST API (hoặc gRPC cho internal AI services) và Frontend Single Page Application / Mobile Web.
- **Cơ sở dữ liệu**: Bắt buộc sử dụng SQL Database quan hệ (PostgreSQL 15+ khuyến nghị hoặc MySQL 8.0+).
- **Phân hệ AI**: Triển khai độc lập dưới dạng Microservice/Worker sử dụng Python (FastAPI/PyTorch/Scikit-learn/Tesseract OCR hoặc OpenAI/Gemini Vision API), giao tiếp với Backend chính qua HTTP REST API và Message Broker (RabbitMQ hoặc Redis).
- **Giao diện người dùng**: Hỗ trợ Responsive Web Design chuẩn trên cả máy tính bàn (Desktop) và thiết bị cầm tay quét mã vạch chuyên dụng (PDA chạy Android có máy quét tích hợp camera/laser).

### 4.2. Giả định Nghiệp vụ (Assumptions)
- Nhà kho có hạ tầng mạng Wi-Fi công nghiệp ổn định bao phủ toàn bộ diện tích sàn kho, đảm bảo tín hiệu kết nối liên tục cho các máy quét cầm tay.
- Mọi mặt hàng lưu kho đều được gán mã định danh duy nhất (SKU) và có dán tem mã vạch (Barcode EAN-13, Code 128 hoặc QR Code) trước khi cất vào kệ.
- Ban quản lý kho tuân thủ quy trình vận hành: Không tự ý di dời vật lý hàng hóa mà không cập nhật lệnh trên hệ thống.
- Dữ liệu hóa đơn đầu vào phục vụ OCR có độ phân giải tối thiểu 300 DPI và không bị nhàu nát, rách góc hoặc mất chữ nghiêm trọng.
