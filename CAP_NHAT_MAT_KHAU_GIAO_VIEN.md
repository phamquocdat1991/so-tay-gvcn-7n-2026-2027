# Giáo viên tự cấp mật khẩu cán bộ lớp — bản 02.09.2026

## Sau khi cập nhật

1. Đăng nhập GVCN → Quản lý Mật khẩu → Quản lý quyền đăng nhập.
2. Ở đúng học sinh được phân công cán bộ, chọn **Cấp mật khẩu riêng** hoặc **Đổi mật khẩu riêng**.
3. Giáo viên tự nhập mật khẩu mới và nhập lại để xác nhận → **Lưu mật khẩu cho cán bộ**.
4. Xác nhận tên học sinh trước khi lưu. Gửi mật khẩu riêng cho đúng em.
5. Ban cán sự vẫn chọn vai trò **Ban cán sự** và chỉ nhập mật khẩu được cấp, không cần email.

Cho phép 6–128 ký tự, phân biệt hoa/thường; không chấp nhận khoảng trắng đầu/cuối hay ký tự điều khiển. Nên chọn cụm từ dễ nhớ nhưng khó đoán, tránh ngày sinh và dãy số đơn giản. Mỗi cán bộ cần mật khẩu khác nhau để xác định đúng tài khoản khi đăng nhập chỉ bằng mật khẩu. Hệ thống kiểm tra trùng trên máy chủ.

Mở form hoặc bấm Hủy không đổi mật khẩu. Lưu thành công bật quyền cán bộ và tăng phiên bản truy cập: mật khẩu cũ không đăng nhập được nữa, phiên cũ bị từ chối khi Rules kiểm tra phiên bản. Mật khẩu mới không lưu vào danh sách học sinh, không ghi rõ vào nhật ký và không hiển thị lại sau khi lưu. Mã HS/PH, điểm số, phân công và banner không thay đổi.

**Mật khẩu đã xuất hiện trong ảnh chụp cần được thay mới.** Không chia sẻ ảnh chứa mật khẩu hay mã HS/PH.

## Vì sao phải cập nhật cả gói

Tệp HTML cô gửi tải `/access-manager.js` riêng. Chức năng xác minh và lưu mật khẩu nằm ở Netlify Functions. Chỉ thay `index.html` không cập nhật được hai phần này.

Bản mới có dòng **Bản tự đặt mật khẩu 02.09.2026** trong cửa sổ quản lý. Khi bấm cấp/đổi, phải mở hai ô nhập, không tự sinh chuỗi ngẫu nhiên.

## Cập nhật dự án Netlify hiện có

Không tạo lại website hay Firebase. Trước khi cập nhật, giữ bản sao mã nguồn đang dùng và sao lưu dữ liệu lớp bằng chức năng hiện có.

1. Giải nén gói ZIP. Các tệp ở ngay gốc gói, không lồng thêm một thư mục dự án.
2. Cập nhật đầy đủ các tệp trong gói vào repository GitHub đang kết nối với Netlify. Giữ nguyên các tệp khác của dự án, không xóa thư mục repository.
3. Gói gồm `index.html` lấy từ chính tệp mới cô gửi, `access-manager.js`, `firebase-secure.js`, `server/`, hai tệp `netlify/functions/`, `scripts/`, `package.json`, `package-lock.json`, `metadata.json`, `netlify.toml` và hướng dẫn này. Không tải riêng HTML, không kéo-thả riêng thư mục `dist`.
4. Giữ các biến môi trường Firebase và SIMPLE_AUTH_SECRET hiện có. Không tạo lại khóa, không gửi khóa lên GitHub/chat, không đưa khóa quản trị vào HTML. Giữ trạng thái SIMPLE_LOGIN_ENABLED hiện có; bản sửa giao diện không tự bật/tắt công tắc này.
5. Netlify sử dụng lệnh build `npm run build`, thư mục xuất bản `dist`, Functions ở `netlify/functions` như cấu hình kèm theo. Chờ bản mới có trạng thái **Published**; kiểm tra có cả `access-admin` và `simple-login`.
6. Tải lại trang (Ctrl+Shift+R trên Windows). Kiểm tra dòng phiên bản và hai nút cấp/đổi mới. Nếu vẫn tự sinh mật khẩu ngay khi bấm, giao diện cũ vẫn đang chạy.
7. Thử trên một cán bộ được phân công: đặt mật khẩu riêng, đăng nhập bằng mật khẩu đó trong cửa sổ riêng, kiểm tra đúng học sinh/quyền hạn; đăng nhập lại bằng mật khẩu cũ phải thất bại. Kiểm tra mã HS/PH và dữ liệu lớp vẫn như trước.

Nếu hiện “Máy chủ chưa hỗ trợ bản tự đặt mật khẩu này”, cần cập nhật đồng bộ `access-manager.js`, `server/`, `netlify/functions/` và triển khai lại. Bản mới dùng thao tác máy chủ riêng `set-officer-password`; máy chủ cũ sẽ từ chối, không được âm thầm thay bằng mật khẩu ngẫu nhiên. Không sửa Firestore Rules thành công khai và không nới quyền để bỏ qua lỗi.

## Thay đổi kỹ thuật và phạm vi

- HTML chỉ đổi URL phiên bản của access-manager.js để tránh tải bản giao diện cũ; không chỉnh khung banner hay chức năng danh sách học sinh.
- Hai ô mật khẩu có nút hiện/ẩn, kiểm tra khớp, kích thước thao tác phù hợp điện thoại; form có xác nhận đúng tên học sinh.
- Máy chủ quảng bá `teacherPasswordAction: set-officer-password` và bắt buộc mật khẩu hợp lệ cho thao tác này. Tương thích thao tác cũ được giữ cho các trình duyệt cũ, nhưng giao diện mới không gọi cơ chế sinh ngẫu nhiên.
- Chỉ tài khoản GVCN đang hoạt động được quản lý quyền. Học sinh chưa được phân công cán bộ không thể được cấp mật khẩu cán bộ.
- Giữ cách lưu HMAC hiện có, giới hạn thử đăng nhập, kiểm tra trùng mật khẩu bằng transaction và cơ chế phiên bản truy cập. Không thay Rules trong gói này; bảo vệ phiên cũ vẫn cần Rules accessVersion đúng như dự án đã cấu hình.
- Đã kiểm tra bằng các bài kiểm thử tự động với dữ liệu giả, không gọi Firebase thật và chưa triển khai lên website của cô. Cần hoàn tất bước kiểm thử thực tế sau khi Published.
