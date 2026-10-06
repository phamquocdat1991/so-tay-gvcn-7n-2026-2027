# Bản cập nhật 05/10/2026: điểm trực tiếp và giao diện dùng chung GVCN

Trạng thái: đã sửa mã nguồn và kiểm thử cục bộ; chưa triển khai lên Netlify/Firebase thật. Netlify hiện yêu cầu đăng nhập tài khoản quản lý dự án.

## Điểm trực tiếp

- Ban cán sự, tổ trưởng và tổ phó có quyền nhập điểm được ghi trực tiếp trong phạm vi được giao. Không tạo đề xuất mới, không có bước duyệt/từ chối.
- Xóa trang/bảng đề xuất, nút chờ duyệt và nút duyệt của GVCN. API approve/reject không còn được chấp nhận.
- Một transaction lưu điểm, sao, lịch sử, phiên bản dữ liệu lớp, bản chiếu cho học sinh và biên nhận chống trùng. Chỉ hiện thông báo thành công khi máy chủ xác nhận.
- Gửi lại cùng requestId và nội dung không cộng/trừ điểm lần hai. Dùng lại requestId với nội dung khác bị từ chối.
- Giữ kiểm tra studentId, chức vụ, tổ, chuyên mục, tuần đã chốt và quyền add/edit. Không cho học sinh sửa tổng điểm tùy ý.
- Khi có quyền edit, học sinh được sửa bản ghi của chính mình trong tuần hiện tại, trong tổ/chuyên mục được phép, chưa chốt. Sửa bản ghi thay phần đóng góp cũ bằng điểm mới, không cộng thêm nguyên lần nữa. Bản ghi đã thay đổi trên thiết bị khác yêu cầu tải lại.
- API propose được giữ như tên gọi tương thích cho client cũ nhưng ghi trực tiếp với yêu cầu mới. Yêu cầu trùng với dữ liệu scoreProposals cũ bị chặn để không tự cộng lại.

Các đề xuất cũ chưa duyệt được giữ nguyên trong cơ sở dữ liệu để đối chiếu, không tự chuyển thành điểm. Các điểm đã ghi trước đó không bị xóa hay tính lại.

## Giao diện

`class-dashboard.js` và `class-dashboard.css` là thành phần dùng chung cho GVCN và Ban cán sự: cùng renderer thẻ gradient, bộ màu xanh/indigo/vàng/cam/xanh lá, icon góc phải, bo tròn, cùng nội dung và CSS banner GVCN. Header dùng chung lớp định dạng. Nội dung tên/chức vụ và chức năng được lọc theo tài khoản.

Trang học sinh không có bảng HTML. Điểm danh, trực nhật, thành viên và lịch sử điểm hiển thị bằng thẻ/biểu mẫu. Trên điện thoại thẻ chức năng xếp một cột; máy tính bảng hai cột; máy tính tự chia cột theo không gian. Không có thẻ quản trị, thay banner, phân quyền hoặc duyệt điểm.

Mở XEM_TRUOC_BAN_CAN_SU.html để xem mẫu offline với dữ liệu minh họa; bấm các thẻ để chuyển nội dung. Bản xem trước không ghi dữ liệu thật.

Giữ toàn bộ cơ chế tự cập nhật chức vụ và phục hồi phiên của bản trước. Đổi phân công không yêu cầu nhập lại mật khẩu; khóa tài khoản/đổi mật khẩu vẫn vô hiệu hóa phiên cũ.

## Triển khai đúng dự án hiện tại

1. Cập nhật đầy đủ thư mục mã nguồn vào dự án Netlify đang phục vụ tangerine-faloodeh-15216b.netlify.app. Bao gồm index.html, class-dashboard.js/css, to-pho.js, deputy-dashboard.css, server, netlify/functions, scripts, package*.json và netlify.toml. Không chỉ thay index.html.
2. Giữ các biến môi trường của dự án: Firebase, App ID/Class ID, thông tin Admin SDK và cấu hình đăng nhập. Build tại môi trường có FIREBASE_CONFIG_JSON bằng npm run build; publish dist và Functions theo netlify.toml.
3. Nếu chưa triển khai bản tự cập nhật quyền trước, cần cập nhật Firestore Rules từ firestore.rules để GVCN ghi tín hiệu permissionSignals. Bản điểm trực tiếp không cần mở thêm quyền ghi trực tiếp Firestore cho học sinh; mọi ghi điểm đi qua Functions.
4. Sau deploy, tải lại trang GVCN và học sinh để nhận đồng bộ mã mới. Kiểm tra trên một lớp thử: tổ trưởng lưu điểm thuộc tổ, GVCN thấy ngay; thử gửi lặp; sửa bản ghi; từ chối ngoài tổ; đổi phân công tự đổi giao diện.

