# Bật đăng nhập bằng mã học sinh / mật khẩu cán bộ

**Bản 1.1.4:** BCS/HS/PH luôn hiển thị một ô nhập theo vai trò. Nếu công tắc
đang tắt, giao diện báo chưa bật (không chuyển sang email). Cần bật
`SIMPLE_LOGIN_ENABLED=true` cho Builds và Functions rồi triển khai lại để
đăng nhập được. Nút tổng số học sinh cũng đã được sửa; xem
[CAP_NHAT_1_1_4.md](CAP_NHAT_1_1_4.md).

**Bản 1.1.3:** GVCN có thể tự đặt mật khẩu riêng cho cán bộ, không bắt buộc
dùng chuỗi ngẫu nhiên dài. Xem [TU_DAT_MAT_KHAU.md](TU_DAT_MAT_KHAU.md).

**Đang nâng cấp từ bản 1.1 bị lỗi `ERR_REQUIRE_ESM`?** Đọc
[CAP_NHAT_LOI_ESM.md](CAP_NHAT_LOI_ESM.md) trước. Không cần tạo lại khóa,
thay Rules hay cấu hình đăng nhập từ đầu. Bản 1.1.1 không cần bật tùy chọn
thử nghiệm `--experimental-require-module`.

## Kết quả sau khi cấu hình

| Nhóm | Thao tác đăng nhập |
| --- | --- |
| GVCN | Chọn GVCN, nhập email và mật khẩu như trước |
| Ban cán sự | Chọn Ban cán sự, nhập mật khẩu riêng được GVCN cấp |
| HS / PH | Chọn HS / PH, nhập mã học sinh 5 số hiện có |
| GVBM, BGH | Giữ email và mật khẩu như trước |

Không yêu cầu học sinh/phụ huynh tạo email hoặc đăng ký. Máy chủ xác minh mã/mật khẩu rồi cấp phiên Firebase cho đúng danh tính. Firebase vẫn có UID nội bộ để áp dụng quyền; đây không phải chế độ truy cập cơ sở dữ liệu công khai. HS và PH dùng cùng một mã sẽ có cùng quyền xem hồ sơ đó.

**Lưu ý:** mã 5 số không chứng minh người nhập là đúng học sinh/phụ huynh. Ai biết hoặc đoán được mã có thể xem hồ sơ tương ứng. Giới hạn số lần thử chỉ giảm rủi ro, không loại bỏ được rủi ro này. Không công khai danh sách mã; đổi mã khi bị lộ. Cân nhắc dữ liệu được đưa vào hồ sơ trước khi mở truy cập.

## 1. Chuẩn bị, chưa thay đổi website đang chạy

1. Giữ nguyên dự án Firebase `so-tay-gvcn-7n`, cơ sở dữ liệu `(default)`, tài khoản và document quyền GVCN đang hoạt động. Không tạo lại dự án hay API key.
2. Sao lưu dữ liệu lớp bằng chức năng sao lưu hiện có. Lưu một bản Rules hiện tại và giữ phiên bản mã nguồn cũ để có thể quay lại.
3. Giải nén bản mã nguồn này. Nếu repository có các thay đổi mới hơn bản nguồn đã cung cấp, đối chiếu trước khi chép đè.
4. Khi sẵn sàng, cập nhật toàn bộ mã nguồn vào repository GitHub đang kết nối Netlify, bao gồm `server/`, `netlify/functions/`, `access-manager.js`, `firebase-secure.js`, `index.html`, `package.json`, `package-lock.json`, `scripts/build.mjs`, `netlify.toml`, `firestore.rules`.

Không tải `node_modules`, file Service Account hay `.env` thật lên GitHub. Không dùng Netlify Drop để chỉ tải `dist`: tính năng này cần cả mã máy chủ.

## 2. Cập nhật Rules trước khi bật tính năng

1. Mở đúng dự án Firebase → **Firestore Database → Rules / Quy tắc**.
2. Mở file `firestore.rules` trong gói này, sao chép toàn bộ nội dung thay cho bản cũ.
3. Nhấn **Publish / Xuất bản**.

Rules mới giữ quyền GVCN hiện có, chặn trình duyệt đọc kho mã/mật khẩu riêng, giới hạn HS/PH theo `studentId`, và từ chối phiên cũ sau khi đổi/khóa quyền. Không thay bằng `allow read, write: if true`.

