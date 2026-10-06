# Bản sửa đồng bộ điểm — 04/10/2026

Đây là mã nguồn đã sửa, chưa được triển khai lên website Netlify của cô.

## Lỗi đã tìm thấy và sửa

1. Ban cán sự trước đây mở giao diện ghi toàn bộ dữ liệu lớp, trong khi Firestore Rules không cấp quyền đó. Bản sửa chuyển BCS/Tổ phó sang cổng máy chủ kiểm tra phạm vi và quyền của từng tài khoản.
2. GVCN ghi dữ liệu nhưng không tăng số phiên bản. Bản sửa tăng phiên bản sau mỗi lần lưu, từ chối bản cũ và giữ bản nháp để đối chiếu; không tự gộp các thay đổi xung đột.
3. Nhập điểm học tập hàng loạt báo thành công trước khi lưu xong. Bản sửa gom thành một lượt lưu và thông báo theo kết quả: đã đồng bộ, lưu tạm, lỗi quyền hoặc xung đột.
4. Thêm nhập/sửa/xóa điểm học tập qua API có kiểm tra quyền; lưu điểm học tập, điểm tích và dữ liệu cổng học sinh trong cùng giao dịch. Gửi lại cùng yêu cầu không cộng điểm hai lần.
5. Firestore Rules yêu cầu phiên bản tăng đúng một khi cập nhật, để phiên bản ứng dụng cũ không ghi đè dữ liệu mới.

## Cách dùng sau khi cập nhật

- GVCN dùng giao diện hiện có. Khi thấy thông báo xung đột, chọn **Tải bản nháp & nạp điểm mới**, đối chiếu và nhập lại phần chưa đồng bộ.
- BCS có giao diện riêng, chỉ hiển thị học sinh và chức năng được cấp quyền. Nhập điểm học tập cần chức vụ hoạt động, quyền `gradeEntry`, tab `bao-cao` và cài đặt cho phép cán bộ nhập điểm.
- Cán bộ có phạm vi toàn lớp được cộng/trừ trực tiếp nếu có quyền. Đề xuất thi đua của tổ trưởng/tổ phó vẫn cần GVCN duyệt, theo cơ chế có sẵn của máy chủ; “đã gửi đề xuất” chưa có nghĩa là điểm đã cộng.
- GVCN vào **Cài đặt → Phân quyền cán bộ lớp → Duyệt đề xuất điểm** để xét đề xuất.
- Cổng BCS kiểm tra dữ liệu mới mỗi 15 giây khi không nhập biểu mẫu. Khi đang nhập, dùng **Cập nhật** sau khi lưu; thao tác này sẽ hỏi trước khi bỏ nội dung chưa gửi.
- Tổ phó mang vai trò `to_pho` giữ chức năng đề xuất điểm và đánh giá trực nhật; chức năng sổ điểm học tập dành cho tài khoản BCS được cấp quyền tương ứng.

## Cập nhật Netlify và Firebase

Nhờ người quản trị website thực hiện các bước sau. Không cần gửi mật khẩu cho người sửa mã.

1. Tạm dừng nhập điểm trên các thiết bị, xuất bản sao lưu dữ liệu lớp bằng chức năng sao lưu hiện có. Giữ bản deploy cũ để có thể quay lại.
2. Giải nén ZIP. Cập nhật mã nguồn dự án Netlify từ thư mục `so-tay-gvcn-7n-main`. Dùng `index.html`; file `index).html` là bản cũ có sẵn, không phải trang triển khai.
3. Giữ nguyên cấu hình của dự án đang hoạt động. Kiểm tra các biến môi trường cần thiết:
   - `FIREBASE_CONFIG_JSON`: cấu hình Firebase phía trình duyệt, đúng dự án hiện tại.
   - `FIREBASE_SERVICE_ACCOUNT_JSON`: thông tin tài khoản dịch vụ cho Netlify Functions, chỉ lưu trong biến môi trường phía máy chủ.
   - `SIMPLE_AUTH_SECRET`: giữ nguyên khóa hiện có, tối thiểu 32 ký tự.
   - `SIMPLE_LOGIN_ENABLED=true` nếu dùng đăng nhập đơn giản cho BCS/học sinh.
   - `GVCN_APP_ID`, `GVCN_CLASS_ID`: giữ đúng giá trị đang dùng; không đổi để tránh mở sang lớp khác.
4. Cấu hình build: Node từ 22, lệnh `npm run build`, thư mục xuất bản `dist`, Netlify Functions tại `netlify/functions`. Nếu dự án liên kết Git, cập nhật mã nguồn lên đúng repository/branch của site và chạy deploy tại Netlify.
5. Triển khai cả Functions (`deputy`, `access-admin`, `simple-login`) cùng giao diện. **Không chỉ kéo thả HTML hoặc thư mục dist**, vì thao tác BCS cần máy chủ.
6. Trên đúng dự án Firebase đang dùng, cập nhật và Publish nội dung `firestore.rules`. Không mở quyền ghi toàn bộ lớp cho BCS.
7. Đóng tab cũ, mở lại website/đăng nhập lại trên các máy, rồi kiểm tra theo danh sách bên dưới trước khi cho cả lớp tiếp tục nhập.

