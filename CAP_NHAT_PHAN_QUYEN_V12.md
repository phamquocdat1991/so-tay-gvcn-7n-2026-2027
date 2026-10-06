# Bản v12 — Gỡ huy hiệu lỗi và chuẩn hóa quyền Ban cán sự

## Thay đổi
- Gỡ hàm đồng bộ huy hiệu, API chuyên biệt, state loading, badge Tổ phó và các toast liên quan. Không còn gọi mạng để vẽ huy hiệu. Huy hiệu các chức vụ khác được giữ.
- Trường hiển thị cũ deputyRole/deputyBadgeVersion bị loại khỏi state khi GVCN tải lớp, không được sử dụng để phân quyền. Bản cũ trong Cloud được loại khi lưu state thông thường; không chạy thêm một tiến trình migration mạng.
- Tất cả Ban cán sự đăng nhập tại mục Ban cán sự chung. Màn hình thao tác nhận dữ liệu từ API theo phân công đang có trong dữ liệu lớp.
- Firestore Rules chặn Ban cán sự đọc/ghi trực tiếp toàn bộ document state của lớp. API kiểm tra tài khoản, phiên, lớp, học sinh, tổ, chức vụ đang bật, quyền xem/thêm, tab và chuyên mục.

## Phạm vi thực thi
| Chức vụ | Dữ liệu | Thao tác |
|---|---|---|
| Lớp trưởng/Lớp phó có scope all | Toàn lớp, không trả mật khẩu/số điện thoại | Cộng trừ theo chuyên mục đã cấp; điểm danh khi có tab Điểm danh và quyền Chuyên cần; trực nhật khi có tab Trực nhật |
| Tổ trưởng | Chỉ tổ được phân công, phải trùng tổ hiện tại của học sinh | Đề xuất điểm chờ GVCN duyệt; trực nhật/điểm danh khi GVCN đã cấp tab tương ứng |
| Tổ phó | Chỉ tổ của tài khoản được GVCN cấp | Chấm trực nhật, sửa lý do, đề xuất điểm, xem lịch sử trong tổ |
| GVCN | Toàn lớp | Quản lý phân công và duyệt/từ chối đề xuất |

Các tài khoản hiện hữu không được tự nâng quyền. Nếu chưa thấy Trực nhật/Điểm danh, GVCN mở nút cấu hình của chức vụ và cấp tab/chuyên mục tương ứng. Cấu hình khuyến nghị mới cho Tổ trưởng có tab Trực nhật. Việc khóa vai trò hoặc đổi tổ có hiệu lực khi API được gọi lại. Không cung cấp quyền xóa lịch sử/chốt tuần cho cán bộ qua API này.

Màn hình Ban cán sự trong bản này tập trung vào thi đua, lịch sử, trực nhật, điểm danh; không tải toàn bộ giao diện và dữ liệu quản trị lớp. Dữ liệu điểm và lịch sử được ghi theo transaction, cập nhật studentViews và scoreRevision. Điểm danh dùng mức phạt trong cấu hình, ledger hoàn điểm, không trừ lặp khi gửi lại cùng trạng thái.

## Triển khai bắt buộc
1. Sao lưu dự án và dữ liệu lớp hiện tại.
2. Cập nhật toàn bộ mã nguồn v12 vào dự án đang triển khai, giữ các biến môi trường Firebase và bí mật máy chủ hiện hữu.
3. Triển khai website cùng Netlify Functions. Không chỉ thay index.html hoặc kéo riêng thư mục dist lên nơi không triển khai Functions.
4. Cập nhật nội dung firestore.rules trong bản này lên Firebase (hoặc dùng quy trình Firebase CLI của dự án). Cần áp dụng cả Rules để đóng đường truy cập trực tiếp cũ. Phối hợp triển khai và yêu cầu Ban cán sự đăng xuất/đăng nhập lại để tránh dùng frontend cũ.
5. Kiểm tra bằng tài khoản GVCN, Lớp trưởng, Lớp phó, Tổ trưởng và Tổ phó trước khi dùng chính thức.

## Điểm cần kiểm chứng trước khi sử dụng
- Lớp trưởng có thể thao tác học sinh ở các tổ theo tab/chuyên mục được giao.
- Tổ trưởng/Tổ phó không nhận danh sách tổ khác; gửi mã học sinh tổ khác vào API phải bị từ chối.
- Khóa chức vụ/quyền thêm hoặc đổi tổ rồi thử lại: yêu cầu phải bị chặn đúng lý do.
- Đi muộn rồi sửa Có mặt: điểm được hoàn đúng; gửi lặp không trừ hai lần.
- Mạng ngắt không làm treo vĩnh viễn; tải lại dữ liệu khi kết nối ổn định. Thao tác lưu bị timeout có thể đã được máy chủ xử lý, nên kiểm tra kết quả trước khi nhập giao dịch mới.

## Kiểm thử đã thực hiện
65 kiểm thử API, quyền, điểm danh, cấp tài khoản, giao diện phân công, đồng bộ điểm; 4 kiểm thử đăng nhập/khởi động Ban cán sự; build và kiểm tra cú pháp đều đạt. Đây là kiểm thử cục bộ với dữ liệu giả lập. Chưa chạy Firebase Rules Emulator, chưa kiểm chứng trực quan trên trình duyệt và chưa triển khai lên website thực tế. Không khẳng định mọi lỗi kết nối trên máy chủ hiện tại đã được giải quyết: cần kiểm tra cấu hình và nhật ký Functions nếu vẫn lỗi.