## 3. Thêm cấu hình máy chủ ở Netlify

Mở đúng website Netlify → phần cấu hình dự án → **Environment variables**. Tên mục có thể khác theo giao diện. Giữ nguyên `FIREBASE_CONFIG_JSON` đang dùng.

| Biến | Giá trị | Phạm vi cần dùng |
| --- | --- | --- |
| `FIREBASE_CONFIG_JSON` | Cấu hình Web Firebase hiện có, không phải khóa quản trị | Builds và Functions |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | JSON khóa tài khoản dịch vụ của đúng dự án | Functions; đánh dấu bí mật nếu có |
| `SIMPLE_AUTH_SECRET` | Chuỗi ngẫu nhiên riêng ít nhất 32 ký tự | Functions; đánh dấu bí mật nếu có |
| `SIMPLE_LOGIN_ENABLED` | Ban đầu đặt `false` | Builds và Functions |
| `GVCN_APP_ID` | `so-tay-gvcn-7n` | Builds và Functions |
| `GVCN_CLASS_ID` | `7n` | Builds và Functions |

Nếu gói Netlify không cho chọn từng phạm vi, có thể dùng phạm vi chung; quy trình build trong gói này không chép hai biến bí mật vào `dist`. Dù vậy, không tự thêm chúng vào HTML hoặc cấu hình công khai.

### Lấy Service Account JSON

Trong Firebase → biểu tượng bánh răng → **Project settings / Cài đặt dự án → Service accounts / Tài khoản dịch vụ**, kiểm tra đúng dự án rồi dùng **Generate new private key / Tạo khóa riêng mới**. Đây là khóa quản trị nhạy cảm: chủ dự án tự thực hiện bước này, không gửi file vào chat, không commit GitHub và không đưa vào `FIREBASE_CONFIG_JSON`.

Mở file vừa tải trên máy, sao chép toàn bộ JSON vào giá trị của `FIREBASE_SERVICE_ACCOUNT_JSON` trong Netlify. Giữ nguyên ký tự xuống dòng được mã hóa `\n` bên trong `private_key`. Lưu bản khóa ở nơi riêng tư. Nếu tổ chức chặn việc tạo khóa, dừng lại và nhờ quản trị viên cấu hình danh tính máy chủ được phép, không tìm cách bỏ hạn chế. Khi có người quản trị kỹ thuật, ưu tiên tài khoản dịch vụ riêng với quyền tối thiểu phù hợp thay vì dùng khóa quản trị chung.

### Tạo SIMPLE_AUTH_SECRET

Trên máy đã có Node.js, mở Terminal/PowerShell và chạy:

