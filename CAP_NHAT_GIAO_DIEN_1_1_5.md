# Bản 1.1.5 — Thu gọn thẻ học sinh

## Những thay đổi

- Khung danh sách căn giữa, rộng tối đa 1320px.
- Lưới tự xếp theo chiều rộng thực tế, không phụ thuộc khai báo container
  query đang thiếu ở bản cũ. Không ép 4–5 cột khiến nội dung thẻ quá nhỏ.
- Cụm thao tác có thứ tự **Trừ → Điểm số → Cộng → Hồ sơ → Menu**, nằm ngay
  dưới tên và nhãn tổ, không còn bị đẩy về hai đầu màn hình.
- Bỏ chiều cao tối thiểu 116px; padding dọc 7px, ngang 10px. Khoảng cách
  giữa các thẻ 12px. Thẻ tự tăng chiều cao khi tên hoặc vai trò dài.
- Giữ các nút, ID dùng để cập nhật điểm, tìm kiếm, lọc tổ và phân quyền cũ.
  Menu và bảng tiêu chí điểm vẫn được phép hiển thị bên ngoài thẻ.
- Thiết bị có con trỏ chạm dùng vùng bấm tối thiểu 40px cho nút thao tác
  chính. Khi khung hẹp, cụm nút được phép xuống dòng thay vì tràn ngang.

Các lớp thực tế của dự án là `.student-directory-grid` và
`.student-directory-card`, tương ứng với student-list/student-card trong
yêu cầu. CSS nằm trong khối `student-directory-layout-compact` của index.html.

### Cách lưới chọn số cột

Đây là chiều rộng **khung danh sách sau khi trừ sidebar và padding**, không
phải độ phân giải màn hình. Công thức CSS dùng `auto-fill` để giữ kích thước
thẻ khi lọc còn ít học sinh.

| Chiều rộng khung | Số cột theo quy tắc CSS |
| --- | --- |
| Dưới 732px | 1 |
| Từ 732px đến dưới 1104px | 2 |
| Từ 1104px trở lên | 3, khung giới hạn 1320px |

## Cập nhật từ bản 1.1.4

1. Giữ một bản sao mã nguồn hiện tại. Nếu đã tự chỉnh mã nguồn ngoài gói
   1.1.4, hãy đối chiếu các thay đổi riêng trước khi chép đè.
2. Giải nén gói 1.1.5, cập nhật nội dung vào repository GitHub đang dùng.
   Nếu chỉ cần áp dụng giao diện lên đúng bản 1.1.4, file chức năng duy nhất
   thay đổi là **index.html**; các file còn lại là phiên bản, kiểm thử và
   hướng dẫn. Cập nhật toàn gói để giữ đầy đủ kiểm thử và số phiên bản.
3. Chờ Netlify hoàn thành và báo Published, rồi tải lại trang bằng
   **Ctrl + Shift + R**. Mở mục **Học sinh** để kiểm tra.

Không cần đổi biến môi trường, tạo lại mật khẩu, cấp lại mã học sinh hoặc
sửa Rules cho thay đổi giao diện này. Cấu hình đăng nhập từ bản 1.1.4 được
giữ nguyên. Không tải node_modules, dist cục bộ hoặc file khóa quản trị lên
GitHub; để Netlify build từ mã nguồn như hiện tại.

## Kiểm tra sau cập nhật

- Trên máy tính: mở/đóng sidebar và thay đổi độ rộng cửa sổ, kiểm tra lưới
  chuyển 2–3 cột khi đủ chỗ, không còn thẻ kéo dài toàn màn hình.
- Trên điện thoại: một cột, không tràn ngang; tên và nhãn dài xuống dòng.
- Thử bộ lọc tên/tổ và Xóa lọc; sĩ số không bị thay đổi.
- Mở menu ba chấm, lịch sử/hồ sơ và bảng tiêu chí trừ/cộng; kiểm tra chúng
  không bị thẻ bên cạnh che. Không cần thực sự cộng/trừ điểm để xem bố cục.
- Kiểm tra tài khoản không có quyền chấm điểm vẫn bị từ chối như trước.

Bản vá đã được kiểm tra mã và các ca mô phỏng DOM; chưa xác nhận ảnh thực
tế trong trình duyệt vì môi trường kiểm tra chặn trang localhost. Không
tuyên bố đã đo chiều cao pixel thực tế hoặc đã kiểm thử trên thiết bị thật.
Chi tiết kết quả trong KIEM_THU.md. Chưa tự triển khai lên website đang chạy.
