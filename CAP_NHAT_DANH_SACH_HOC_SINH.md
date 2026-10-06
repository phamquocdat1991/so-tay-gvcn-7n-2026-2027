# Thẻ Tổng số học sinh — Danh sách nhanh 02.09.2026

## Cô nhận được gì?

- Bấm toàn bộ thẻ **Tổng số học sinh** để mở danh sách chi tiết trong cửa sổ lớn. Không cần chuyển qua menu khác.
- Tìm tên có dấu/không dấu, mã HS hoặc ID; lọc theo tổ. Hai bộ lọc hoạt động kết hợp.
- Đầu danh sách có sĩ số thực tế, có mặt, vắng có phép, vắng không phép, đi muộn, chưa điểm danh của **ngày hiện tại**. Có mặt bao gồm đi muộn; không cộng hai số này lần nữa. Học sinh chưa có bản ghi không bị tính mặc định là có mặt. Tổng thống kê không đổi theo bộ lọc.
- Mỗi học sinh có **− / +**, chọn tiêu chí của lớp rồi xác nhận lưu; có chọn trạng thái điểm danh và nút **Hồ sơ**. Các quyền của cán bộ lớp vẫn theo tổ/chuyên mục đã được giao.
- GVCN có **Xuất Excel** và **In danh sách**, lấy đúng học sinh đang lọc. Excel có thêm trang thống kê toàn phạm vi. Nếu thư viện Excel chưa tải được, ứng dụng thông báo và xuất CSV dự phòng.
- Máy tính dùng bảng; điện thoại dưới 768px dùng thẻ, không bắt buộc kéo ngang cả bảng. Nút thao tác tối thiểu 44px, ô chọn điểm danh 16px, bộ lọc tổ cuộn ngang riêng. Màn hình thấp cho phép cuộn toàn cửa sổ.

## Vì sao bản trước có thể mất cửa sổ danh sách?

Mã cũ đã có hàm mở danh sách. Tuy nhiên, đồng bộ Cloud gọi `renderLayout()` thay toàn bộ giao diện, bao gồm cửa sổ vừa mở. Bản này giữ cửa sổ, bộ lọc, vị trí cuộn và con trỏ khi cập nhật cùng màn hình; khi đóng, đổi tab hoặc mất quyền thì không tự mở lại.

Sự kiện bấm được gắn trên nút và có một bộ xử lý chung tồn tại qua các lần dựng lại giao diện. Bấm vào chữ, số hay biểu tượng chỉ mở một lần. Lỗi trong báo cáo cảnh báo 30 ngày không còn chặn việc mở danh sách.

**Chưa xác minh trực tiếp bản đang chạy trên Netlify của cô.** Ảnh chụp không cho biết chính xác mã nào đã được xuất bản; cần kiểm tra dấu hiệu phiên bản bên dưới.

## Cập nhật đúng dự án đang dùng

1. Sao lưu mã nguồn đang chạy và dữ liệu lớp bằng chức năng hiện có.
2. Giải nén `cap-nhat-danh-sach-hoc-sinh.zip`. Bên trong có `index.html` ngay ở gốc cùng các tệp hỗ trợ.
3. Cập nhật các tệp này vào **repository GitHub đang kết nối với Netlify**, đúng vị trí cũ. Giữ các tệp khác; không xóa repository, không tạo Firebase mới. Không tải nguyên ZIP vào repository rồi để nguyên chưa giải nén.
4. Nếu gói tự cấp mật khẩu ở lượt trước đã được triển khai đầy đủ, thay `index.html` là đủ cho phần danh sách lần này. Nếu chưa, dùng toàn bộ gói để giữ chức năng giáo viên tự cấp mật khẩu.
5. Giữ nguyên biến môi trường và Firestore Rules hiện có. Không đổi `SIMPLE_AUTH_SECRET`, không đưa khóa quản trị vào mã nguồn. Bản sửa không yêu cầu nới quyền dữ liệu.
6. Chờ Netlify hoàn tất bản mới với trạng thái **Published**. Cấu hình trong gói: `npm run build`, xuất bản `dist`, Functions tại `netlify/functions`.
7. Mở trang Netlify trực tiếp và tải lại bằng **Ctrl+Shift+R** trên máy tính. Nếu thử trong cửa sổ xem trước của công cụ khác, hãy mở đúng bản đã cập nhật; bản xem trước không chứng minh bản Netlify đã đổi.

