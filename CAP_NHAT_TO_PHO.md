> **Bản hiện hành 05/10/2026:** xem [CAP_NHAT_DIEM_TRUC_TIEP.md](CAP_NHAT_DIEM_TRUC_TIEP.md). Đã bỏ xét duyệt điểm; các mô tả đề xuất/chờ duyệt trong tài liệu cũ bên dưới không còn áp dụng.

# Bản v13 — Liên kết tài khoản và hiển thị chức vụ Tổ phó

- Danh sách tài khoản đọc cả tài khoản to_pho, hiển thị đúng chức vụ và trạng thái mở/khóa; đổi mật khẩu và mở quyền gửi đúng loại to_pho.
- Phân công đang bật được lưu vào deputyAssignments trong cùng transaction với tài khoản và membership. Thay người hoặc khóa quyền cập nhật liên kết này; không thay điểm học sinh.
- Tài khoản cũ được đối chiếu khi GVCN mở danh sách tài khoản hoặc dùng Đồng bộ tài khoản thông thường. Không có API riêng, timer, toast hoặc tiến trình đồng bộ huy hiệu.
- Huy hiệu màu cam đọc trực tiếp deputyAssignments khi vẽ thẻ trong sơ đồ lớp. Chỉ hiện đúng học sinh, đúng tổ, phân công đang bật.
- Phân quyền API theo tổ và Firestore Rules của v12 tiếp tục áp dụng; trường hiển thị không được dùng để cấp quyền truy cập.

## Áp dụng
Cập nhật toàn bộ bản v13 gồm website và Netlify Functions; giữ nguyên cấu hình Firebase, áp dụng firestore.rules kèm theo nếu chưa triển khai v12. Đăng nhập GVCN, mở danh sách quản lý tài khoản một lần để đối chiếu các phân công cũ, rồi kiểm tra sơ đồ lớp.

## Điểm cần kiểm chứng trước khi sử dụng
54 kiểm thử tài khoản, phạm vi tổ, liên kết và render huy hiệu đạt; build đạt. Chưa kiểm tra trực quan trên điện thoại/máy tính hoặc triển khai website thực tế. Kiểm tra đổi người, khóa/mở quyền, tải lại trang và đăng nhập Tổ phó để xác nhận dữ liệu tổ. Phần nói gỡ huy hiệu ở hướng dẫn v12 được thay thế bằng cách render trực tiếp trong bản v13 này.
