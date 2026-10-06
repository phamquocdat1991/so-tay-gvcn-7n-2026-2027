# Thẻ học sinh — Lưới gọn 02.09.2026 v2

## Thay đổi lần này

- Danh sách căn giữa, rộng tối đa 1.200px. Lưới tự xếp theo **chiều rộng vùng nội dung**, không chỉ theo màn hình: dưới 652px là 1 cột; từ 652px là 2 cột; từ 984px là 3 cột. Khi đóng/mở thanh bên hoặc phóng to trang, số cột tự điều chỉnh.
- Thẻ không còn chiều cao cố định; giữ đệm dọc 7px, ngang 10px, khoảng cách giữa thẻ 12px. Tên dài và nhãn vai trò được xuống dòng, không cắt mất tên.
- Cụm **− / điểm / + / Hồ sơ / ⋮** nằm gần tên, không bị đẩy về hai đầu màn hình. Menu mở bên dưới và neo theo thẻ, tránh tràn mép trái khi các nút xuống dòng.
- Trên màn hình nhỏ hoặc thiết bị cảm ứng, cụm thao tác dùng toàn chiều ngang thẻ; các nút chính có vùng bấm tối thiểu 44 × 44px. Ô tìm kiếm và chọn tổ dùng chữ 16px.
- CSS giới hạn trong danh sách quản lý học sinh; không đổi khung banner. Giữ chức năng tìm kiếm, lọc tổ, hồ sơ, điểm, phân quyền, danh sách nhanh từ thẻ Tổng số học sinh và giáo viên tự cấp mật khẩu ở bản trước.

## Cập nhật

1. Sao lưu mã nguồn hiện tại. Giải nén `cap-nhat-the-hoc-sinh.zip`.
2. Nếu các bản sửa danh sách nhanh và tự cấp mật khẩu trước đó đã được triển khai, lần này chỉ cần thay **`index.html`** vào đúng vị trí cũ trong dự án. Không đổi tên tệp trang chính và không dán CSS riêng vào phiên bản cũ.
3. Gói cũng kèm các tệp hỗ trợ từ bản trước nếu cần cập nhật đồng bộ. Giữ nguyên các tệp khác của dự án, cấu hình Firebase, biến môi trường và quyền dữ liệu. Không đưa khóa quản trị vào HTML.
4. Với dự án GitHub kết nối Netlify, cập nhật vào đúng nhánh đang xuất bản rồi chờ trạng thái **Published**. Đây là gói mã nguồn; không tải riêng HTML lên dịch vụ tĩnh để thay thế các Functions đăng nhập.
5. Mở trang Netlify trực tiếp và tải lại **Ctrl+Shift+R**. Trên điện thoại, tải lại hoặc mở trang trong tab riêng tư để đối chiếu.

**Nhận biết bản mới:** bên cạnh bộ đếm danh sách có dòng **“Lưới gọn · 02.09.2026 v2”**. Nếu chưa thấy dòng này, trang chưa tải đúng tệp mới; kiểm tra bản Published và nhánh triển khai trước khi sửa tiếp. Không cần xóa dữ liệu lớp.

## Kiểm tra sau cập nhật

- Máy tính: mở trang Học sinh, thử bật/tắt thanh bên; vùng đủ rộng hiển thị 2–3 cột và không có khoảng trắng lớn phía dưới từng thẻ.
- Điện thoại: thử dọc/ngang; tên và nhãn không mất, các nút dễ bấm. Nếu thiếu chỗ, nút được xuống dòng thay vì làm tràn trang.
- Tìm theo tên/mã, lọc một tổ rồi xóa lọc. Các thẻ bị ẩn không được xuất hiện lại do CSS lưới.
- Mở Hồ sơ, mở/đóng menu ⋮, mở rồi đóng bảng chọn tiêu chí cộng/trừ. Không cần xác nhận thay đổi điểm để thử bố cục; chỉ lưu khi thực sự muốn ghi nhận.
- Kiểm tra thẻ Tổng số học sinh vẫn mở danh sách nhanh như trước.

## Kiểm thử và giới hạn

Bản sửa được kiểm tra cấu trúc HTML, cú pháp JavaScript, công thức số cột, thứ tự nhóm nút, trạng thái bộ lọc, menu, phân quyền và các kiểm thử hồi quy toàn ứng dụng bằng dữ liệu giả. Chưa kiểm tra trực quan trên trình duyệt thật hoặc triển khai lên Netlify của bạn. Cần thực hiện các bước kiểm tra sau cập nhật ở trên.

Hướng dẫn chức năng từ bản trước: `CAP_NHAT_DANH_SACH_HOC_SINH.md` và `CAP_NHAT_MAT_KHAU_GIAO_VIEN.md`. Tên ZIP trong các hướng dẫn cũ là tên gói của lần trước; gói lần này là `cap-nhat-the-hoc-sinh.zip`.
