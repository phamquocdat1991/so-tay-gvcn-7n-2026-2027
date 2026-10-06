# Cập nhật 1.1.4: đăng nhập một ô và danh sách học sinh

## Bản này sửa gì?

| Mục | Sau cập nhật |
| --- | --- |
| Ban cán sự | Chọn Ban cán sự, chỉ nhập mật khẩu riêng GVCN đặt; không nhập email, không chọn tên |
| HS / PH | Chọn HS / PH, chỉ nhập mã học sinh 5 số; giữ được số 0 ở đầu |
| GVCN, GVBM, BGH | Giữ nguyên email và mật khẩu Firebase |
| Tổng số học sinh | Bấm để mở danh sách; tìm theo tên/mã, lọc theo tổ, bấm tên để mở hồ sơ |

GVCN vẫn tự đặt mật khẩu trong **Cài đặt → Quản lý Mật khẩu → Quản lý quyền
đăng nhập → Cấp mật khẩu / Đặt lại mật khẩu**. Giữ quy định 6–128 ký tự và
mật khẩu riêng cho từng cán bộ từ bản 1.1.3. Xem TU_DAT_MAT_KHAU.md.

## Cập nhật website hiện có

1. Sao lưu dữ liệu lớp bằng chức năng hiện có. Giữ bản mã nguồn trước khi
   cập nhật. Nếu đã tự sửa mã nguồn ngoài gói 1.1.3, cần đối chiếu trước khi
   chép đè để không mất những sửa đổi riêng.
2. Giải nén gói mới. Cập nhật các file/thư mục bên trong vào đúng repository
   GitHub đang nối với website Netlify, giữ nguyên cấu trúc thư mục. Không
   tải nguyên file ZIP lên repository; không chỉ kéo thư mục dist vào Netlify.
3. Trong Netlify của website đó, mở **Environment variables**. Sửa biến
   **SIMPLE_LOGIN_ENABLED**:
   - Giá trị ở ô **Production**: `true` (viết thường, không thêm dấu nháy).
   - Phạm vi có **Builds** và **Functions**; nếu dùng **All scopes** thì đã
     bao gồm hai phạm vi này.
   - Nếu đang chọn **Different value for each deploy context**, đó là tùy
     chọn chứ không phải nội dung cần nhập. Chỉ điền `true` vào Production
     cho website chính; không cần bật ở Preview để dùng website chính.
4. Lưu và tạo một lần build/deploy mới sau khi cập nhật cả mã nguồn lẫn biến.
   Chờ **Published**, mở website rồi nhấn **Ctrl + Shift + R** để tải lại.

Biến dùng cho build cần phạm vi Builds; biến dùng tại máy chủ cần Functions.
Giá trị mới chỉ có hiệu lực sau build/deploy mới. Tham khảo
[Build environment variables](https://docs.netlify.com/build/configure-builds/environment-variables/)
và [Functions environment variables](https://docs.netlify.com/build/functions/environment-variables/).

Không xóa file cũ hàng loạt. Không cần tạo lại tài khoản Firebase, Service
Account, SIMPLE_AUTH_SECRET hoặc đổi Rules chỉ vì bản vá 1.1.4 này. Gói này
không đổi Rules và máy chủ so với 1.1.3. Không đưa file khóa quản trị hay
mật khẩu thật lên GitHub hoặc gửi trong ảnh chụp.

Nếu chưa từng triển khai phần đăng nhập đơn giản ở bản 1.1, hãy làm đủ
DANG_NHAP_DON_GIAN.md (Rules, Functions, cấu hình và cấp quyền) trước khi bật.
Nếu mã đã được đồng bộ và mật khẩu đã được cấp thì không cần cấp lại chỉ
để cập nhật 1.1.4. Bản vá không tự đồng bộ/đổi mã hay mật khẩu nào.

## Kiểm tra sau khi Published

1. GVCN đăng nhập như cũ. Bấm thẻ **Tổng số học sinh**: danh sách phải mở,
   số lượng lấy từ dữ liệu hiện có, không cố định 51 hoặc 54. Thử tìm tên,
   lọc theo tổ, bấm tên xem hồ sơ rồi đóng danh sách.
2. Mở cửa sổ riêng tư. Chọn **Ban cán sự**, nhập mật khẩu đã cấp: phải vào
   đúng người, đúng quyền. Không cần nhập email hoặc chọn học sinh.
3. Đăng xuất, chọn **HS / PH**, nhập mã 5 số đã cấp: chỉ xem hồ sơ được cấp
   quyền, không mở danh sách riêng tư của cả lớp.
4. Kiểm tra một mật khẩu/mã sai bị từ chối. Đăng nhập lại GVCN và kiểm tra
   dữ liệu, phân công, mã học sinh vẫn như trước khi cập nhật.

Nếu còn thông báo “chưa được bật”, kiểm tra đúng website, Production,
giá trị `true`, cả hai phạm vi và lần Published phải sau thời điểm lưu biến.
Không thay bằng mật khẩu Firebase cho BCS/HS. Nếu máy chủ báo lỗi, gửi ảnh
dòng lỗi không chứa thông tin đăng nhập; không dán mã vào Console.

Danh sách chi tiết tuân theo quyền mục Học sinh. BCS được quyền xem theo
tổ chỉ thấy tổ đó. Vai trò không được cấp quyền mục Học sinh sẽ nhận thông
báo từ chối; việc sửa nút không tự nâng quyền.

## Phạm vi kiểm thử và giới hạn

Bản vá đã được kiểm thử cục bộ, không tự triển khai hoặc dùng tài khoản
thật để đăng nhập website. Xem KIEM_THU.md. Cần thực hiện kiểm tra sau
Published trước khi gửi link cho lớp.

Mã 5 số và mật khẩu ngắn dễ bị đoán hoặc chia sẻ. Giới hạn số lần thử ở
máy chủ được giữ nguyên nhưng không loại bỏ rủi ro; giữ kín từng mã/mật
khẩu, ưu tiên mật khẩu riêng dài hơn và đổi khi bị lộ.
