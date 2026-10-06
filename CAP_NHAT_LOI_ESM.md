# Sửa lỗi Quản lý quyền đăng nhập trên Netlify — bản 1.1.1

## Phạm vi bản sửa

- Sửa lỗi `ERR_REQUIRE_ESM` của chuỗi thư viện Firebase Admin → jwks-rsa → jose.
- Giữ Firebase Admin 14.3.0 và jose 6; không hạ thư viện mật mã về phiên bản cũ.
- Chuyển hai chỗ nạp jose sang `import()` chuẩn. Không bỏ kiểm tra chữ ký, vai trò hay phiên đăng nhập.
- Không đổi giao diện, mã học sinh 5 số, dữ liệu lớp, membership, Firestore Rules hoặc khóa bí mật.
- Không cần `NODE_OPTIONS=--experimental-require-module`.

## Thao tác cho website đã triển khai

1. Giải nén gói mới vào một thư mục riêng. Không cần cài Node.js hoặc chạy lệnh trên máy cá nhân nếu triển khai qua GitHub.
2. Trong Netlify → Project configuration → Environment variables:
   - Giữ `SIMPLE_LOGIN_ENABLED=false`.
   - Nếu biến `NODE_OPTIONS` vừa thêm chỉ có giá trị `--experimental-require-module`, xóa đúng biến đó. Nếu biến có tùy chọn khác, chỉ bỏ tùy chọn này, giữ phần còn lại.
   - Giữ nguyên `FIREBASE_CONFIG_JSON`, `FIREBASE_SERVICE_ACCOUNT_JSON`, `SIMPLE_AUTH_SECRET`, `GVCN_APP_ID`, `GVCN_CLASS_ID`. Không tạo lại khóa Firebase.
   - Chưa cần bấm Trigger deploy ở bước này.
3. Mở repository GitHub đang kết nối Netlify. Sao lưu/đối chiếu trước nếu có thay đổi riêng sau bản 1.1.
4. Dùng Add file → Upload files, kéo nội dung bên trong thư mục giải nén vào thư mục gốc repository. Không kéo cả thư mục bọc ngoài hoặc file ZIP. Không xóa file cũ trước; cập nhật file trùng đường dẫn và thêm file mới.
5. Commit lên nhánh triển khai hiện có. Nếu nhánh được bảo vệ, làm theo quy trình duyệt của repository; không bỏ bảo vệ nhánh. Không tải file Service Account, `.env` thật hoặc `node_modules` lên GitHub.
6. Trong Netlify → Deploys, chờ bản từ commit mới hiện Published. Không chỉ triển khai lại commit `aed1d3f` cũ. Nếu không tự triển khai, dùng Trigger deploy → Deploy site sau khi xác nhận Netlify đã nhận commit mới.
7. Trong build log phải có cả hai dòng:

   ```text
   Firebase runtime compatibility: verified (jwks-rsa 4.1.0).
   Firebase runtime smoke test: passed without require(ESM).
   ```

8. Mở website → Ctrl + Shift + R → đăng nhập GVCN → Cài đặt → Quản lý Mật khẩu → Quản lý quyền đăng nhập → Tải lại danh sách.
9. Chỉ khi danh sách đúng và đầy đủ mới bấm Đồng bộ / bật mã học sinh. Không đồng bộ danh sách trống bất thường. Giữ công tắc đăng nhập tắt đến khi đã cấp quyền; tiếp tục theo mục 4–5 của `DANG_NHAP_DON_GIAN.md`.

Nếu vẫn báo lỗi, lấy dòng mới nhất trong Function log của `access-admin` sau lần triển khai mới. Chỉ chia sẻ mã lỗi và thời gian; không chia sẻ giá trị bí mật, mật khẩu hay mã học sinh.

## Các file được thay đổi/thêm trong bản này

File chạy ứng dụng/build cần cập nhật cùng nhau:

- `package.json`
- `package-lock.json`
- `scripts/build.mjs`
- `scripts/patch-firebase-runtime.mjs` (mới)
- `scripts/check-firebase-runtime.mjs` (mới)

Kiểm thử/tài liệu:

- `tests/runtime.test.mjs` (mới)
- `README.md`
- `DANG_NHAP_DON_GIAN.md`
- `KIEM_THU.md`
- `CAP_NHAT_LOI_ESM.md` (mới)

Các file khác trong gói giữ nguyên nội dung bản 1.1. Không cần dán lại Rules trong Firebase để sửa lỗi này.

## Ghi chú kỹ thuật

`scripts/patch-firebase-runtime.mjs` chỉ sửa `src/utils.js` và
`src/integrations/passport.js` của `jwks-rsa@4.1.0`. Script kiểm tra SHA-256
trước và sau khi thay đổi, chạy lặp không làm thay đổi thêm, và dừng nếu phiên
bản/nội dung không khớp. Tất cả bộ lọc loại khóa, thuật toán và logic mật mã
giữ nguyên; adapter Passport tiếp tục dùng callback, việc nạp jose được thực
hiện bất đồng bộ bên trong provider.

Bản vá được áp dụng khi cài phụ thuộc và kiểm tra lại khi build, nên không phụ
thuộc việc Netlify có dùng lại bộ nhớ đệm cài đặt hay bỏ lifecycle scripts hay
không. Phải tải đủ thư mục `scripts/` để postinstall/build chạy được.

Build chạy kiểm tra offline trong tiến trình Node mới với
`--no-experimental-require-module`, không dùng khóa thật và không gọi Firebase.
Chỉ sửa cách nạp module; không bật chế độ thử nghiệm, không tắt xác thực hay
kiểm tra TLS. Khi nâng cấp jwks-rsa sau này, cần gỡ/cập nhật bản vá sau khi kiểm
thử, không bỏ kiểm tra hash để ép build qua.

Tham khảo: [báo cáo Firebase #3181](https://github.com/firebase/firebase-admin-node/issues/3181),
[Node.js dynamic import](https://nodejs.org/api/esm.html#import-expressions),
[cấu hình Netlify Functions](https://docs.netlify.com/build/functions/configuration/).
