# Sửa kẹt màn hình đăng nhập — bản 1.1.2

## Bản này sửa gì?

- Bỏ việc tự đặt `window.useCloud=false` sau 1,8 giây. Mạng chậm, kiểm tra
  quyền chậm hoặc dữ liệu Firestore đến muộn không còn khiến luồng khởi động
  bị chuyển về màn hình đăng nhập và hủy listener đang chờ.
- Hiện màn hình “Đang mở sổ tay lớp” trong khi chờ Firebase.
- Bỏ thông báo “Đăng nhập an toàn thành công” được hiển thị trước khi dữ liệu
  thực sự sẵn sàng. Listener vẫn quyết định lúc mở màn hình chính.
- Giữ cơ chế kiểm tra quyền và đăng nhập Firebase; không mở chế độ quản trị
  cục bộ khi mạng lỗi. Không đổi dữ liệu, mã HS/PH 5 số, mật khẩu, Rules hoặc
  cấu hình bí mật. Giữ nguyên bản sửa `ERR_REQUIRE_ESM` của 1.1.1.

Lỗi thời gian chờ đã được tái hiện trong mã. Ảnh Console không có lỗi đỏ
không đủ chứng minh đây là nguyên nhân duy nhất trên website đang chạy;
cần kiểm tra lại sau khi triển khai.

## Cách cập nhật website hiện có

1. Giải nén ZIP vào thư mục riêng. Không cần cài Node.js trên máy cá nhân.
2. Mở repository GitHub đang liên kết Netlify. Nếu đã có chỉnh sửa riêng
   sau bản 1.1.1, sao lưu và đối chiếu trước khi cập nhật các file trùng tên.
3. Chọn **Add file → Upload files**, tải nội dung bên trong thư mục giải nén
   vào thư mục gốc repository. Không tải cả ZIP hoặc thư mục bọc ngoài;
   không xóa các file cũ trước.
4. Commit lên nhánh triển khai hiện tại, ví dụ thông điệp
   `Fix startup login 1.1.2`. Nếu nhánh có bảo vệ, dùng quy trình duyệt hiện có.
5. Vào **Netlify → Deploys**, đợi bản từ commit vừa tạo hiện **Published**.
   Kiểm tra đúng commit mới; không chỉ triển khai lại commit cũ.
6. Mở website, nhấn **Ctrl + Shift + R**, đăng nhập GVCN. Có thể thấy
   “Đang mở sổ tay lớp” trong lúc tải, rồi màn hình chính.

Giữ nguyên biến môi trường hiện tại; không cần tạo lại Service Account,
thay khóa, xóa Firebase, dán lại Rules hoặc bật thêm tùy chọn Node.js.
Không tải file Service Account hay file chứa mật khẩu thật lên GitHub.
Giữ trạng thái `SIMPLE_LOGIN_ENABLED` hiện tại; sửa lỗi này không cần bật
đăng nhập đơn giản trước khi GVCN kiểm tra danh sách/quyền.

Nếu vẫn chưa vào được: gửi ảnh toàn màn hình sau khi chờ và ảnh Console
mới sau lần tải lại. Không gửi khóa, mật khẩu, token hoặc danh sách mã học sinh.
Nếu dữ liệu lớp trống bất thường, dừng kiểm tra và không bấm Đồng bộ/bật mã.

## File thay đổi so với 1.1.1

- `index.html`: luồng chờ khởi động và thông báo đăng nhập.
- `package.json`, `package-lock.json`: chỉ cập nhật số phiên bản lên 1.1.2;
  không thay phụ thuộc.
- `tests/startup.test.mjs`: kiểm thử hồi quy mới.
- `README.md`, `KIEM_THU.md`, `CAP_NHAT_DANG_NHAP.md`: tài liệu cập nhật.

Các file khác giữ nguyên. ZIP vẫn chứa đầy đủ mã nguồn để triển khai cả
giao diện và hai Netlify Functions; không kéo riêng `dist` lên Netlify Drop.
