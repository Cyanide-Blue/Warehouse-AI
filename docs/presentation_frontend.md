# BÀI THUYẾT TRÌNH: THIẾT KẾ GIAO DIỆN & PHÁT TRIỂN FRONTEND WAREHOUSE AI

---

## 🎯 CÔNG THỨC 3 TỪ KHÓA ĐỂ DỄ HỌC THUỘC
Khi bước lên thuyết trình, bạn chỉ cần nhớ **3 từ khóa vàng**:
1. **MINIMALIST (Tối giản nghiệp vụ)**: Học hỏi Linear/Stripe, không màu mè hoa mỹ, tập trung vào dữ liệu.
2. **60 - 30 - 10 (Hệ màu Vàng nhạt - Đen)**: Nền kem dịu mắt 60%, Đen cấu trúc 30%, Vàng điểm nhấn 10%.
3. **TABULAR NUMS (Số liệu thẳng hàng)**: Font Monospace cho SKU và số lượng giúp thủ kho quét mắt nhanh nhất.

---

## ⏱️ DÀN Ý THUYẾT TRÌNH (5 - 7 PHÚT)

### SLIDE 1: MỞ ĐẦU & BỐI CẢNH THIẾT KẾ (1 phút)
- **Tiêu đề**: Triết lý thiết kế Giao diện Phân hệ Frontend - Warehouse AI.
- **Lời thoại mẫu**:
  > *"Kính thưa thầy cô và các bạn, đối với một hệ thống Quản lý kho hàng (WMS), người dùng như thủ kho và kế toán phải làm việc với các bảng dữ liệu hàng nghìn dòng suốt 8 tiếng mỗi ngày. Vì vậy, triết lý thiết kế Frontend của nhóm em không chạy theo các hiệu ứng màu mè hay gradient sặc sỡ, mà tập trung vào 3 tiêu chí: **Rõ ràng - Dễ quét mắt - Không gây mỏi mắt**. Nhóm lấy cảm hứng trực tiếp từ các dashboard nghiệp vụ hàng đầu thế giới như Stripe, Linear và Notion."*

---

### SLIDE 2: KIẾN TRÚC CÔNG NGHỆ FRONTEND (1 phút)
- **Tiêu đề**: Nền tảng Công nghệ & Cấu trúc Component.
- **Ý chính**:
  - **Core Framework**: React 19 kết hợp Vite Bundler.
  - **Tối ưu kích thước**: Không sử dụng các thư viện UI cồng kềnh (như Ant Design hay Material UI nặng nề). Toàn bộ giao diện sử dụng **100% CSS hiện đại với Design Tokens**.
  - **Tốc độ build**: Toàn bộ ứng dụng build trong chưa đầy **0.7 giây**, dung lượng bundle nén chỉ vỏn vẹn **~78KB**.
  - **Kiến trúc Module**: Phân tách rõ ràng giữa Service gọi API (`api.js`), Component Layout (`App.jsx`), Màn hình đăng nhập (`Login.jsx`) và 6 Tab chức năng độc lập.
- **Lời thoại mẫu**:
  > *"Về mặt kỹ thuật, nhóm lựa chọn React 19 cùng Vite. Nhóm chủ động không dùng thư viện giao diện có sẵn mà tự tay xây dựng hệ thống CSS Token riêng. Điều này giúp mã nguồn cực kỳ nhẹ, tải trang tức thì dưới 1 giây và hoàn toàn làm chủ từng pixel trên màn hình."*

---

### SLIDE 3: BẢNG MÀU 60-30-10 & HỆ THỐNG DESIGN TOKENS (1.5 phút) ⭐ (TRỌNG TÂM)
- **Tiêu đề**: Quy chuẩn Màu sắc & Tính thẩm mỹ công thái học (Ergonomics).
- **Ý chính**:
  - **60% Nền trung tính ấm (`#FFFDF5`)**: Nền màu kem rất nhạt thay cho nền trắng tinh chói lóa, giúp giảm ánh sáng xanh gây mỏi mắt.
  - **30% Đen cấu trúc (`#111111`)**: Dùng cho thanh Sidebar bên trái rộng 232px, tiêu đề và nút phụ viền 1px, tạo cảm giác vững chãi, tin cậy.
  - **10% Vàng nhạt thương hiệu (`#F9D65C`)**: Nút CTA chính duy nhất mỗi màn hình, tab đang chọn và biểu đồ.
  - **Nguyên tắc tương phản WCAG AA**: Tuyệt đối không dùng chữ vàng trên nền trắng; vàng chỉ làm màu nền với chữ đen hoặc chữ vàng trên nền sidebar đen.
  - **Màu trạng thái ngữ nghĩa**: Luôn hiển thị kèm **chấm màu tròn + chữ** (Xanh lá = Còn hàng/Đã nhập; Cam = Sắp hết; Đỏ = Hết hàng/Hủy).
- **Lời thoại mẫu**:
  > *"Điểm đặc biệt nhất trong giao diện là hệ màu chuẩn 60-30-10: 60% là nền kem ấm dịu mắt; 30% là sắc đen kỷ luật của sidebar và kiểu chữ; và 10% là sắc vàng nhạt đóng vai trò dẫn dắt hành vi người dùng vào đúng nút hành động quan trọng nhất. Mỗi trạng thái đều có chữ đi kèm chấm màu, giúp người dùng không bao giờ bị nhầm lẫn."*

---

