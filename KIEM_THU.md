# Kiểm thử thẻ học sinh thu gọn 1.1.5

## Kết quả bản 1.1.5 — 02/09/2026

- 9/9 ca mới đạt: quy tắc lưới 1/2/3 cột, giảm khoảng trắng, cho phép tên
  dài xuống dòng, cấu trúc cụm nút/điểm, giữ ID và handler, phân quyền,
  bộ lọc ban đầu, bộ lọc trực tiếp, menu và quy tắc vùng bấm/chồng lớp.
- Chạy các kiểm thử không cần kết nối mạng trên Node.js 24.19.0 bằng
  `node --test --test-skip-pattern='local server serves' tests/*.test.mjs`.
  Tổng 92 ca được chạy đều đạt (gồm 9 ca mới). Một ca khởi động máy chủ
  và gọi HTTP localhost chủ động không chạy do giới hạn môi trường.
- Kiểm tra cú pháp HTML/JavaScript và build đạt; kiểm tra bản vá runtime
  Firebase và build không chứa biến bí mật đạt với dữ liệu giả.
- Không đổi phụ thuộc ngoài số phiên bản dự án. Không đổi máy chủ,
  đăng nhập, Rules hoặc dữ liệu. Không chạy lại Firestore Emulator,
  Netlify bundler hay kiểm toán bảo mật phụ thuộc ở đợt này.

Giới hạn: kiểm thử UI thực thi hàm render/filter/menu thật trong Node VM
với DOM mô phỏng, kiểm tra cấu trúc thẻ và quy tắc CSS, không đo bố cục
pixel trong trình duyệt. Trình duyệt kiểm tra không mở được localhost
(ERR_BLOCKED_BY_CLIENT); không thử vượt giới hạn đó. Chưa kiểm tra trực
tiếp trên điện thoại hay đăng nhập website thật. Không có kết quả Node.js
22 được xác nhận lại cho bản 1.1.5. Cần kiểm tra sau Published theo
CAP_NHAT_GIAO_DIEN_1_1_5.md.

## Lịch sử bản 1.1.4

Ngày kiểm tra: 01/09/2026. Kiểm tra cục bộ, không sử dụng khóa quản trị thật và không thay đổi dữ liệu Firebase/Netlify đang chạy.

## Kết quả bản 1.1.4

| Nhóm | Kết quả |
| --- | --- |
| 64 ca cũ, cập nhật kỳ vọng giao diện HS/PH khi công tắc tắt | 64/64 đạt |
| 10 ca mới: BCS/HS một ô khi bật/tắt/chưa có Firebase, đúng API, không dùng email thay thế, giáo viên giữ cách cũ, mã số 0 đầu, kiểm tra membership, chống gửi lặp | 10/10 đạt |
| 10 ca mới: nút danh sách, số lượng thật, tìm tiếng Việt/mã, giữ con trỏ, lọc tổ, dữ liệu rỗng, mã hóa HTML, mở đúng hồ sơ, chặn người không có quyền và giới hạn tổ | 10/10 đạt |
| Toàn bộ trên Node.js 24.19.0 | 84/84 đạt |
| Toàn bộ trên Node.js 22.23.2 với `--no-experimental-require-module` | 84/84 đạt |
| Cài đặt offline, `npm run check`, `npm run build` và kiểm tra runtime Firebase | Đạt |

84 là số ca riêng biệt. Bộ 1.1.4 chạy hàm JavaScript thật trích từ index.html
trong Node VM, DOM mô phỏng được thay mới mỗi lần render để kiểm tra việc
giữ focus/con trỏ. Không phải thử giao diện trong trình duyệt thật hoặc
đăng nhập xuyên suốt Firebase/Netlify. Cần kiểm tra website sau Published
theo CAP_NHAT_1_1_4.md, gồm thao tác trên điện thoại và bàn phím tiếng Việt.

Không đổi phụ thuộc (ngoài số phiên bản dự án trong lockfile), Rules,
Firebase client hoặc Functions so với 1.1.3. Không thay dữ liệu, mật khẩu,
mã học sinh hay cấu hình website thật. Không chạy lại Firestore Emulator,
kiểm toán phụ thuộc hoặc bộ đóng gói Netlify riêng. Bản build cục bộ không
có cấu hình Firebase thật; không dùng thư mục dist cục bộ để triển khai.
Netlify phải build từ mã nguồn với cấu hình đã lưu của website.

## Kết quả bản 1.1.3