## Kiểm tra trên website sau triển khai

- Mở GVCN và một BCS ở hai trình duyệt/thiết bị khác nhau.
- Nhập một điểm cho học sinh trong phạm vi BCS; kiểm tra điểm trên GVCN và tải lại trang để xác nhận còn dữ liệu.
- Thử gửi lại yêu cầu khi mạng chập chờn; xác nhận không cộng điểm lần hai.
- Thử tài khoản tổ: không xem/ghi được học sinh ngoài tổ.
- Sửa điểm học tập rồi xóa điểm; kiểm tra điểm tích chỉ thay đổi phần chênh lệch.
- Kiểm tra đề xuất tổ được GVCN duyệt đúng một lần.
- Nếu hai GVCN cùng sửa từ một bản cũ, một lượt có thể bị yêu cầu đối chiếu. Không bỏ qua cảnh báo hay nhập chồng lên bản nháp.

## Kết quả kiểm tra trong môi trường sửa mã

- 41/41 kiểm thử tập trung: `node --test tests/score-sync.test.mjs tests/deputy.test.mjs tests/sync-routing.test.mjs`.
- `npm run build`: đạt kiểm tra cú pháp, cấu trúc HTML và Firebase runtime smoke test.
- Build tại môi trường sửa không có cấu hình Firebase thật. Không dùng cấu hình trống này cho website; Netlify cần build lại bằng các biến môi trường hiện có.
- Lần chạy bộ kiểm thử toàn dự án trước phần bổ sung phân quyền: 147 ca, 91 đạt, 56 lỗi. Tất cả tên ca lỗi còn lại cũng đã lỗi trên bản nguồn gốc; phần lớn liên quan bộ giả lập UI cũ/không đủ stub. Không khẳng định toàn bộ ứng dụng đã được kiểm thử đạt.
- Chưa đăng nhập kiểm tra dữ liệu thật, chưa deploy Netlify/Firebase, chưa chạy Firestore Emulator. Cần thực hiện kiểm tra trên website như trên sau triển khai.

Các file sửa chính: `index.html`, `firebase-secure.js`, `to-pho.js`, `server/deputy-service.mjs`, `server/academic-score.mjs`, `server/access-service.mjs`, `firestore.rules`, `scripts/build.mjs` và các kiểm thử liên quan.

## Bổ sung: đúng học sinh — đúng chức vụ (lớp phó lao động)

- Đổi người giữ chức vụ tại Phân quyền được thực hiện trên máy chủ, cùng lúc cập nhật chức danh và trạng thái tài khoản cán bộ liên quan.
- Tài khoản gắn với mã học sinh, không gắn với tên chức vụ. Không chuyển mật khẩu của em cũ cho em mới. Sau khi phân công, GVCN cấp mật khẩu riêng cho học sinh mới nếu chưa có tài khoản BCS. Nếu tài khoản em mới đang bị khóa, GVCN chủ động mở lại sau khi kiểm tra.
- Em cũ mất chức vụ vừa chuyển; nếu không còn chức vụ BCS nào thì tài khoản BCS bị khóa. Nếu còn chức vụ khác, chỉ giữ quyền theo phân công hiện tại. Phiên đăng nhập cũ phải đăng nhập lại.
- Tên trên cổng BCS và lịch sử ghi mới được lấy từ học sinh có đúng studentId, thay vì tên sao chép trong membership có thể đã cũ. Không sửa tên trong lịch sử quá khứ.
- Sửa hồ sơ/tên/chức danh hiển thị của một học sinh không được tự chiếm phân quyền đang gán cho học sinh khác. Phân công để trống không tự khôi phục từ chức danh cũ.
- Nút đồng bộ tài khoản hiện có cập nhật tên cán bộ theo danh sách lớp mà không đổi mã học sinh/mật khẩu.

Sau triển khai, vào Phân quyền, chọn đúng học sinh cho **Lớp phó lao động**. Kiểm tra tài khoản BCS của em mới và đăng nhập thử bằng mật khẩu riêng của em đó. Nếu vẫn thấy tên khác, cần đối chiếu tên đúng, tên đang hiện và mã học sinh trong tài khoản; chưa có bằng chứng để tự đổi liên kết dữ liệu thật trong Firebase.

Kiểm thử bổ sung: chuyển lớp phó lao động, chặn mật khẩu cũ sau thu hồi, không chuyển mật khẩu sang em mới, giữ chức vụ khác hợp lệ, từ chối phân công từ màn hình cũ, lấy đúng tên theo mã học sinh và chỉ gửi phân công sau khi lưu được dữ liệu lớp.
