> **Bản hiện hành 05/10/2026:** xem [CAP_NHAT_DIEM_TRUC_TIEP.md](CAP_NHAT_DIEM_TRUC_TIEP.md). Đã bỏ xét duyệt điểm; các mô tả đề xuất/chờ duyệt trong tài liệu cũ bên dưới không còn áp dụng.

# Giao diện Ban cán sự — bản cập nhật mới nhất

Bản này giữ các sửa đồng bộ và phục hồi phiên trước, bổ sung giao diện pastel theo phong cách GVCN cùng phân quyền theo từng chức vụ. Chưa triển khai lên website thật.

## Xem thiết kế

Mở `XEM_TRUOC_BAN_CAN_SU.html` trong thư mục đã giải nén. Đây là bản minh họa tạo từ giao diện mới bằng dữ liệu giả lập, không kết nối Firebase và không lưu dữ liệu lớp. Bấm các thẻ để đổi nội dung xem trước.

Header gọn với avatar chữ cái theo tên học sinh, tên/chức vụ và nút đăng xuất; banner hồng–tím–xanh mềm mại; thẻ gradient bo tròn có icon SVG ở góc phải. Bố cục 3 cột trên màn hình rộng, 2 cột trên điện thoại. Không cần thư viện icon ngoài để hiển thị các thẻ.

## Quyền hiển thị và thao tác

| Thẻ | Điều kiện xem | Điều kiện thao tác |
|---|---|---|
| Điểm danh nhanh | Tab diem-danh và chuyên mục Chuyên cần | Có quyền add |
| Thi đua các tổ | Tab tich-diem hoặc bao-cao | Chỉ tổng hợp điểm hiện tại của học sinh trong phạm vi; không chỉnh qua thẻ này |
| Thành viên lớp | Tab hoc-sinh | Chỉ xem tên/tổ; không quản trị hồ sơ |
| Ghi nhận nề nếp | Tab tich-diem và quyền add | Theo chuyên mục và phạm vi được cấp; đề xuất tổ giữ cơ chế duyệt sẵn có |
| Lịch trực nhật | Tab truc-nhat | Chấm khi có quyền add, vẫn kiểm tra ca được giao trên máy chủ |
| Sổ điểm học tập | Tab bao-cao, gradeEntry và cài đặt cho phép nhập | Chỉ nhập trong phạm vi chức vụ đang chọn |
| Theo dõi đề xuất | Tab tich-diem | Xem đề xuất theo tổ/chuyên mục; học sinh không có nút duyệt |

Không có nút phân quyền, đổi mật khẩu người khác, cấu hình hệ thống, sao lưu/khôi phục hay xóa toàn lớp trong giao diện BCS. Backend kiểm tra quyền trên từng yêu cầu, không chỉ ẩn nút.

## Ánh xạ chức vụ

Tài khoản `bcs` lấy các chức vụ hoạt động gán đúng `studentId`. Nếu có nhiều chức vụ, giao diện cho chọn chức vụ đang sử dụng; mỗi yêu cầu gửi `roleKey` và máy chủ xác minh khóa này thuộc chính học sinh đó. Không cộng gộp phạm vi các chức vụ.

Lượt mở trang chọn một chức vụ có phân công hợp lệ. Vì vậy một vai trò cũ lệch tổ không còn chặn vai trò hợp lệ khác của cùng học sinh. Tổ trưởng chỉ xem tổ được GVCN phân công và phải khớp tổ của học sinh. Lớp trưởng/lớp phó theo phạm vi GVCN cấu hình, không mặc định được quản trị toàn lớp. Tổ phó `to_pho` tiếp tục dùng liên kết tổ trong membership.

Nếu mọi phân công đều sai hoặc bị khóa, hệ thống không tự cấp quyền. Header/banner vẫn hiển thị cùng ba thẻ Làm mới dữ liệu, Đăng nhập lại, Về trang đăng nhập. Không có dữ liệu lớp ở màn hình này. Khi GVCN sửa phân công hợp lệ, trang tự đọc lại và mở nội dung; xem PHAN_QUYEN_TU_DONG.md.

## File thay đổi của lần này

- `to-pho.js`: khung header/banner, thẻ tính năng, nội dung theo thẻ, chọn chức vụ, thẻ phục hồi.
- `deputy-dashboard.css`: bộ giao diện responsive pastel, card gradient, avatar, trạng thái focus và reduced-motion.
- `server/deputy-service.mjs`: chọn/xác minh chức vụ; cung cấp quyền xem riêng với quyền ghi; giới hạn dữ liệu trả về.
- `scripts/build.mjs`: đưa CSS mới vào dist.
- Kiểm thử quyền, DOM và chọn chức vụ được bổ sung trong thư mục tests.

Cần triển khai đầy đủ mã nguồn lên Netlify, gồm frontend và Functions. Không chỉ thay index.html. Giữ biến môi trường Firebase/Netlify hiện có. Bản hiện hành có thay đổi Firestore Rules để đồng bộ phân công theo thời gian thực; phải cập nhật Rules trước khi triển khai frontend mới.

## Kiểm tra đã thực hiện

68/68 kiểm thử thuộc nhóm phân quyền, giao diện DOM, đồng bộ và phục hồi phiên đạt. Đã kiểm tra thẻ chỉ xuất hiện theo quyền, BCS không có điều hướng GVCN, chọn thẻ không phát sinh ghi dữ liệu, đổi chức vụ thay phạm vi thay vì cộng gộp, chặn roleKey không được phân công, chặn ghi ngoài tổ, và màn hình lỗi giữ bộ khung mới nhưng không lộ dữ liệu lớp.

Build và kiểm tra cú pháp đạt. Bản xem trước dùng DOM mô phỏng; chưa kiểm tra trực quan trên Safari/iPhone thật, chưa thử tài khoản lớp thật và chưa triển khai. Các báo cáo trước vẫn nêu lỗi có sẵn của bộ kiểm thử toàn ứng dụng; không khẳng định toàn bộ ứng dụng đã được kiểm thử đạt.
