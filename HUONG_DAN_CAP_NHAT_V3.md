# Cập nhật đầy đủ lớp 7N — bản v3 ngày 02/09/2026

## Gói này xử lý cả ba phần

1. **Tổng số học sinh:** giữ sự kiện bấm, tìm kiếm/lọc, thống kê, thao tác nhanh và xuất/in. Cửa sổ dùng hộp thoại nổi của trình duyệt (`dialog.showModal()`), có cách hiển thị dự phòng cho trình duyệt cũ. Mở lại sau khi danh sách được dựng lại hoặc đồng bộ. Khi đang lưu hoặc mở thất bại, thẻ hiện thông báo thay vì im lặng.
2. **Thẻ học sinh:** giữ lưới đã sửa, rộng tối đa 1.200px, tự xếp 1–3 cột theo vùng nội dung. Các nút − / điểm / + / Hồ sơ / ⋮ nằm gần tên; nút chính trên điện thoại tối thiểu 44px. Không thay khung banner.
3. **Mật khẩu cán bộ:** giáo viên bấm Cấp/Đổi mật khẩu riêng, nhập mật khẩu do mình chọn hai lần rồi xác nhận lưu. Mật khẩu từ 6 đến 128 ký tự, riêng cho từng cán bộ; nên dùng cụm từ dài dễ nhớ, tránh tên/ngày sinh/dãy số dễ đoán. Bản này cũng xử lý ID học sinh dạng số. Khi máy chủ chưa hỗ trợ, thông báo xuất hiện ngay lúc mở quản lý quyền đăng nhập.

## Quan trọng: không chỉ thay index.html

Ảnh bạn gửi cho thấy trình quản lý mật khẩu vẫn có nút “Đặt lại mật khẩu” sinh ngẫu nhiên và danh sách vẫn là thẻ rộng. Tệp HTML bạn gửi lại trùng bản mã đã sửa trước đó. Chưa đủ bằng chứng xác định trang thật đang tải tệp từ nhánh/bản triển khai nào; không thể kết luận chỉ do bộ nhớ đệm.

Phần mật khẩu nằm ở cả JavaScript và Functions máy chủ. **Lần này phải cập nhật toàn bộ các tệp trong ZIP**, không chỉ một tệp HTML. Không xóa các tệp khác của dự án.

## Cách cập nhật dự án GitHub đang kết nối Netlify

1. Sao lưu mã nguồn và dữ liệu lớp bằng chức năng hiện có. Giải nén `cap-nhat-day-du-7n-v3.zip` trên máy tính.
2. Trong repository đang kết nối với đúng website Netlify, sao chép các tệp đã giải nén vào **đúng thư mục dự án và nhánh đang xuất bản**, thay các tệp cùng tên. Trang chính phải tên **`index.html`**, không phải `index(3).html`. Không tải nguyên ZIP lên GitHub rồi để nguyên chưa giải nén; không tạo thêm một thư mục bọc ngoài dự án.
3. Các tệp/thư mục cần cập nhật cùng nhau có trong ZIP: `index.html`, `access-manager.js`, `firebase-secure.js`, `server/`, `netlify/functions/`, `scripts/`, `package.json`, `package-lock.json`, `metadata.json`, `netlify.toml`.
4. Giữ nguyên Firebase, dữ liệu, Firestore Rules và biến môi trường hiện có. Không đổi khóa `SIMPLE_AUTH_SECRET`, không đưa tài khoản quản trị vào mã HTML. Gói không chứa khóa quản trị hoặc dữ liệu kiểm thử.
5. Lưu thay đổi (commit) trên đúng nhánh. Chờ Netlify có bản triển khai **Published** ứng với commit vừa cập nhật. Cấu hình trong gói dùng `npm run build`, thư mục xuất bản `dist`, Functions ở `netlify/functions`. Nếu dự án có thư mục gốc cấu hình riêng, phải đặt tệp đúng thư mục đó.
6. Mở website Netlify trực tiếp và tải lại bằng Ctrl+Shift+R. Trên điện thoại, mở một tab riêng tư để đối chiếu. Bản xem trước trong công cụ khác không chứng minh Netlify đã xuất bản bản mới.

Không đăng riêng tệp HTML lên dịch vụ tĩnh để thay cho cả dự án: đăng nhập đơn giản và tự cấp mật khẩu vẫn cần các Functions máy chủ.

## Ba dấu hiệu nhận biết

| Khu vực | Bản đúng phải hiển thị |
| --- | --- |
| Thẻ Tổng số học sinh | **Bấm mở danh sách · v3** |
| Quản lí Học sinh | **Lưới gọn · 02.09.2026 v2** — đây là phiên bản riêng của phần lưới được giữ trong gói v3 |
| Quản lý quyền đăng nhập | **Bản tự đặt mật khẩu 02.09.2026 · v3**, nút **Cấp mật khẩu riêng** hoặc **Đổi mật khẩu riêng** |

Nếu đủ nhãn mới nhưng phần mật khẩu báo máy chủ chưa hỗ trợ, cần kiểm tra bản Functions đã triển khai, không tiếp tục bấm sinh mật khẩu bằng giao diện cũ.

## Kiểm tra sau khi Published

- Bấm chữ, số và biểu tượng trên thẻ Tổng số học sinh; danh sách phải mở. Thử tìm tên/mã, chọn một tổ, đóng/mở lại. Máy tính hiện bảng, điện thoại hiện thẻ.
- Nếu thẻ báo **SL-OPEN-03**, mở F12 → Console, bấm lại thẻ rồi gửi ảnh dòng lỗi đỏ. Không dán mã lạ vào Console; che mã học sinh, mật khẩu, token hoặc thông tin riêng trước khi gửi.
- Trong Quản lí Học sinh, thử bật/tắt thanh bên; danh sách tự đổi số cột theo chiều rộng còn lại. Mở Hồ sơ và menu ⋮. Không cần lưu điểm thật để thử bố cục.
- Trong Quản lý quyền đăng nhập, chọn đúng cán bộ đã phân công, nhập mật khẩu hai lần và lưu. Thao tác này thay mật khẩu và vô hiệu phiên cũ của cán bộ được chọn; chỉ thực hiện khi muốn thay thật. Bấm Hủy không đổi mật khẩu.
- Mật khẩu cán bộ đã xuất hiện trong ảnh chụp nên được thay bằng mật khẩu riêng mới và chỉ gửi cho đúng người.

## Đã kiểm tra và chưa kiểm tra

- Kiểm tra cấu trúc HTML, cú pháp JavaScript và 159 kiểm thử tự động: click, hộp thoại native/dự phòng, lỗi mở, trạng thái đang lưu, lọc, giữ danh sách qua lần dựng lại, quyền, mật khẩu tự nhập, máy chủ cũ, xuất/in, dữ liệu giả và build.
- Chưa tái hiện được lỗi trên website thật, chưa kiểm tra pixel trong trình duyệt thật và chưa triển khai vào tài khoản Netlify của bạn. Thay đổi lớp hiển thị là biện pháp củng cố, không phải khẳng định đã tìm thấy nguyên nhân duy nhất của ảnh lỗi.
- Không sao chép fixture, `node_modules`, hoặc bản `dist` sinh bởi kiểm thử vào gói triển khai.
