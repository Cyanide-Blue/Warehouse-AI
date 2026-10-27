# QUY TRÌNH & NHẬT KÝ LÀM VIỆC CÙNG AI (AI COLLABORATION LOG)
## Dự án: Hệ Thống Quản Lý Kho Áp Dụng AI (AI-WMS)

---

## 1. HƯỚNG DẪN & QUY TẮC GHI NHẬT KÝ (LOGGING GUIDELINES)

Tài liệu này quy định quy chuẩn cộng tác giữa đội ngũ kỹ sư phát triển (Solution Architect, Backend, Frontend, Data/AI Engineers) và các mô hình Trí tuệ Nhân tạo (LLMs, Copilot, Vision AI) trong suốt vòng đời dự án AI-WMS.

### 1.1. Khi nào BẮT BUỘC ghi chép Nhật ký AI?
1. **Thiết kế Kiến trúc & Cơ sở dữ liệu**: Khi sử dụng AI để thiết kế Schema, tối ưu Index, lập mô hình ERD hoặc đưa ra các quyết định kiến trúc cốt lõi (Architectural Decision Records - ADR).
2. **Xây dựng Thuật toán lõi & Pipeline AI**: Khi tạo các thuật toán gợi ý vị trí (Smart Slotting), tiền xử lý dữ liệu chuỗi thời gian cho mô hình dự báo nhu cầu (Demand Forecasting), hoặc trích xuất hóa đơn (OCR Invoice Parsing).
3. **Giải quyết Lỗi phức tạp (Deep Debugging)**: Khi tham vấn AI để xử lý các lỗi nghiêm trọng về hiệu năng (Database lock contention, Race condition khi cấp phát tồn kho, Memory leak trên worker).
4. **Kiểm thử & Đảm bảo chất lượng (QA/Testing)**: Khi yêu cầu AI sinh bộ kiểm thử biên (Edge cases), kịch bản kiểm thử tải trọng (Stress testing) hoặc kiểm thử concurrency.

### 1.2. Các Nguyên Tắc Vàng (Golden Rules of AI Usage)
- **Nguyên tắc 1: Bảo mật Dữ liệu & Bí mật Tuyệt đối (Zero-Leakage Policy)**:
  - *Tuyệt đối KHÔNG* đưa chuỗi kết nối CSDL, Mật khẩu, Secret Keys, JWT Secret, Token API hoặc Thông tin Định danh Cá nhân (PII) của khách hàng/nhân viên vào Prompt gửi lên các dịch vụ AI công cộng.
  - Sử dụng dữ liệu giả lập (Mock data / Synthetic data) khi cần minh họa bối cảnh dữ liệu thực tế.
- **Nguyên tắc 2: Thẩm định Mã nguồn Nghiêm ngặt (No Blind Trust)**:
  - Mọi đoạn mã (Code/SQL/Python/Bash) do AI sinh ra phải được Kỹ sư đọc hiểu 100%, thực hiện Static Code Analysis và chạy kiểm thử tự động (Unit/Integration Test) trước khi đưa vào nhánh chính (`main`/`develop`).
- **Nguyên tắc 3: Tư duy Kiến trúc & Phân tích Đánh đổi (Trade-off Consciousness)**:
  - Khi tham vấn AI về một giải pháp, luôn yêu cầu AI phân tích ưu điểm, nhược điểm, độ phức tạp thuật toán ($O(N)$ time/space) và các phương án thay thế khả thi.

---

## 2. KHUNG MẪU NHẬT KÝ (LOG ENTRY TEMPLATE)

Khi hoàn thành một phiên làm việc quan trọng cùng AI, kỹ sư sao chép mẫu dưới đây và điền thông tin vào phần **Nhật ký Thực tế**:

