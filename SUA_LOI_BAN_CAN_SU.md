> Tài liệu bản trước. Cơ chế tự động cập nhật quyền và hướng dẫn triển khai hiện hành nằm trong PHAN_QUYEN_TU_DONG.md; thay cho yêu cầu làm mới thủ công/dừng polling bên dưới.

# Bản cập nhật mới nhất: phục hồi màn hình Ban cán sự

Bản này bao gồm các sửa đồng bộ/phân quyền trước và bổ sung sửa lỗi màn hình bị kẹt. Chưa được triển khai lên Netlify/Firebase của cô.

## Nguyên nhân

Trong `server/deputy-service.mjs`, tài khoản BCS (`bcs`) lấy tổ từ `officerRoles.groupName`, còn Tổ phó (`to_pho`) lấy tổ từ membership `groupId`. Máy chủ so sánh tổ được phân công với `student.group`. Nếu không khớp, máy chủ từ chối để tránh truy cập ngoài tổ.

`to-pho.js` trước đây chỉ hiện thông báo và nút Thử lại, rồi gửi lại cùng yêu cầu. Nó không làm mới membership/token. Đăng nhập lại cũng không tự sửa một phân công tổ vẫn sai trên máy chủ.

Ảnh có nút “Về phân quyền” hiện với BCS. Thuộc tính hidden cần được bảo vệ khỏi CSS giao diện; bản sửa thêm quy tắc `[hidden]{display:none!important}` trong workspace. Cần triển khai đồng bộ các file để tránh còn script cũ.

## Sửa cụ thể

- `to-pho.js`: thẻ lỗi gọn, tiêu đề theo nguyên nhân, hướng dẫn và ba nút Làm mới dữ liệu / Đăng nhập lại / Về trang đăng nhập. Màn hình nhỏ xếp nút thành cột; vùng lỗi có role alert; nút có focus rõ. Trang chủ ứng dụng là trang yêu cầu đăng nhập, nên đường thoát đưa về đăng nhập sau đăng xuất, không mở dữ liệu lớp cho khách.
- Nút Làm mới gọi `refreshSession()` trước, sau đó chỉ tải `action:view`. Không tự phát lại yêu cầu ghi điểm, tránh cộng điểm lần hai.
- Khi gặp lỗi, dừng polling 15 giây; chỉ thử tiếp khi người dùng yêu cầu. Đăng xuất vẫn hoạt động ngay cả khi lượt tải đang chờ. Phản hồi đến muộn không dựng lại màn hình đã thoát.
- Khi 401/403, xóa nội dung được bảo vệ khỏi màn hình; nếu chỉ lỗi mạng, giữ biểu mẫu đang nhập. Thao tác chủ động nạp lại hoặc đăng xuất hỏi trước khi bỏ nội dung chưa gửi.
- `firebase-secure.js`: thêm `refreshSession()`, gọi `getIdToken(true)` và đọc membership trực tiếp máy chủ bằng `getDocFromServer`, có thời hạn chờ và kiểm tra tài khoản có đổi trong lúc chờ hay không. Chỉ cập nhật membership cục bộ sau khi kiểm tra thành công.
- Custom token có `accessVersion`. Refresh token Firebase không tự nâng claim này khi GVCN thu hồi/thay quyền; trường hợp đó bắt buộc đăng nhập lại bằng thông tin riêng để máy chủ cấp token mới. Không tự cấp thêm quyền để bỏ qua lỗi.
- `server/deputy-service.mjs` và `server/access-http.mjs`: trả mã lỗi `ASSIGNMENT_CHANGED`, `SESSION_CHANGED`, `SESSION_EXPIRED`, `ROLE_UNAVAILABLE` để giao diện phân biệt lỗi phân công và lỗi phiên. Vẫn kiểm tra quyền và tổ trên mỗi yêu cầu.

## Nếu tổ thực sự chưa khớp

GVCN cần mở danh sách lớp và phân quyền, kiểm tra đúng học sinh, chức vụ, tổ. Với Tổ trưởng, phân công học sinh thuộc đúng tổ của chức vụ; với tài khoản Tổ phó, cập nhật phân công Tổ phó theo tổ mới qua giao diện quản trị. Không chỉ sửa tên chức danh hiển thị.

Sau khi GVCN đã lưu phân công đúng lên máy chủ, học sinh bấm Làm mới dữ liệu. Nếu quyền/phiên bị đổi (`accessVersion`), chọn Đăng nhập lại. Nếu chưa khớp, ứng dụng tiếp tục chặn dữ liệu ngoài tổ nhưng vẫn có đường thoát. Không chuyển ngầm người dùng sang toàn lớp hay tự lấy tổ mới làm quyền được cấp.

## Triển khai

Dùng toàn bộ thư mục nguồn trong ZIP để build/deploy lại dự án Netlify hiện có. Cần đồng bộ frontend và Netlify Functions; không chỉ thay index.html. Các thay đổi chức năng lần này nằm ở `to-pho.js`, `firebase-secure.js`, `server/deputy-service.mjs`, `server/access-http.mjs`. `package.json`/lock bổ sung thư viện DOM dành cho kiểm thử.

Giữ các biến môi trường Firebase/Netlify đang dùng. Lần sửa phục hồi BCS này không bổ sung thay đổi Firestore Rules; giữ Rules của bản đồng bộ trước. Không xóa dữ liệu lớp, không tự chỉnh rộng quyền Firebase.

## Kiểm tra

56/56 kiểm thử liên quan đạt, gồm 10 ca mới cho UI phục hồi, refresh phiên và mã lỗi HTTP. Các ca kiểm tra thực thi DOM của workspace bằng linkedom, kiểm tra server bằng giao dịch giả lập; không phải đăng nhập vào Firebase thật.

Các trường hợp đã kiểm tra: lỗi phân công có đủ đường thoát; ẩn điều hướng GVCN; dừng vòng thử lại; GVCN sửa phân công thì lượt đọc kế tiếp thành công; phiên đổi phiên bản buộc đăng nhập; refresh đọc server; đổi tài khoản trong lúc chờ không ghi đè session; đăng xuất khi tải treo; phản hồi cũ không dựng lại workspace; HTTP không tiết lộ danh sách lớp khi từ chối.

`npm run build` đạt cú pháp và Firebase runtime smoke test. Môi trường kiểm tra không có cấu hình Firebase thật, nên Netlify cần build lại với cấu hình hiện có. Chưa kiểm thử trực quan trên Safari/iPhone thật hoặc triển khai website. Bộ kiểm thử toàn ứng dụng có các lỗi cũ đã ghi trong các báo cáo trước; không tuyên bố tất cả chức năng đều đạt.

Lệnh chạy:

```
node --test tests/deputy.test.mjs tests/score-sync.test.mjs tests/sync-routing.test.mjs tests/pending-recovery.test.mjs tests/deputy-recovery-ui.test.mjs tests/session-refresh.test.mjs
npm run build
```