| Nhóm | Kết quả |
| --- | --- |
| 42 ca hồi quy từ 1.1.2, gồm mật khẩu ngẫu nhiên cũ, phân quyền, khởi động chậm, HTTP, build và Firebase runtime | 42/42 đạt |
| Mật khẩu tự đặt phía máy chủ: độ dài/ký tự, đúng người, thay mật khẩu cũ, chặn trùng/giao dịch, chặn người không có quyền, giới hạn thử, không trả/lưu mật khẩu rõ | 10/10 đạt |
| Form mật khẩu: nhập lại, ẩn/hiện, hủy, chống gửi lặp, xóa ô nhập, lỗi máy chủ, lỗi tải lại và tương thích khi cập nhật thiếu | 12/12 đạt |
| Toàn bộ bộ kiểm thử trên Node.js 24.19.0 | 64/64 đạt |
| Toàn bộ bộ kiểm thử trên Node.js 22.23.2 với `--no-experimental-require-module` | 64/64 đạt |
| `npm run check` và `npm run build`, gồm xác minh bản vá/runtime Firebase | Đạt |

64 là số ca riêng biệt, không cộng hai lần chạy thành 128 ca. UI được chạy
bằng module thật trong Node VM với DOM/RPC mô phỏng; giao dịch dữ liệu dùng
Firestore giả có thứ tự thực thi. Ca tranh chấp mật khẩu không phải thử tải
đồng thời trên Firestore thật. Không dùng tài khoản/khóa/mật khẩu thật, không
triển khai lên Netlify hoặc thay dữ liệu lớp khi kiểm tra.

Tập phụ thuộc giữ nguyên; `npm ci --offline --no-audit --no-fund` và
postinstall bản vá Firebase thành công. Không chạy lại Firestore Emulator,
kiểm toán npm hoặc đóng gói Functions riêng bằng công cụ Netlify ở đợt này.
Cần kiểm tra xuyên suốt trên website sau khi cập nhật cả UI và Functions.
Mật khẩu ngắn và mã HS/PH 5 số vẫn có rủi ro đoán/chia sẻ; bộ kiểm thử không
chứng minh đây là cơ chế xác thực mạnh hoặc đã kiểm toán toàn bộ ứng dụng.

## Lịch sử kiểm tra bản 1.1.2

| Nhóm | Kết quả |
| --- | --- |
| Hồi quy khởi động: membership/state đến muộn, SDK tải chậm, lỗi quyền, đăng xuất khi chờ, cổng HS/PH, thông báo và trạng thái chờ | 13/13 đạt |
| Toàn bộ 29 ca có từ bản 1.1.1: logic đăng nhập/quyền, HTTP, build, máy chủ cục bộ và tương thích Firebase Admin | 29/29 đạt |
| Toàn bộ bộ kiểm thử trên Node.js 24.19.0 | 42/42 đạt |
| Toàn bộ bộ kiểm thử trên Node.js 22.23.2 với `--no-experimental-require-module` | 42/42 đạt |
| `npm run check`: cú pháp JavaScript và cấu trúc HTML | Đạt |
| `npm run build`: xác minh bản vá Firebase, kiểm tra runtime và tạo thư mục công khai | Đạt |

42 là số ca riêng biệt, không cộng hai lần chạy thành 84 ca. Bộ hồi quy thực
thi đúng các hàm khởi động/đăng nhập trích từ `index.html` trong Node VM,
với Firebase, storage và bộ định tuyến hiển thị được mô phỏng. Một ca riêng
chạy hàm tạo HTML trạng thái chờ thật để kiểm tra thông báo trợ năng và không
đưa dữ liệu học sinh vào màn hình này. Đây không phải kiểm thử trình duyệt
thật hay xác thực trên website của người dùng.

Trước khi sửa, 4 trong 12 ca hồi quy ban đầu thất bại trên mã 1.1.1, gồm
tự tắt Firebase khi chờ membership/state, hủy listener HS/PH và thông báo
thành công quá sớm. Sau sửa, cả 13 ca (thêm ca HTML trạng thái chờ) đều đạt.

Đã cài lại phụ thuộc từ lockfile bằng `npm ci --offline --no-audit --no-fund`;
postinstall xác minh bản vá tương thích Firebase thành công. Phụ thuộc khóa
không thay đổi; chỉ số phiên bản gói gốc được tăng lên 1.1.2. Không chạy lại
kiểm toán lỗ hổng npm hoặc đóng gói Functions riêng bằng công cụ Netlify trong
đợt 1.1.2; kết quả các bước đó ở phần lịch sử bên dưới thuộc bản 1.1.1.

## Lịch sử kiểm tra bản 1.1.1

Các kết quả trong bảng dưới được ghi nhận ở đợt 1.1.1, không phải tất cả
đều được chạy lại trong đợt sửa giao diện 1.1.2.