```markdown
### [MÃ_LOG]: [Tiêu đề ngắn gọn về tác vụ thực hiện]
- **Ngày thực hiện**: YYYY-MM-DD
- **Kỹ sư phụ trách**: [Tên / Chức danh]
- **Phân hệ liên quan**: [Auth / Inbound / Outbound / Inventory / AI Core]
- **Mô hình AI sử dụng**: [e.g., Claude 3.5 Sonnet / GPT-4o / Gemini 1.5 Pro]
- **Mục tiêu kỹ thuật**: [Mô tả vấn đề cần giải quyết hoặc mục tiêu thiết kế]

#### 1. Ngữ cảnh & Ràng buộc cung cấp cho AI (Context & Constraints)
- [Liệt kê các thông tin nền tảng, ràng buộc công nghệ đã cung cấp cho AI]

#### 2. Prompt gửi đi (Prompt Used)
> [Nội dung chi tiết câu lệnh Prompt đã sử dụng]

#### 3. Phản hồi cốt lõi từ AI (AI Solution Summary)
- [Tóm tắt giải pháp, thuật toán hoặc đoạn code chính do AI đề xuất]

#### 4. Đánh giá Kỹ thuật & Rủi ro phát hiện (Evaluation & Identified Flaws)
- **Điểm tốt**: [Những điểm AI xử lý chính xác, tối ưu]
- **Lỗ hổng / Bất cập phát hiện**: [Những điểm AI làm sai, thiếu sót hoặc tiềm ẩn nguy cơ bảo mật/hiệu năng]
- **Tinh chỉnh của Kỹ sư**: [Cách kỹ sư sửa đổi để phù hợp với chuẩn dự án]

#### 5. Kết quả & Mã nguồn thực tế áp dụng (Applied Implementation)
- [Liên kết file mã nguồn hoặc đoạn code cuối cùng đã merge vào codebase]
```

---

## 3. THƯ VIỆN PROMPTS MẪU (PROMPT LIBRARY)

Bộ prompts được thiết kế chuẩn mực theo phương pháp Prompt Engineering (Role-Task-Context-Constraints-Output Format), sẵn sàng sử dụng cho các tác vụ đặc thù của dự án AI-WMS:

### 3.1. Prompt 1: Thiết kế Truy vấn SQL Phức tạp & Chống Race Condition (FIFO/FEFO Allocation)
```text
[Role]: Bạn là Chuyên gia Tối ưu hóa Cơ sở Dữ liệu SQL (PostgreSQL & MySQL InnoDB) cấp cao.
[Context]: Tôi đang phát triển hệ thống Quản lý kho (WMS). Khi đơn hàng xuất kho được tạo, hệ thống cần tự động tìm và khóa số lượng hàng tồn theo nguyên tắc FEFO (hạn sử dụng sớm nhất xuất trước, nếu không có hạn dùng thì theo ngày nhập FIFO). Hệ thống có tần suất quét mã đồng thời cao, cần chống triệt để tình trạng bán vượt tồn (Overselling) và Deadlock.
[Task]: Hãy viết một câu truy vấn SQL chuẩn kết hợp cơ chế Locking tối ưu (SELECT ... FOR UPDATE) để cấp phát đủ số lượng X của mặt hàng product_id = :p_id tại warehouse_id = :w_id.
[Constraints]:
1. Chỉ lấy các lô còn hàng khả dụng: (quantity - reserved_quantity) > 0.
2. Sắp xếp: ưu tiên expiry_date ASC (nulls last), sau đó đến created_at ASC.
3. Phải sử dụng cú pháp khóa hàng tránh gây nghẽn toàn bảng (ví dụ: FOR UPDATE SKIP LOCKED hoặc cơ chế tương đương).
4. Viết kèm câu lệnh UPDATE tương ứng để tăng reserved_quantity.
5. Giải thích chi tiết chiến lược Composite Index cần thiết để query này đạt hiệu năng dưới 10ms trên bảng có 5 triệu dòng.
```

### 3.2. Prompt 2: Xây dựng Pipeline AI Demand Forecasting cho Chuỗi thời gian
```text
[Role]: Bạn là Lead Machine Learning Engineer chuyên về Supply Chain Analytics.
[Context]: Hệ thống WMS của chúng tôi cần module dự báo nhu cầu xuất hàng theo từng SKU trong 30 ngày tới. Dữ liệu lịch sử lưu trong PostgreSQL gồm: ngày xuất, SKU, số lượng, loại ngày (ngày thường/cuối tuần/lễ), và giá bán.
[Task]: Hãy thiết kế một module Python sử dụng thư viện hiện đại (Prophet hoặc LightGBM/XGBoost) để huấn luyện mô hình dự báo chuỗi thời gian cho từng SKU.
[Constraints]:
1. Xử lý các ngày không phát sinh đơn hàng (Zero-demand / Intermittent demand).
2. Tích hợp tính năng phát hiện và loại bỏ các giá trị đột biến ngoại lai (Outliers) do sai số nhập liệu.
3. Đầu ra của hàm dự báo phải bao gồm: Dự báo điểm (Point estimate), Khoảng tin cậy 95% (Lower/Upper bounds), Mức tồn an toàn khuyến nghị (Safety Stock) và Điểm đặt hàng lại (Reorder Point - ROP) dựa trên Lead Time của nhà cung cấp.
4. Trả về mã nguồn Python hoàn chỉnh, có type hints, docstring và xử lý ngoại lệ chuẩn production.
```

