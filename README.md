> **Bản hiện hành 05/10/2026:** xem [CAP_NHAT_DIEM_TRUC_TIEP.md](CAP_NHAT_DIEM_TRUC_TIEP.md). Đã bỏ xét duyệt điểm; các mô tả đề xuất/chờ duyệt trong tài liệu cũ bên dưới không còn áp dụng.

**Bản hiện hành — cập nhật quyền tự động:** đọc [PHAN_QUYEN_TU_DONG.md](PHAN_QUYEN_TU_DONG.md). Cần cập nhật Firestore Rules và triển khai đồng bộ frontend + Functions.

# Sổ Tay GVCN 7N

**Bản mới nhất — giao diện thẻ Ban cán sự:** xem [thiết kế, phân quyền và triển khai](GIAO_DIEN_BAN_CAN_SU_MOI.md). Mở `XEM_TRUOC_BAN_CAN_SU.html` để xem mẫu bằng dữ liệu giả lập.

**Hướng dẫn bản cập nhật mới nhất:** [Sửa màn hình Ban cán sự bị kẹt](SUA_LOI_BAN_CAN_SU.md). Triển khai đồng bộ frontend và Functions.

Kiểm tra bổ sung hiện tượng lưu gián đoạn: [kết luận và giới hạn kiểm tra](KET_LUAN_LOI_LUU_LUC_DUOC_LUC_KHONG.md).

Bản sửa đồng bộ 04/10/2026: xem [hướng dẫn triển khai và kết quả kiểm thử](HUONG_DAN_BAN_SUA_DONG_BO.md).

Ứng dụng quản lý lớp học chạy trực tiếp trên trình duyệt, sẵn sàng lưu trên GitHub và triển khai bằng Netlify.

## Thẻ học sinh gọn trên desktop — bản 1.1.5

Danh sách tự xếp 1, 2 hoặc 3 cột theo chiều rộng khung, tối đa 1320px và
căn giữa. Điểm số, nút trừ/cộng, hồ sơ và menu được gom thành một hàng linh
hoạt ngay dưới tên và nhãn tổ. Bỏ chiều cao tối thiểu 116px gây khoảng
trắng; padding thẻ còn 7px theo chiều dọc. Tên dài vẫn hiển thị xuống dòng.

Chỉ thay bố cục danh sách, không đổi đăng nhập, phân quyền hay dữ liệu lớp.
Xem [CAP_NHAT_GIAO_DIEN_1_1_5.md](CAP_NHAT_GIAO_DIEN_1_1_5.md).

## Đăng nhập một ô và nút tổng số học sinh — bản 1.1.4

- Ban cán sự chỉ nhập mật khẩu riêng; HS/PH chỉ nhập mã học sinh 5 số.
  Không còn quay về yêu cầu email khi công tắc đăng nhập đơn giản đang tắt.
  Khi công tắc tắt, giao diện báo chưa bật và máy chủ vẫn từ chối đăng nhập.
- Thẻ **Tổng số học sinh** mở danh sách chi tiết, tìm theo tên/mã, lọc theo tổ;
  bấm tên để mở hồ sơ. Chỉ người có quyền xem danh sách mới mở được.
- Giữ chức năng GVCN tự đặt mật khẩu của 1.1.3 và hai bản vá 1.1.1–1.1.2.

Xem [CAP_NHAT_1_1_4.md](CAP_NHAT_1_1_4.md). Để sử dụng đăng nhập một ô,
cần `SIMPLE_LOGIN_ENABLED=true` ở Production cho **Builds và Functions**, rồi
build/deploy lại. Không đổi khóa quản trị, dữ liệu lớp hoặc mã/mật khẩu đã cấp.

## Tự đặt mật khẩu ban cán sự — bản 1.1.3

Trong **Quản lý quyền đăng nhập**, bấm **Cấp mật khẩu** hoặc **Đặt lại mật khẩu**,
nhập mật khẩu mới hai lần rồi bấm **Lưu mật khẩu**. Mật khẩu từ 6–128 ký tự,
không trùng giữa hai cán bộ; mật khẩu cũ vẫn dùng được đến khi GVCN đổi.
Mã HS/PH vẫn giữ nguyên 5 số. Xem [TU_DAT_MAT_KHAU.md](TU_DAT_MAT_KHAU.md)
để cập nhật cả giao diện và máy chủ, cùng các lưu ý về mật khẩu ngắn.

