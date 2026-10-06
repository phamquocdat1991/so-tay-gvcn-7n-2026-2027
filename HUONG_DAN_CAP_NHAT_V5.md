# Bản v5 — giao diện gọn, banner và thẻ thống kê

## Các thay đổi đã gộp

1. **Thẻ học sinh:** giảm đệm xuống 6px × 8px, avatar 36px, các nút desktop 30px và khoảng cách 5px. Avatar/tên/chức vụ thành một cụm phía trên; hàng − / điểm / + / Hồ sơ / menu nằm ngay bên dưới, dùng toàn bộ chiều ngang thẻ.
2. **Lưới học sinh:** tối đa 4 cột, khoảng hở 10px. Với chuột, vùng danh sách rộng từ 990px sẽ có 4 cột. Khung hẹp tự giảm còn 1–3 cột; không ép 4 cột khi phóng to làm thiếu chỗ. Trên thiết bị cảm ứng, nút giữ tối thiểu 44px và thẻ cần khoảng rộng hơn; 4 cột khi vùng danh sách từ 1150px.
3. **Banner Học sinh:** chuyển lên đầu trang, trước thanh tìm kiếm/lọc; mở sẵn và vẫn có thể thu gọn. Không thay đổi ảnh hoặc kích thước khung banner này.
4. **Năm thẻ thống kê Tổng quan:** cùng một hàng trên desktop. Khi cửa sổ dưới 1024px, hàng thẻ cho cuộn/vuốt ngang trong khung riêng; không đẩy thẻ cuối xuống hàng dưới và không kéo rộng toàn trang.
5. **Cửa sổ danh sách chi tiết:** bỏ 6 ô thống kê điểm danh cùng chú thích và bỏ toàn bộ cột/cụm thao tác nhanh trong ảnh (−/+, Hồ sơ, chọn điểm danh). Bảng còn 9 cột thông tin. Vẫn tìm kiếm/lọc, xuất/in và bấm tên học sinh để xem hồ sơ. Các hàm thao tác và CSS chỉ phục vụ phần đã bỏ cũng được dọn dẹp.
6. **Banner Công Cụ Lớp Học:** giảm đệm, tiêu đề và hình tên lửa; cụm biểu tượng bên phải nằm gọn một hàng. Màn hình nhỏ ẩn phần minh họa phụ, giữ tiêu đề, mô tả và các công cụ bên dưới. Không giới hạn chiều cao cứng khiến chữ bị cắt.

Trang Điểm danh riêng, cộng/trừ điểm trên thẻ học sinh, quyền truy cập, chức năng giáo viên tự cấp mật khẩu và dữ liệu hiện có được giữ nguyên. Xuất/in vẫn có thông tin điểm danh; chỉ phần hiển thị trong cửa sổ chi tiết bị bỏ. Khối 4 thẻ điểm danh đã bỏ ở bản v4 không xuất hiện trở lại.

## Cập nhật

- **Đang dùng đầy đủ bản v4:** chỉ thay `index.html` ở thư mục gốc kho mã bằng tệp cùng tên trong gói này. `access-manager.js` và máy chủ không thay đổi so với v4.
- **Chưa cập nhật đủ các bản trước:** gói có các tệp mã nguồn liên quan; ghép vào đúng các thư mục tương ứng, giữ các tệp và cấu hình khác của dự án. Không xóa kho mã hoặc dữ liệu.
- Ghi nhận thay đổi vào nhánh đang được Netlify triển khai, rồi chờ bản triển khai của commit mới hoàn tất. Không chỉ chạy lại deploy của commit cũ.
- Đây là gói mã nguồn cho dự án GitHub/Netlify hiện có, không phải thư mục `dist` đã build để kéo thả.

## Nhận biết đúng bản mới

- Trang Học sinh có nhãn **Lưới 4 cột · v5**.
- Thẻ Tổng số học sinh có dòng **Bấm mở danh sách · v5**.
- Cửa sổ chi tiết có dòng **Danh sách chi tiết · v5**.
- Banner Học sinh nằm trước thanh tìm kiếm. Cửa sổ chi tiết không còn 6 ô thống kê hoặc cột Thao tác nhanh.

## Kiểm thử

Kiểm tra HTML, cú pháp JavaScript và **159 kiểm thử tự động** đã đạt. Bộ kiểm thử bao gồm bố cục CSS nguồn, thứ tự banner/thanh lọc, công thức chia cột, tìm kiếm/lọc, mở/đóng cửa sổ, dữ liệu dài, phân quyền, xuất/in, cấu trúc banner, và xác nhận việc bỏ phần hiển thị không xóa dữ liệu điểm danh.

Các kiểm thử của chức năng thao tác nhanh đã bị loại bỏ được thay bằng kiểm thử xác nhận phần đó không còn trong giao diện/mã nguồn. Số kiểm thử không phải số thiết bị đã kiểm tra.

Chưa kiểm chứng bố cục bằng trình duyệt thật hoặc triển khai lên Netlify. Sau cập nhật, hãy kiểm tra cửa sổ rộng/hẹp, điện thoại dọc/ngang và mức phóng to thường dùng. Tên dài được xuống dòng, hàng thao tác được phép xuống hàng nếu không đủ chỗ; không thu nhỏ vùng bấm cảm ứng để cố nhét vừa.

Không xóa dữ liệu học sinh hay điểm danh. Có thể khôi phục giao diện trước bằng gói v4 hoặc lịch sử commit của kho mã.