### 3.3. Prompt 3: Thuật toán AI Gợi ý Vị trí Lưu kho Thông minh (Smart Slotting)
```text
[Role]: Bạn là Kỹ sư Thuật toán Tối ưu hóa Vận hành Kho vận (Operations Research & Logistics Optimization).
[Context]: Khi hàng nhập kho hoàn tất kiểm đếm, hệ thống cần gợi ý ngay lập tức Top 3 ô kệ (Bin) tốt nhất để cất hàng. Sơ đồ kho phân cấp theo Zone, Aisle, Shelf, Bin.
[Task]: Hãy viết một thuật toán Heuristic/Multi-criteria Scoring bằng Python để tính điểm mức độ phù hợp của các ô kệ còn trống đối với một kiện hàng cụ thể.
[Constraints]:
1. Các tiêu chí chấm điểm:
   - Phân loại ABC: Hàng loại A (luân chuyển nhanh) phải ưu tiên ô ở tầng ngang tầm với (Shelf 01-02) và gần cửa xuất (Dock). Hàng loại C đặt ở tầng cao hoặc xa hơn.
   - Trọng lượng & Tải trọng: Kiện hàng nặng (> 20kg) bắt buộc phải nằm ở tầng dưới cùng (Shelf 01) để đảm bảo an toàn kết cấu.
   - Kích thước/Thể tích: Thể tích kiện hàng không được vượt quá max_volume_cbm của ô.
   - Loại bảo quản: Kiểm tra tương thích Zone (Hàng đông lạnh chỉ vào Cold Zone).
2. Hàm nhận vào thông tin Product và danh sách Candidate Locations, trả về Top 3 kèm điểm số và chuỗi lý do giải thích (Human-readable explanation) bằng Tiếng Việt.
3. Thời gian thực thi hàm không quá 100ms cho tập 1.000 vị trí ứng viên.
```

### 3.4. Prompt 4: Trích xuất Dữ liệu Hóa đơn / Chứng từ bằng Vision LLM & Pydantic Schema
```text
[Role]: Bạn là Chuyên gia Xử lý Ngôn ngữ Tự nhiên & Trí tuệ Thị giác (Multimodal AI / Document Understanding).
[Context]: Hệ thống tiếp nhận ảnh chụp hóa đơn GTGT hoặc phiếu giao nhận hàng hóa của nhà cung cấp để lập phiếu nhập kho tự động.
[Task]: Hãy tạo một System Prompt và cấu trúc Pydantic Schema chuẩn để hướng dẫn Vision LLM (như GPT-4o hoặc Gemini 1.5 Pro) trích xuất dữ liệu có cấu trúc (Structured JSON) từ ảnh chụp hóa đơn.
[Constraints]:
1. Schema phải trích xuất được:
   - Số hóa đơn (Invoice Number)
   - Tên nhà cung cấp (Supplier Name) & Mã số thuế (nếu có)
   - Ngày lập hóa đơn (Invoice Date - định dạng ISO YYYY-MM-DD)
   - Danh sách chi tiết mặt hàng: Mã sản phẩm của NCC, Tên hàng hóa, Đơn vị tính, Số lượng, Đơn giá, Thành tiền.
   - Thuế suất VAT, Tổng tiền trước thuế, Tổng tiền sau thuế.
2. Prompt phải hướng dẫn mô hình xử lý trường hợp chữ viết mờ, dấu phẩy/chấm trong số thập phân kiểu Việt Nam (ví dụ: 1.000.000,50), và bắt buộc trả về đúng định dạng JSON không kèm văn bản thừa ngoài schema.
```