### SLIDE 4: QUY TẮC BO GÓC & NGHỆ THUẬT TYPOGRAPHY (1 phút)
- **Tiêu đề**: Bo góc nghiêm ngặt & Phông chữ chuyên dụng.
- **Ý chính**:
  - **Hạn chế bo tròn (Radius $\le$ 4px)**: Nút bấm, ô nhập, bảng dữ liệu chỉ bo tối đa 4px; modal bo tối đa 6px. Không dùng dạng viên thuốc (pill) hay thẻ bóng đổ dày.
  - **2 Font duy nhất**:
    - `Inter`: Dành cho toàn bộ tiêu đề và nội dung tiếng Việt.
    - `JetBrains Mono`: Dành riêng cho **mã SKU, mã phiếu nhập/xuất và số lượng tồn**.
  - **Thuộc tính `tabular-nums`**: Các con số có độ rộng bằng nhau 100%, giúp các cột số lượng trong bảng thẳng tắp theo chiều dọc.
- **Lời thoại mẫu**:
  > *"Để giữ chất nghiêm túc của một phần mềm quản lý kho, nhóm áp dụng bán kính bo góc tối đa 4px, phân chia các khối bằng đường kẻ mảnh 1px thay vì bọc hộp đổ bóng. Đồng thời, nhóm sử dụng phông chữ lập trình JetBrains Mono với thuộc tính tabular-nums, giúp các con số thẳng hàng tuyệt đối khi thủ kho kiểm đếm."*

---

### SLIDE 5: TRẢI NGHIỆM TRÊN CÁC TRANG CHỨC NĂNG CHÍNH (1.5 phút)
- **Tiêu đề**: Bố cục màn hình & Tính năng tương tác.
- **Ý chính**:
  - **Dashboard**: Hàng 4 KPI dạng phẳng ngăn cách bằng đường kẻ dọc. Lưới 12 cột chia tỷ lệ 8 cột bảng tồn kho và 4 cột cảnh báo AI khẩn cấp.
  - **Hàng hóa (Products)**: Bảng dữ liệu chuẩn 48px/dòng, tự động ẩn các giá trị rỗng bằng dấu gạch ngang (`—`), tích hợp modal nhập hàng nhanh ngay tại từng dòng.
  - **Nhập / Xuất kho**: Bộ lọc trạng thái dạng tab gạch chân (Underlined Tabs) chuẩn mực; ô tìm kiếm có icon SVG nét mảnh 1.5px.
  - **AI Insights & Trợ lý mua hàng**: Bố cục 2 vùng rõ ràng; bộ đọc link website nằm cùng hàng ngang; khung chat phẳng với tin nhắn người dùng và AI phân biệt bằng nền màu dịu.
- **Lời thoại mẫu**:
  > *"Trên màn hình Dashboard, 4 chỉ số KPI được trải phẳng ngăn bằng vách kẻ dọc thay vì các khối hộp riêng lẻ. Tại các trang Nhập - Xuất kho, bộ lọc trạng thái dùng dạng tab gạch chân thanh lịch. Đặc biệt tại phân hệ AI Insights, giao diện khung chat được thiết kế phẳng tinh giản, tích hợp sẵn thanh quét link website ngay trên đầu."*

---

### SLIDE 6: KẾT LUẬN & ĐIỂM SÁNG DỰ ÁN (30 giây)
- **Lời thoại mẫu**:
  > *"Tóm lại, phần Frontend của Warehouse AI không chỉ đạt độ hoàn thiện cao về mặt thẩm mỹ hiện đại mà còn giải quyết bài toán thực tế về công thái học cho người lao động kho bãi: tải nhanh dưới 1 giây, dịu mắt, số liệu rõ ràng và thao tác chuẩn xác. Em xin cảm ơn thầy cô đã lắng nghe và rất mong nhận được câu hỏi góp ý!"*

---

## 💡 CÂU HỎI HỘI ĐỒNG THƯỜNG HỎI & CÁCH TRẢ LỜI NGẮN GỌN

**Hỏi 1: Tại sao không dùng Bootstrap, Tailwind hay Ant Design mà lại tự viết CSS?**
- **Trả lời**: *"Dạ, việc tự viết CSS dựa trên hệ thống Design Tokens giúp nhóm tối ưu dung lượng bundle chỉ còn ~78KB (nhẹ hơn gấp 5 lần so với dùng thư viện ngoài), kiểm soát 100% khả năng tương phản WCAG AA và dễ dàng chuyển đổi chủ đề (theme) sau này chỉ bằng cách thay đổi biến CSS ở root."*

**Hỏi 2: Tại sao lại chọn bảng màu Vàng nhạt - Đen thay vì Xanh dương truyền thống?**
- **Trả lời**: *"Dạ, đa số phần mềm kho hiện nay dùng màu xanh dương hoặc trắng chói rất dễ gây mỏi mắt khi nhìn bảng biểu lâu. Tông kem nhạt (#FFFDF5) kết hợp đen (#111111) tạo cảm giác ấm áp, sắc nét. Màu vàng (#F9D65C) là màu có bước sóng thị giác cao nhất, giúp mắt bắt ngay vào nút CTA chính mà không cần nhìn tìm kiếm."*

**Hỏi 3: Frontend có tương thích với thiết bị di động hay máy tính bảng không?**
- **Trả lời**: *"Dạ có, giao diện được xây dựng responsive đầy đủ theo 3 breakpoint: trên máy tính bảng sidebar sẽ thu gọn thông minh, trên điện thoại sidebar chuyển thành menu trượt (drawer) và các bảng dữ liệu có vùng cuộn ngang độc lập, đảm bảo vùng bấm tối thiểu 40x40px cho màn hình cảm ứng."*
