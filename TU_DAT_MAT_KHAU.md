# GVCN tự đặt mật khẩu ban cán sự — bản 1.1.3

## Cách sử dụng sau khi cập nhật

1. Đăng nhập GVCN → **Cài đặt → Quản lý Mật khẩu → Quản lý quyền đăng nhập**.
2. Tìm đúng học sinh đang được phân công cán bộ. Bảng hiển thị cả lớp,
   không chỉ cán bộ; học sinh chưa được phân công sẽ không có nút cấp.
3. Bấm **Cấp mật khẩu** hoặc **Đặt lại mật khẩu** trên đúng hàng.
4. Gõ **Mật khẩu mới** và **Nhập lại mật khẩu**. Bấm **Hiện mật khẩu** nếu
   cần kiểm tra hoặc sao chép trước khi lưu; nút **Hủy** không đổi mật khẩu.
5. Bấm **Lưu mật khẩu**, xác nhận tên học sinh. Chờ thông báo đã lưu rồi
   gửi mật khẩu riêng cho em đó. Hai ô nhập được xóa sau khi lưu thành công.
6. Học sinh chọn **Ban cán sự** trên màn hình đăng nhập và nhập mật khẩu cô
   vừa đặt. Không cần email. Công tắc đăng nhập đơn giản phải đã được bật
   theo `DANG_NHAP_DON_GIAN.md` trước khi thử đăng nhập.

## Quy tắc

- Từ 6 đến 128 ký tự, phân biệt hoa/thường; chấp nhận chữ, số, Unicode,
  dấu cách ở giữa và ký hiệu. Không có khoảng trắng đầu/cuối hoặc ký tự
  điều khiển như xuống dòng/tab. Không tự cắt hoặc đổi hoa/thường của mật khẩu.
- Hai lần nhập phải khớp. Máy chủ tự kiểm tra lại quy tắc độ dài/ký tự.
- Hai cán bộ không dùng chung mật khẩu trong cùng lớp vì không nhập tên tài
  khoản khi đăng nhập. Máy chủ kiểm tra trùng trong giao dịch; báo lỗi không
  tiết lộ tên người đang dùng mật khẩu đó. Không được đặt lại đúng mật khẩu
  hiện tại của cùng người.
- Mật khẩu đang dùng không thay đổi khi chỉ triển khai bản cập nhật. Cả mật
  khẩu ngẫu nhiên cũ và mật khẩu tự đặt mới đều được hỗ trợ.
- Khi lưu mật khẩu mới thành công, quyền cán bộ của em đó được bật và phiên
  cũ bị vô hiệu theo phiên bản quyền trong Rules hiện có. Mật khẩu cũ hết
  hiệu lực. Không đổi mã HS/PH 5 số hoặc tài khoản GVCN.
- Không có chức năng xem lại mật khẩu đã lưu. Quên mật khẩu thì đặt lại;
  không gửi mật khẩu hoặc khóa Firebase vào chat/GitHub.

### Lưu ý về mật khẩu ngắn

Ngưỡng 6 ký tự phục vụ nhu cầu nhập ngắn; **không có nghĩa mật khẩu ngắn là
xác thực mạnh**. Tránh tên, ngày sinh, số lặp, dãy số đơn giản hoặc dùng chung.
Nên chọn cụm từ dài, dễ nhớ. OWASP hiện coi mật khẩu dưới 15 ký tự là yếu
khi không có MFA. Giới hạn số lần thử hiện có chỉ giảm, không loại bỏ rủi ro
đoán mật khẩu. [Khuyến nghị OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

Mật khẩu không lưu dạng rõ. Bản này giữ cơ chế chỉ mục HMAC với secret máy
chủ và giới hạn thử có từ bản trước; không tuyên bố nâng cấp toàn bộ cơ chế
lưu mật khẩu hoặc đạt chuẩn NIST. Phải giữ kín secret và Service Account.

## Cập nhật website hiện có

1. Giải nén ZIP vào thư mục riêng. Sao lưu/đối chiếu nếu repository có chỉnh
   sửa riêng sau bản 1.1.2.
2. Trên GitHub chọn **Add file → Upload files**, tải nội dung bên trong thư
   mục lên thư mục gốc của repository đang liên kết Netlify. Không tải ZIP
   hoặc thư mục bọc ngoài; không xóa toàn bộ file cũ trước.
3. Commit lên nhánh triển khai hiện có, theo quy trình duyệt nếu có bảo vệ.
4. Trong Netlify đợi bản từ commit mới hiện **Published**, rồi mở website và
   nhấn **Ctrl + Shift + R**.
5. Thử đặt mật khẩu cho một cán bộ, sau đó dùng cửa sổ riêng tư đăng nhập
   đúng em đó. Kiểm tra mật khẩu cũ không dùng được và dữ liệu/quyền không đổi.

**Phải cập nhật cả giao diện và Functions**, không chỉ `index.html` hoặc
`access-manager.js`. Không cần đổi Rules, tạo khóa, thay secret hoặc đổi biến
môi trường để thêm chức năng này. Nếu công tắc đăng nhập đơn giản vẫn tắt,
GVCN vẫn đặt được mật khẩu nhưng học sinh chưa đăng nhập được.

Nếu báo “Máy chủ chưa hỗ trợ tự đặt mật khẩu”, kiểm tra Netlify đã triển khai
commit mới với đầy đủ thư mục `server/` và `netlify/`. Giao diện mới không gửi
yêu cầu đổi mật khẩu khi máy chủ báo chưa hỗ trợ. Nếu máy chủ bị đổi phiên
bản giữa lúc tải danh sách và lúc lưu, giao diện cảnh báo rõ và không nhận
nhầm mật khẩu ngẫu nhiên của máy chủ cũ là mật khẩu cô vừa nhập.

## Phạm vi mã nguồn

Thay đổi `access-manager.js`, `server/access-model.mjs`,
`server/access-service.mjs`, kiểm thử và tài liệu; tăng phiên bản package
lên 1.1.3. Giữ nguyên `index.html`, Firebase client, Rules, phụ thuộc và các
bản sửa khởi động/ESM trước đó. Không tự sửa dữ liệu hay cấp lại mật khẩu
trên Firebase khi triển khai.

Kiểm thử sử dụng dữ liệu giả, DOM/Firestore mô phỏng và máy chủ HTTP cục bộ;
cần kiểm tra lại trên website thật sau khi triển khai.