### 3.5. Prompt 5: Viết Bộ Kiểm thử Tự động (Unit & Concurrency Tests) cho Luồng Giao dịch
```text
[Role]: Bạn là Senior QA Automation / Backend Engineer.
[Context]: Phân hệ Nhập và Xuất kho của hệ thống AI-WMS sử dụng SQLAlchemy 2.0 và FastAPI. Đây là phân hệ sống còn yêu cầu tính toàn vẹn dữ liệu cực cao.
[Task]: Hãy viết bộ Unit Test và Concurrency Integration Test hoàn chỉnh bằng `pytest` và `pytest-asyncio` cho luồng Xuất kho (Shipment Allocation).
[Constraints]:
1. Test case 1: Cấp phát thành công khi tồn kho đáp ứng đủ số lượng.
2. Test case 2: Báo lỗi nghiệp vụ (InsufficientStockError) và rollback transaction khi số lượng yêu cầu vượt quá tồn khả dụng.
3. Test case 3 (Concurrency Test): Sử dụng 10 coroutines chạy đồng thời để cố gắng nhặt một món hàng chỉ còn duy nhất 1 sản phẩm trong kho. Đảm bảo chính xác chỉ có đúng 1 request thành công, 9 request còn lại nhận lỗi và tồn kho cuối cùng không bao giờ bị âm.
4. Mocking cơ sở dữ liệu SQLite in-memory hoặc PostgreSQL test container sạch sẽ.
```

---

## 4. NHẬT KÝ MẪU ĐÃ THỰC HIỆN (SAMPLE LOG ENTRIES)

### [LOG-2026-001]: Thiết kế CSDL Phân cấp Vị trí Kho và Chiến lược Composite Index chống Lock Contention
- **Ngày thực hiện**: 2026-09-02
- **Kỹ sư phụ trách**: Nguyễn Văn Trung / Solution Architect
- **Phân hệ liên quan**: Quản lý Kho & Tồn kho (`Inventory & Master Data`)
- **Mô hình AI sử dụng**: Claude 3.5 Sonnet
- **Mục tiêu kỹ thuật**: Thiết kế mô hình bảng lưu trữ phân cấp vị trí vật lý (`Warehouse` $\rightarrow$ `Zone` $\rightarrow$ `Aisle` $\rightarrow$ `Shelf` $\rightarrow$ `Bin`) và bảng `inventory`, giải quyết bài toán truy vấn tồn kho theo thời gian thực và hạn chế xung đột khóa (Lock contention) khi nhiều nhân viên nhặt hàng đồng thời.

#### 1. Ngữ cảnh & Ràng buộc cung cấp cho AI:
- CSDL sử dụng: PostgreSQL 15+.
- Quy mô: Kho chứa ~50.000 SKU, 20.000 vị trí Bin.
- Tần suất xuất nhập: 100 giao dịch nhặt hàng mỗi phút.
- Cần áp dụng chiến lược xuất kho ưu tiên hạn dùng (FEFO) cho hàng thực phẩm và ngày nhập (FIFO) cho hàng thông thường.

#### 2. Prompt gửi đi:
> "Tôi đang thiết kế bảng `locations` và `inventory` cho hệ thống AI-WMS trên PostgreSQL 15. Hãy gợi ý thiết kế schema chi tiết kèm các ràng buộc toàn vẹn dữ liệu. Đặc biệt, hãy đề xuất giải pháp viết câu truy vấn cấp phát tồn kho theo FEFO có sử dụng Row-level Locking để nhiều worker cùng nhặt hàng không bị nghẽn (Lock contention) hoặc dead-lock, và thiết kế các Composite Indexes tối ưu nhất."

#### 3. Phản hồi cốt lõi từ AI:
- AI đề xuất tách biệt bảng `locations` (thông số vật lý tĩnh của kệ) và `inventory` (số lượng thực tế của từng SKU theo số lô tại vị trí đó).
- Giới thiệu kỹ thuật sử dụng `SELECT ... FOR UPDATE SKIP LOCKED` trong PostgreSQL để các tiến trình lấy hàng có thể bỏ qua các bản ghi đang bị khóa bởi tiến trình khác thay vì phải chờ đợi (zero blocking).
- Đề xuất composite index: `CREATE INDEX idx_inv_fefo ON inventory(warehouse_id, product_id, expiry_date ASC, (quantity - reserved_quantity));`.