**Dấu hiệu đúng phiên bản:** thẻ ghi “Bấm xem danh sách · Điểm danh”; chân cửa sổ ghi **Danh sách nhanh · 02.09.2026**. Nếu vẫn chỉ thấy giao diện cũ thì kiểm tra bản Published và tệp `index.html` đã cập nhật, không cần xóa dữ liệu lớp.

## Thử nhanh sau khi Published

1. Đăng nhập GVCN, bấm chữ, số hoặc biểu tượng trên thẻ; đều phải mở cùng danh sách. Đóng và mở lại.
2. Tìm một tên không dấu, thử mã HS; chọn tổ. Kiểm tra số học sinh lọc và tổng sĩ số. Tổng sĩ số không được thành số đã lọc.
3. Chọn đúng học sinh, cộng điểm theo tiêu chí. Kiểm tra điểm/sao và lịch sử. Chỉ làm với thao tác thật cô muốn ghi nhận, không thử trên dữ liệu thật rồi bỏ quên.
4. Điểm danh hôm nay. Chọn lại cùng trạng thái không tạo lượt mới. Đi muộn/vắng không phép áp dụng định mức chuyên cần **đã có của lớp**, có xác nhận; đổi lại trạng thái sẽ đối soát khoản cũ, không trừ chồng. Ngày từng xem ở tab Điểm danh không làm thao tác ở đây ghi nhầm ngày.
5. Xuất một tổ sang Excel, đối chiếu tên, mã có số 0 ở đầu, sĩ số và trạng thái. Tệp chứa thông tin cá nhân/mã HS nên chỉ gửi người được phép nhận.
6. In danh sách đã lọc; kiểm tra xem trước đủ các trang. Có thể chọn lưu PDF bằng hộp thoại in của trình duyệt.
7. Thử trên điện thoại dọc/ngang và máy tính. Khi mạng cập nhật, danh sách phải giữ bộ lọc và vị trí cuộn. Tổ trưởng không được thao tác ngoài tổ hoặc chuyên mục được giao.

## Phạm vi và kiểm thử

- Không thay banner, mã HS/PH, cơ chế đăng nhập, phân công cán bộ, hay dữ liệu sẵn có khi chỉ mở/lọc/xuất danh sách.
- Gói giữ nguyên bản giáo viên tự cấp mật khẩu đã sửa ở lượt trước; có hướng dẫn riêng `CAP_NHAT_MAT_KHAU_GIAO_VIEN.md`.
- Cộng/trừ điểm giữ nguyên quy tắc sàn 0; lịch sử của thao tác mới ghi mức thay đổi thực tế. Chỉ báo thành công sau khi hàm lưu xác nhận. Lỗi lưu hoàn tác phần cập nhật tạm thời của học sinh, không ghi đè bản Cloud mới hơn.
- Các bài kiểm thử tự động dùng dữ liệu giả, kiểm tra toàn bộ script ứng dụng, sự kiện bấm, bộ lọc, đồng bộ, điểm danh/ledger, quyền, lỗi lưu, đầu vào xuất/in, HTML/CSS responsive, cú pháp và build.
- Chưa kiểm thử pixel trên trình duyệt thật hay Firebase/Netlify thực tế: trình duyệt kiểm thử không cho mở tệp cục bộ. Cần thực hiện danh sách thử sau triển khai ở trên. Không đưa fixture kiểm thử hoặc dữ liệu mẫu vào gói xuất bản.
