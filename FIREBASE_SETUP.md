# Thiết lập Firebase cho Sổ Tay GVCN 7N

Ứng dụng sử dụng Firebase Authentication cho tài khoản riêng và Firestore cho dữ liệu chung của lớp `7N`.

> Đã có dự án và đã đăng nhập GVCN được: giữ nguyên dự án, API key và UID GVCN. Để dùng mã học sinh 5 số / mật khẩu cán bộ riêng, làm theo **DANG_NHAP_DON_GIAN.md**; không cần tạo tài khoản HS/PH thủ công theo mục 4 bên dưới.

## 1. Tạo dự án

1. Mở Firebase Console và tạo một dự án mới.
2. Thêm **Web app** và sao chép đối tượng cấu hình Firebase.
3. Trong **Authentication → Sign-in method**, bật **Email/Password**.
4. Trong **Firestore Database**, tạo cơ sở dữ liệu ở Production mode.

## 2. Cài Firestore Rules

Sao chép toàn bộ nội dung `firestore.rules` vào **Firestore Database → Rules**, sau đó Publish.

## 3. Tạo tài khoản GVCN đầu tiên

1. Trong **Authentication → Users**, tạo tài khoản email/mật khẩu cho GVCN.
2. Sao chép `User UID`.
3. Trong Firestore, tạo document:

```text
artifacts/so-tay-gvcn-7n/members/<USER_UID>
```

Nội dung:

```json
{
  "active": true,
  "role": "gvcn",
  "displayName": "Giáo viên chủ nhiệm"
}
```

## 4. Tạo tài khoản cho từng người

Tạo mỗi người một tài khoản trong Authentication, sau đó tạo member document tương ứng.

Vai trò hợp lệ:

- `gvcn`: Giáo viên chủ nhiệm, toàn quyền.
- `bcs`: Cán bộ lớp; thêm `studentId` đúng ID học sinh đã được phân công trong ứng dụng.
- `gvbm`: Giáo viên bộ môn.
- `bgh`: Ban giám hiệu, chỉ đọc.
- `phhs`: Học sinh/phụ huynh; bắt buộc có `studentId` đúng ID học sinh.

Ví dụ:

```json
{
  "active": true,
  "role": "phhs",
  "displayName": "Nguyễn Văn An",
  "studentId": "1"
}
```

## 5. Cấu hình Netlify

Trong **Site configuration → Environment variables**, thêm:

```text
FIREBASE_CONFIG_JSON
```

Giá trị là đối tượng cấu hình Web App trên một dòng, ví dụ:

```json
{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}
```

Sau đó chọn **Deploys → Trigger deploy → Clear cache and deploy site**.

## 6. Build thủ công trên Windows

> Chỉ áp dụng cho bản đăng nhập email/mật khẩu cũ (`SIMPLE_LOGIN_ENABLED=false`). Bản đăng nhập đơn giản cần Netlify Functions; phải triển khai toàn bộ mã nguồn qua quy trình build của Netlify, không kéo-thả riêng `dist`.

Nếu muốn tạo thư mục `dist` để kéo-thả trực tiếp lên Netlify, mở PowerShell trong thư mục dự án:

```powershell
$env:FIREBASE_CONFIG_JSON='{"apiKey":"...","authDomain":"...","projectId":"...","storageBucket":"...","messagingSenderId":"...","appId":"..."}'
npm run build
```

Sau đó kéo toàn bộ thư mục `dist` vào Netlify Drop.

> Firebase Web API key không phải khóa quản trị bí mật. Bảo mật dữ liệu do Authentication và `firestore.rules` đảm nhiệm. Tuyệt đối không đưa Service Account JSON vào mã nguồn hoặc biến này.