```bash
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Sao chép kết quả vào biến `SIMPLE_AUTH_SECRET`. Không dùng lại ví dụ hoặc một câu dễ đoán. Không gửi kết quả vào chat. Giữ ổn định giá trị này giữa các lần triển khai; nếu đổi secret, phải đồng bộ lại mã HS/PH và cấp lại mật khẩu BCS.

## 4. Triển khai và cấp quyền ban đầu

1. Để `SIMPLE_LOGIN_ENABLED=false` trong lần triển khai đầu. Netlify cần Node.js 22, lệnh build `npm run build`, thư mục xuất bản `dist`; file `netlify.toml` đã khai báo các giá trị này.
2. Triển khai qua repository. Trong trang Functions của lần triển khai, kiểm tra có `simple-login` và `access-admin`.
3. Mở website, tải lại trang, đăng nhập GVCN bằng email/mật khẩu cũ. Xác nhận dữ liệu lớp và danh sách học sinh đã tải đầy đủ từ Firebase.
4. Trong **Cài đặt → Mật khẩu**, bấm **Quản lý quyền đăng nhập**.
5. Bấm **Đồng bộ / bật mã học sinh**. Thao tác này giữ nguyên mã 5 số của từng em, tạo quyền còn thiếu và hồ sơ đọc riêng; những quyền đã bị khóa vẫn bị khóa. Khi công tắc `SIMPLE_LOGIN_ENABLED` đang tắt, các mã chưa dùng được để đăng nhập.
6. Ở mục **Phân quyền**, phân công học sinh vào nhiệm vụ cán bộ lớp và đặt hoạt động. Quay lại bảng quản lý đăng nhập, tải lại danh sách, bấm **Cấp mật khẩu** ở từng cán bộ.
7. Nhập **Mật khẩu mới** và **Nhập lại mật khẩu**, bấm **Lưu mật khẩu** rồi xác nhận đúng học sinh. Có thể bấm **Hiện mật khẩu** để kiểm tra trước khi lưu. Mật khẩu từ 6–128 ký tự, không trùng với cán bộ khác; không có khoảng trắng đầu/cuối. Gửi riêng cho đúng người. Hệ thống không hiển thị lại mật khẩu đã lưu; nếu quên, đặt lại. Một học sinh có nhiều nhiệm vụ vẫn dùng một mật khẩu cán bộ; quyền nghiệp vụ theo phân công đang có của ứng dụng.
8. Chuyển `SIMPLE_LOGIN_ENABLED=true` ở **cả Builds và Functions**, lưu và triển khai lại. Tải lại website để nhận cấu hình mới.

Nếu bảng báo mã thiếu/trùng/không đủ 5 số, sửa danh sách trước rồi đồng bộ lại. Không tự đổi mã hàng loạt. Bản này giới hạn một đợt đồng bộ ở 80 học sinh và từ chối đợt quá lớn thay vì ghi dở dang.

## 5. Kiểm tra trước khi gửi link cho lớp

Dùng cửa sổ riêng tư hoặc một trình duyệt khác, không dùng cùng phiên GVCN:

1. Chọn **HS / PH**: phải chỉ có một ô mã. Nhập một mã đã cấp; kiểm tra đúng hồ sơ học sinh, không phải danh sách riêng của cả lớp.
2. Đăng xuất. Nhập một mã chưa cấp hoặc sai định dạng; phải bị từ chối.
3. Chọn **Ban cán sự**: phải chỉ có một ô mật khẩu. Nhập mật khẩu đã cấp; kiểm tra tên và nhiệm vụ đúng người.
4. GVCN khóa quyền của một tài khoản thử; tài khoản đó không được đọc tiếp dữ liệu mới. Mở lại và đăng nhập lại để kiểm tra.
5. Đổi một mật khẩu cán bộ thử; mật khẩu cũ phải hết hiệu lực. Với mã học sinh, chỉ bấm đổi khi thực sự muốn cấp mã mới cho em đó.
6. Kiểm tra GVCN vẫn đăng nhập, lưu dữ liệu và sao lưu được.

Rules chặn các lần đọc/ghi máy chủ bằng phiên cũ; dữ liệu đã hiển thị hoặc đã được người dùng sao chép không thể thu hồi. Với máy dùng chung, luôn đăng xuất khi dùng xong.

Nếu Netlify đang có **Team Protection / bảo vệ truy cập website**, người ngoài vẫn không vào được trang dù mã học sinh đúng. Đây là cổng bảo vệ riêng của Netlify. Chủ website cần tự quyết định cấu hình truy cập sau khi kiểm thử; bản mã này không tắt bảo vệ đó.

## 6. Dùng hằng ngày

- **Thêm/xóa học sinh, đổi phân công cán bộ:** lưu dữ liệu lớp, chờ đồng bộ Firebase, rồi vào bảng quản lý đăng nhập bấm **Đồng bộ**. Đặc biệt cần bước này để thu hồi các phiên cũ của học sinh/cán bộ đã bị loại khỏi danh sách.
- **Quên mật khẩu BCS:** đặt lại, gửi mật khẩu mới riêng. Không có chức năng xem lại mật khẩu cũ.
- **Lộ mã HS/PH:** bấm **Đổi mã 5 số** ở đúng học sinh; gửi mã mới riêng. Thao tác đổi mã được ghi vào danh sách lớp.
- **Tạm ngưng:** dùng **Khóa HS/PH** hoặc **Khóa cán bộ**. Hai quyền độc lập: khóa cán bộ không tự khóa quyền xem hồ sơ HS/PH của em đó.
- **Ngừng đăng nhập đơn giản:** đặt công tắc `false` và triển khai lại. Công tắc chỉ dừng đăng nhập mới; nếu cần chặn cả phiên đã cấp, khóa các quyền liên quan trong bảng quản lý. Không xóa Rules bảo vệ các kho riêng.

## 7. Các lỗi thường gặp

| Hiện tượng | Kiểm tra |
| --- | --- |
| HS/PH vẫn hiện ô email | Công tắc ở Builds có là `true` không? Đã triển khai lại và tải lại trang chưa? |
| Máy chủ đăng nhập chưa được triển khai | Có hai Functions mới chưa? Có phải chỉ tải riêng `dist` không? |
| Function log báo `ERR_REQUIRE_ESM` | Dùng bản 1.1.1, tải đủ `scripts/` và hai file package, kiểm tra build có dòng `Firebase runtime smoke test: passed without require(ESM).` Xem `CAP_NHAT_LOI_ESM.md`; không đổi khóa hay mở Rules. |
| Đăng nhập đơn giản chưa được cấu hình | Hai biến bí mật đã lưu ở Functions chưa? Secret đủ dài và JSON hợp lệ chưa? |
| Mã đúng nhưng bị từ chối | Mã đã được đồng bộ chưa? Có bị khóa không? Dữ liệu lớp/mã hiện tại có khớp không? |
| Không thể đọc hồ sơ / permission-denied | Đã xuất bản đúng Rules cho đúng dự án chưa? Thử đăng xuất rồi đăng nhập lại. Không mở rộng Rules công khai. |
| Đã thử đăng nhập nhiều lần | Chờ theo thông báo, không bấm liên tục. Giới hạn dùng chung cho người cùng mạng. |
| Bảng quản lý không thấy học sinh | Kiểm tra lớp đã lưu trên Firebase ở `artifacts/so-tay-gvcn-7n/classes/7n/state/main`. Không tạo đè document rỗng. |

Mỗi địa chỉ IP (IPv6 gộp /64) có tối đa 30 lần thử trong 5 phút; tổng lớp tối đa 120 lần trong 5 phút. Bao gồm lần thành công và lần nhập sai. Nhiều em cùng Wi-Fi có thể gặp giới hạn; đây cũng không phải cơ chế chống tấn công gây nghẽn hoàn chỉnh. Yêu cầu đăng nhập có sử dụng Functions và đọc/ghi Firestore; theo dõi hạn mức của dự án. Có thể cấu hình TTL cho trường `expiresAt` trong collection group `_accessLimits` để dọn bộ đếm cũ; không bật TTL cho dữ liệu lớp.

## Ghi chú kỹ thuật và phạm vi

- Mật khẩu cán bộ do GVCN tự đặt từ bản 1.1.3; chỉ lưu HMAC, không lưu mật khẩu rõ hoặc gửi lại mật khẩu tự đặt trong phản hồi API. Secret chỉ nằm phía máy chủ. Máy chủ vẫn hỗ trợ sinh ngẫu nhiên cho trình duyệt phiên bản cũ; giao diện mới kiểm tra khả năng của máy chủ trước khi cho tự đặt. Mã 5 số vẫn là một trường trong danh sách lớp dành cho giáo viên/người có quyền lớp, không phải thông tin đã bị xóa khỏi mọi dữ liệu.
- `accessVersion` gắn vào phiên và membership để Rules từ chối phiên cũ sau đổi/khóa quyền. Không sửa trực tiếp các kho `_access*` bằng trình duyệt.
- Danh tính Firebase nội bộ được tạo khi đăng nhập custom token lần đầu. Không cần bật Anonymous Authentication.
- Thay đổi này bổ sung cách đăng nhập và quản lý thông tin truy cập; giữ mô hình quyền nghiệp vụ hiện có. BCS vẫn đọc dữ liệu lớp và được cập nhật các nhóm trường mà Rules cũ đã cho phép. Giới hạn chi tiết theo từng nhiệm vụ/tổ ở giao diện không tương đương với một cuộc kiểm toán phân quyền máy chủ đầy đủ.
- Các giá trị `GVCN_APP_ID`, `GVCN_CLASS_ID` phải giống nhau ở Build và Functions. Nếu để mặc định, lần lượt là `so-tay-gvcn-7n`, `7n`.
- Không có khóa bí mật thật trong gói mã nguồn. Chưa triển khai hoặc thử đăng nhập trên dự án Firebase thật từ bản này; chủ dự án cần hoàn tất các bước cấu hình và kiểm thử ở trên.

Tham khảo chính thức: [Firebase custom tokens](https://firebase.google.com/docs/auth/admin/create-custom-tokens), [đăng nhập custom token trên web](https://firebase.google.com/docs/auth/web/custom-auth), [Firebase Admin setup](https://firebase.google.com/docs/admin/setup), [Netlify Functions API](https://docs.netlify.com/build/functions/api/), [biến môi trường Functions](https://docs.netlify.com/build/functions/environment-variables/).
