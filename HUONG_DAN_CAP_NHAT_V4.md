# Bản v4 — chữ không tràn khung và bỏ khối 4 thẻ điểm danh

## Thay đổi trong bản này

- Bỏ quy tắc ép mọi chữ trong nút lên một dòng khi thay đổi mật độ giao diện.
- Cho chữ dài trong thẻ, tiêu đề, thanh công cụ và hộp thoại xuống dòng; phần tử con có thể co theo khung. Các vị trí chủ động dùng dấu ba chấm vẫn giữ cách hiển thị đó.
- Thẻ “Tổng số học sinh” giữ bố cục dọc. Hàng thẻ tổng quan tự chia cột theo chiều rộng thực tế.
- Bảng quyền đăng nhập chuyển sang từng khối học sinh ở màn hình không quá 600px; tên, nhãn, thông báo dài được xuống dòng. Chức năng giáo viên tự cấp mật khẩu không thay đổi.
- Xóa hoàn toàn khối “Điểm danh hôm nay” gồm Sĩ số thực tế / Có mặt / Vắng / Cần lưu ý ở trang Quản lí Học sinh, tất cả chú thích bên dưới, CSS riêng và phép tính cảnh báo chỉ phục vụ khối này.
- Giữ nguyên dữ liệu và chức năng điểm danh, thống kê trong cửa sổ danh sách chi tiết, tìm kiếm/lọc, cộng trừ điểm, xuất/in và phân quyền. Không thay đổi kích thước khung banner.

## Cập nhật trên GitHub / Netlify

1. Giải nén gói này trên máy tính. Giữ nguyên cấu trúc thư mục `server`, `netlify/functions` và `scripts`.
2. Nếu kho mã đã có đầy đủ bản v3, lần này chỉ cần thay đúng hai tệp ở thư mục gốc: `index.html` và `access-manager.js`.
3. Nếu các bản trước chưa được đưa lên, cập nhật các tệp mã nguồn trong gói vào đúng đường dẫn tương ứng. Không xóa kho mã, dữ liệu hay cấu hình môi trường đang có. Không đổi tên tệp chính thành `index(3).html` hoặc đặt cả gói trong thư mục con mới.
4. Chọn **Commit changes** để lưu thay đổi vào nhánh `main`. Sau đó chờ Netlify triển khai commit mới. Chạy lại một deploy của commit cũ không cập nhật nội dung tệp.
5. Khi Netlify báo Published cho commit mới, mở trang Quản lí Học sinh và tìm dòng **Giao diện gọn · v4** cạnh bộ đếm học sinh.

Gói này chứa mã nguồn cho kho GitHub đang kết nối với Netlify, không phải thư mục website đã build để kéo thả trực tiếp. Không tải tệp `.env`, khóa riêng hoặc thông tin thẻ thanh toán lên GitHub.

## Kiểm tra sau khi triển khai

- Thu nhỏ cửa sổ; thử điện thoại dọc/ngang và mức phóng to trình duyệt 200%. Kiểm tra tên dài, vai trò dài, thanh tìm kiếm và các nút.
- Trang Quản lí Học sinh không còn khối 4 thẻ hoặc chú thích điểm danh bên dưới thanh lọc.
- Bấm “Tổng số học sinh”: cửa sổ chi tiết vẫn mở, tìm kiếm/lọc vẫn dùng được. Thống kê trong cửa sổ này được giữ lại theo phạm vi chỉnh sửa.
- Mở Quản lý quyền đăng nhập: trên điện thoại, thông tin mỗi em xếp dọc. Không cần đổi mật khẩu thật chỉ để thử bố cục.
- Bảng dữ liệu nhiều cột vẫn có vùng cuộn ngang riêng; không kéo rộng cả màn hình.

## Kiểm thử và phạm vi xác nhận

Kiểm tra cấu trúc HTML, cú pháp JavaScript và 164 kiểm thử tự động đã đạt. Bao gồm kiểm thử CSS nguồn, dữ liệu tên dài, tìm kiếm/lọc, mở hộp thoại, quyền thao tác và phép tính điểm danh dùng chung.

Chưa kiểm chứng bố cục bằng ảnh chụp trên trình duyệt thật và chưa triển khai bản này lên website Netlify của bạn. Không coi kiểm thử mã nguồn là bảo đảm hiển thị trên mọi thiết bị.

Chỉ cấu trúc hiển thị và logic riêng của khối 4 thẻ đã được bỏ; không xóa dữ liệu điểm danh. Có thể khôi phục giao diện cũ bằng bản v3 hoặc lịch sử commit trước khi cập nhật.