#### 4. Đánh giá Kỹ thuật & Rủi ro phát hiện:
- **Điểm tốt**:
  - Ý tưởng sử dụng `SKIP LOCKED` là cực kỳ chuẩn xác cho bài toán phân bổ kho hàng (Pick-list dispatching), giải quyết hoàn toàn hiện tượng thắt cổ chai khi nhiều nhân viên cùng nhặt một mã hàng.
  - Thiết kế bảng `locations` có đầy đủ các trường tọa độ và loại vị trí.
- **Lỗ hổng / Bất cập phát hiện**:
  - AI ban đầu đề xuất lưu tọa độ `x, y, z` dưới dạng số thực `FLOAT`, điều này không thực tế với quy chuẩn kho truyền thống (thực tế các kho sử dụng mã ký tự quy ước như Aisle `01`, Shelf `02`, Bin `01`).
  - Index ban đầu AI viết thiếu điều kiện lọc hàng tồn dương, có thể gây phình to Index bởi các dòng tồn bằng 0.
- **Tinh chỉnh của Kỹ sư**:
  - Chuẩn hóa các trường `zone`, `aisle`, `shelf`, `bin` thành `VARCHAR(20)`.
  - Bổ sung Partial Index chỉ lập chỉ mục cho các lô có `quantity > reserved_quantity`.

#### 5. Kết quả & Mã nguồn thực tế áp dụng:
- Đã đưa vào áp dụng trong tài liệu `docs/database_design.md` (Mục 2.4, 2.7 và 3.2).
- Đoạn truy vấn cấp phát thực tế triển khai tại backend:
```sql
-- Cấp phát tồn kho FEFO an toàn đa luồng
WITH available_lots AS (
    SELECT id, quantity, reserved_quantity
    FROM inventory
    WHERE warehouse_id = :w_id 
      AND product_id = :p_id 
      AND (quantity - reserved_quantity) > 0
    ORDER BY expiry_date ASC NULLS LAST, created_at ASC
    FOR UPDATE SKIP LOCKED
    LIMIT 5
)
UPDATE inventory i
SET reserved_quantity = i.reserved_quantity + :alloc_qty,
    updated_at = CURRENT_TIMESTAMP
FROM available_lots a
WHERE i.id = a.id;
```

---

### [LOG-2026-002]: Xây dựng Thuật toán Gợi ý Vị trí Xếp hàng (AI Smart Placement) dựa trên ABC Analysis và Khoảng cách Di chuyển
- **Ngày thực hiện**: 2026-09-03
- **Kỹ sư phụ trách**: Nguyễn Văn Trung / Senior Full-Stack Developer
- **Phân hệ liên quan**: Phân hệ AI Core (`Smart Slotting`)
- **Mô hình AI sử dụng**: GPT-4o
- **Mục tiêu kỹ thuật**: Xây dựng thuật toán chấm điểm và xếp hạng vị trí lưu kho tối ưu cho kiện hàng mới nhập, tối ưu hóa thời gian di chuyển nhặt hàng và tuân thủ an toàn tải trọng.

#### 1. Ngữ cảnh & Ràng buộc cung cấp cho AI:
- Mỗi sản phẩm có thuộc tính: `abc_classification` (`CLASS_A`, `CLASS_B`, `CLASS_C`), `weight_kg`, `volume_cbm`.
- Mỗi vị trí `locations` có thuộc tính: `shelf` (tầng: 01 là sát đất, 04 là trên cao), `distance_from_dock_m` (khoảng cách tới cửa xuất), `max_weight_kg`, `max_volume_cbm`.
- Quy tắc an toàn: Hàng > 25kg không được đặt ở tầng cao (Shelf > 02).
- Thời gian tính toán: Dưới 50ms cho mỗi yêu cầu.

#### 2. Prompt gửi đi:
> "Hãy viết một class Python `SmartSlottingEngine` sử dụng thuật toán Heuristic đa mục tiêu để xếp hạng danh sách các vị trí kho khả dụng. Thuật toán cần kết hợp: (1) Trọng số khoảng cách di chuyển theo phân loại ABC; (2) Công thái học bốc dỡ (Ergonomics): hàng loại A nằm ở tầng ngang ngực (Shelf 02), hàng nặng ở tầng dưới cùng (Shelf 01); (3) Tỷ lệ lấp đầy thể tích (Volume utilization). Trả về Top 3 vị trí phù hợp nhất kèm điểm số từ 0 - 100 và lời giải thích lý do."