Không upload thư mục dist được build cục bộ thiếu cấu hình để thay website đang hoạt động. Không xóa dữ liệu lớp hoặc các bản ghi cũ để cài bản cập nhật.

## Kiểm chứng

86/86 kiểm thử liên quan đạt, kết quả nằm trong KET_QUA_KIEM_THU_DONG_BO.txt. Bao gồm quyền/phạm vi, lưu điểm trực tiếp, sửa điểm/idempotency/xung đột, DOM không có bảng và điều khiển xét duyệt, chờ xác nhận máy chủ, phục hồi phiên, và banner/thẻ dùng chung của GVCN.

Build, cú pháp và kiểm tra tương thích Firebase runtime đạt. Build cục bộ thiếu FIREBASE_CONFIG_JSON, vì vậy phải build lại trên Netlify với biến môi trường hiện có. Chưa chạy Firebase Emulator, chưa thử lưu dữ liệu lớp thật và chưa kiểm tra trực quan trên iPhone/iPad thật. Trình duyệt kiểm tra chặn địa chỉ localhost; bản xem trước được kiểm tra bằng DOM mô phỏng. Không khẳng định toàn bộ bộ kiểm thử lịch sử của ứng dụng đều đạt.

## Kiểm tra bổ sung độ tin cậy nhập điểm

Đã sửa: khóa ô nhập khi đang gửi và khôi phục đúng trạng thái quyền sau khi gửi xong; giữ biểu mẫu/mã requestId khi mất phản hồi và khi tự làm mới quyền không thay đổi; bổ sung bộ đếm phiên bản sửa để không chấp nhận lại phiên bản cũ sau nhiều lần sửa trong cùng mili giây; từ chối kiểu dữ liệu điểm không hợp lệ.

Kiểm thử bổ sung đạt: bấm lưu hai lần, phản hồi mất sau lượt gửi và thử lại cùng nội dung, hai cán sự cùng ghi điểm một học sinh, thu hồi chức vụ sau khi mở form, lỗi ghi bản chiếu làm rollback cả giao dịch, callback transaction chạy lại không cộng trùng, sửa A→B→A vẫn chặn phiên bản cũ.

Các tình huống lỗi mạng/giao dịch được mô phỏng bằng bộ kiểm thử, không phải kiểm thử Firebase/Netlify production. Không cam kết tuyệt đối không có lỗi. Cần triển khai đầy đủ và kiểm tra tích hợp với tài khoản thử đúng vai trò trên hệ thống thật trước khi kết luận lỗi thực tế đã được khắc phục.

## Kiểm thử theo thao tác người dùng — 05/10/2026

Đã nối biểu mẫu DOM với logic máy chủ thật trong bộ kiểm thử, dùng cơ sở dữ liệu mô phỏng và tài khoản giả lập (tests/user-journey.test.mjs). Các chuỗi đạt: chuyển tất cả thẻ; chọn đúng học sinh và lưu điểm; sửa bản ghi của mình; hủy sửa rồi nhập điểm học sinh khác; điểm danh; chấm trực nhật; mất phản hồi sau khi máy chủ đã lưu rồi gửi lại; nhập 0 bị từ chối rồi sửa hợp lệ; thu hồi chức vụ giữa lúc nhập.

Đã phát hiện và sửa lỗi biểu mẫu sửa bị tác vụ làm mới nền thay thế khi người dùng vừa mở nhưng chưa gõ. Biểu mẫu sửa hiện được giữ cho tới khi lưu/hủy hoặc quyền thực sự thay đổi.

Kiểm tra website thật: mở được trang đăng nhập và chuyển được sang Ban cán sự. Sau một lượt xác thực qua biểu mẫu bảo mật, trang vẫn hiển thị đăng nhập, chưa có bằng chứng vào tài khoản thành công và chưa xác định được nguyên nhân từ thông báo trên màn hình. Không ghi điểm thử vào dữ liệu lớp thật. Chưa xác nhận vận hành sau đăng nhập, tốc độ thực tế hoặc hiển thị trên điện thoại/iPad thật. Bản sửa này chưa được triển khai.