| Nhóm | Kết quả |
| --- | --- |
| Logic xác minh, cấp/khóa quyền, hạn chế số lần thử, HTTP và cấu trúc giao diện | 21/21 đạt |
| Build không lộ bí mật, máy chủ thử chặn file riêng, nạp Firebase Admin | 3/3 đạt |
| Bản vá lặp an toàn, từ chối phiên bản/nội dung lạ, adapter Passport và kiểm tra runtime | 5/5 đạt |
| Chạy toàn bộ 29 ca trên Node.js 22.23.2 với `--no-experimental-require-module` | 29/29 đạt |
| Chạy toàn bộ 29 ca trên Node.js 24.19.0 | 29/29 đạt |
| Đóng gói hai Functions bằng `@netlify/zip-it-and-ship-it@15.4.2`, esbuild, external firebase-admin, target Node 22 | Đạt |
| Kiểm tra Firebase/JWKS/custom token trong từng gói Functions với Node 22, tắt require(ESM) và module detection | Cả hai gói đạt |
| Kiểm tra cú pháp JavaScript và cấu trúc HTML | Đạt |
| `npm audit --omit=dev` cho phụ thuộc ứng dụng | 0 lỗ hổng được báo tại thời điểm kiểm tra |

29 ca tự động đạt trên mỗi phiên bản Node (không tính hai lần thành 58 ca khác nhau).
Kiểm tra runtime tạo khóa RSA giả trong bộ nhớ, lấy khóa công khai qua JWKS
giả, kiểm tra chữ ký đúng, từ chối chữ ký sửa đổi, kid không tồn tại và khóa
không hợp lệ; kiểm tra callback Passport và ký custom token bằng Firebase
Admin. Không dùng credential thật hoặc gọi dịch vụ Firebase.

8 ca Rules/giao dịch Firestore Emulator đã đạt ở bản 1.1 trước đó; **không chạy
lại Emulator trong các đợt sửa 1.1.1, 1.1.2 và 1.1.3**. File Rules và logic quyền/dữ liệu của bản 1.1.1
giữ nguyên. Không gộp 8 ca lịch sử vào số ca kiểm tra lại hiện tại.

Đã kiểm tra mã HS/PH giữ nguyên 5 số, mật khẩu BCS không lưu dạng rõ, mã trùng không ghi dở dang, mã sai bị từ chối, đổi/khóa quyền vô hiệu phiên cũ, học sinh không đọc hồ sơ khác, cán bộ không truy cập lớp khác, GVCN giữ quyền hiện có, các kho riêng không đọc được từ trình duyệt.

## Chạy lại kiểm tra thông thường

Yêu cầu Node.js 22 trở lên:

```bash
npm ci
npm test
npm run check
npm run build
```

`npm test` dùng cấu hình giả để kiểm tra build; chạy lại `npm run build` với cấu hình triển khai đúng trước khi dùng thư mục `dist`. Netlify tự chạy bước build khi triển khai.

## Chạy kiểm tra Rules (người hỗ trợ kỹ thuật)

Đã chạy bằng Firebase CLI 14.12.0, Firestore Emulator 1.19.8, Java 17, `@firebase/rules-unit-testing` 4.0.1 và Firebase Web 11.6.1. Công cụ kiểm thử được cài riêng, không đưa vào phụ thuộc triển khai của ứng dụng.

Trong một bản sao làm việc dành cho kiểm thử, có thể cài công cụ tạm thời rồi chạy:

```bash
npm install --no-save --package-lock=false firebase-tools@14.12.0 @firebase/rules-unit-testing@4.0.1 firebase@11.6.1
npx firebase emulators:exec --project demo-gvcn-login --only firestore "node --test tests/rules.emulator.cjs"
```

Luôn dùng project giả `demo-gvcn-login`; không thay bằng tên dự án thật. Không cần đăng nhập Firebase để chạy các ca này. Không dùng các phụ thuộc công cụ tạm thời này để triển khai; `npm ci` khôi phục tập phụ thuộc khóa của ứng dụng.

## Chưa xác nhận trên môi trường thật

- Đã kiểm tra gói Functions cục bộ ở đợt 1.1.1; chưa triển khai bản 1.1.3 lên Netlify, chưa thử cấu hình bí mật, quyền IAM hoặc hạn mức dự án thật.
- Chưa thử xuyên suốt trên thiết bị của học sinh/phụ huynh hoặc kiểm thử hình ảnh giao diện trên các trình duyệt thật.
- Chưa kiểm toán toàn bộ mã nghiệp vụ cũ. Các giới hạn chi tiết theo nhiệm vụ cán bộ vẫn theo thiết kế hiện có, không được tuyên bố là đã gia cố toàn diện.
- Mã 5 số vẫn có rủi ro đoán được hoặc bị chia sẻ. Kết quả kiểm thử không biến mã ngắn thành hình thức xác thực mạnh.

Theo checklist trong `DANG_NHAP_DON_GIAN.md` trước khi cấp link cho lớp.