#### 3. Phản hồi cốt lõi từ AI:
- AI tạo ra class `SmartSlottingEngine` với hàm chấm điểm tổng hợp tuyến tính có trọng số chuẩn hóa:
  $$TotalScore = w_{dist} \cdot S_{dist} + w_{ergo} \cdot S_{ergo} + w_{vol} \cdot S_{vol}$$
- Tích hợp bộ lọc cứng (Hard Constraints) loại bỏ ngay lập tức các ô không đủ tải trọng hoặc vi phạm an toàn lao động trước khi bước vào giai đoạn chấm điểm (Scoring).

#### 4. Đánh giá Kỹ thuật & Rủi ro phát hiện:
- **Điểm tốt**:
  - Việc phân tách rõ ràng giữa **Hard Constraints** (bắt buộc thỏa mãn) và **Soft Constraints** (chấm điểm tối ưu) giúp thuật toán vừa chạy nhanh vừa an toàn tuyệt đối.
  - Công thức tính điểm công thái học (Ergonomics) được thiết kế khéo léo theo từng bậc tầng kệ.
- **Lỗ hổng / Bất cập phát hiện**:
  - AI chưa xử lý trường hợp hai sản phẩm kỵ nhau (ví dụ: hóa chất tẩy rửa không được để chung ô với thực phẩm khô).
  - Tỷ lệ lấp đầy thể tích (Volume fit) ban đầu của AI chấm điểm cao nhất cho ô vừa khít 100%, tuy nhiên trong thực tế vận hành kho, nếu lấp đầy 100% nhân viên sẽ rất khó thao tác đưa tay vào bốc dỡ (cần khoảng đệm dung sai tối thiểu 10%).
- **Tinh chỉnh của Kỹ sư**:
  - Bổ sung hệ số dung sai thao tác: Điểm lấp đầy thể tích đạt cực đại khi tỷ lệ chiếm dụng đạt 80% - 85%.
  - Thêm kiểm tra điều kiện tương thích loại khu vực (`location_type == 'COLD'` nếu `is_perishable == True`).

#### 5. Kết quả & Mã nguồn thực tế áp dụng:
- Thuật toán đã được đóng gói thành module `app/services/ai_slotting.py` và liên kết với API endpoint `POST /api/v1/ai/slotting/suggest`.
- Đoạn mã nguồn hoàn thiện của thuật toán:
```python
class SmartSlottingEngine:
    @staticmethod
    def calculate_score(product: dict, location: dict) -> float:
        # 1. Hard Constraints: Loại bỏ nếu vi phạm an toàn
        if product["weight_kg"] > 25 and int(location["shelf"]) > 2:
            return -1.0  # Vi phạm an toàn bốc dỡ tầng cao
        if product["weight_kg"] > location["available_weight_kg"]:
            return -1.0  # Quá tải trọng kệ
            
        # 2. Soft Constraint: Khoảng cách theo phân nhóm ABC
        dist_score = max(0.0, 100.0 - (location["distance_from_dock_m"] * 1.5))
        if product["abc_classification"] == "CLASS_A":
            dist_weight = 0.45
        elif product["abc_classification"] == "CLASS_B":
            dist_weight = 0.30
        else:
            dist_weight = 0.15

        # 3. Soft Constraint: Công thái học tầng kệ (Ergonomics)
        # Tầng 2 là tầm với chuẩn (Golden Zone), Tầng 1 cho hàng nặng
        shelf_num = int(location["shelf"])
        if product["weight_kg"] > 15:
            ergo_score = 100.0 if shelf_num == 1 else (60.0 if shelf_num == 2 else 20.0)
        else:
            ergo_score = 100.0 if shelf_num == 2 else (80.0 if shelf_num in (1, 3) else 50.0)
        ergo_weight = 0.35

        # 4. Soft Constraint: Tỷ lệ lấp đầy thể tích (Tối ưu tại 80-85%)
        vol_ratio = product["volume_cbm"] / location["max_volume_cbm"]
        vol_score = 100.0 - abs(vol_ratio - 0.82) * 100.0
        vol_weight = 0.20

        # Tổng hợp điểm số
        total_score = (dist_score * dist_weight) + (ergo_score * ergo_weight) + (vol_score * vol_weight)
        return round(total_score, 2)
```