## Bản sửa kẹt màn hình đăng nhập 1.1.2

Làm theo [CAP_NHAT_DANG_NHAP.md](CAP_NHAT_DANG_NHAP.md). Mốc chờ 1,8 giây
không còn tắt kết nối Firebase hoặc hủy listener đang tải dữ liệu. Ứng dụng
hiện trạng thái chờ và mở màn hình chính khi nhận được dữ liệu; không báo
đăng nhập hoàn tất trước khi luồng này kết thúc.

Bản này giữ toàn bộ bản sửa Netlify 1.1.1 bên dưới. Không đổi dữ liệu lớp,
tài khoản, mã học sinh, Rules, phụ thuộc hoặc biến môi trường.

## Bản sửa lỗi Netlify 1.1.1

Nếu đang gặp `ERR_REQUIRE_ESM` khi mở Quản lý quyền đăng nhập, làm theo
[CAP_NHAT_LOI_ESM.md](CAP_NHAT_LOI_ESM.md). Bản này sửa cách nạp thư viện,
không thay dữ liệu lớp, mã học sinh, tài khoản hay Rules; không cần
`NODE_OPTIONS=--experimental-require-module`.

`npm ci` tự áp dụng bản vá có kiểm tra phiên bản/nội dung. `npm run build`
kiểm tra lại bản vá và chạy thử Firebase với `require(ESM)` bị tắt trước khi
tạo `dist`. Không bỏ qua bước build hoặc cập nhật thư viện mà chưa kiểm thử lại.

## Chạy trên máy

Yêu cầu Node.js 22 trở lên.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000`.

## Kiểm tra và build

```bash
npm run check
npm test
npm run build
```

Thư mục triển khai được tạo tại `dist/`.

Để bật đăng nhập bảo mật và đồng bộ dữ liệu, làm theo [FIREBASE_SETUP.md](FIREBASE_SETUP.md).

## Đăng nhập đơn giản (bản 1.1)

- GVCN giữ email/mật khẩu hiện có.
- Mỗi cán bộ lớp dùng một mật khẩu riêng, không nhập email.
- HS/PH chỉ nhập mã học sinh 5 số hiện có.
- GVCN cấp, đổi, khóa quyền ở **Cài đặt → Mật khẩu → Quản lý quyền đăng nhập**.

Đọc [DANG_NHAP_DON_GIAN.md](DANG_NHAP_DON_GIAN.md) trước khi triển khai. Tính năng mặc định tắt; cần cấu hình máy chủ và cập nhật Rules, không chỉ thay HTML. Không kéo-thả riêng `dist` vì cách đó không triển khai hai Netlify Functions mới.

## Đưa lên GitHub và Netlify

1. Đẩy toàn bộ thư mục dự án lên một repository GitHub.
2. Trong Netlify, chọn **Add new site → Import an existing project** và kết nối repository.
3. Netlify tự đọc `netlify.toml`; cấu hình chuẩn là:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Chọn **Deploy site**.

Không cần chạy `server.js` trên Netlify. Tệp này chỉ phục vụ việc chạy thử tại máy.

## Bảo mật và dữ liệu

- Mỗi danh tính có một UID Firebase. Với đăng nhập đơn giản, Firebase tạo danh tính nội bộ khi đăng nhập lần đầu; HS/PH và cán bộ lớp không phải tự đăng ký tài khoản.
- Vai trò được lưu trong Firestore và kiểm tra bằng `firestore.rules`.
- Một bộ dữ liệu lớp `7N` được đồng bộ cho các tài khoản đã cấp quyền.
- GVCN có sao lưu phiên bản, khôi phục và nhật ký thao tác.
- Nếu chưa cấu hình Firebase, ứng dụng khóa đăng nhập quản trị và hiển thị hướng dẫn thiết lập; không quay lại mật khẩu mặc định trong mã nguồn.
