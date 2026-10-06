> **Bản hiện hành 05/10/2026:** xem [CAP_NHAT_DIEM_TRUC_TIEP.md](CAP_NHAT_DIEM_TRUC_TIEP.md). Đã bỏ xét duyệt điểm; các mô tả đề xuất/chờ duyệt trong tài liệu cũ bên dưới không còn áp dụng.

# Ban cán sự: tự động cập nhật quyền

Bản mã nguồn ngày 04/10/2026. Chưa triển khai lên website thật.

## Hành vi mới

- Giữ header có avatar, chức vụ và đăng xuất; banner mềm mại; thẻ gradient bo tròn có icon. Các thẻ chỉ hiện khi API xác nhận quyền của chức vụ đang chọn.
- Khi GVCN lưu phân công, một tín hiệu phiên bản được ghi cùng giao dịch. Trang học sinh theo dõi tín hiệu này và membership của chính tài khoản, đọc lại phiên và quyền từ máy chủ, rồi cập nhật giao diện. Không cần đăng xuất khi chỉ đổi chức vụ.
- Nếu chức vụ đang chọn vẫn hợp lệ, giữ nguyên lựa chọn. Nếu bị gỡ, tự chọn chức vụ hợp lệ còn lại. Không cộng gộp quyền của nhiều chức vụ.
- Khi chưa có chức vụ hợp lệ, hiển thị khung chờ có Làm mới dữ liệu, Đăng nhập lại và Về trang đăng nhập. Trang tự mở nội dung khi nhận được phân công hợp lệ. Không tự cấp quyền cho học sinh chưa được phân công.
- Đổi phân công không đổi accessVersion. Khóa tài khoản hoặc đổi mật khẩu vẫn vô hiệu hóa phiên cũ, cần xác thực lại. Tài khoản chưa từng được cấp thông tin đăng nhập vẫn cần được GVCN cấp tài khoản riêng; không chuyển mật khẩu của cán bộ cũ cho cán bộ mới.
- Bản nháp chưa gửi được giữ nếu quyền/phạm vi không đổi. Nếu quyền đổi, đóng biểu mẫu cũ và thông báo để tránh gửi sai phạm vi. Không tự gửi lại thao tác ghi điểm.
- Có đọc lại dự phòng mỗi 15 giây khi trang hiện và không đang thao tác; màn hình chờ phân công tiếp tục tự thử lại. Khi mất mạng, cần kết nối lại để nhận cập nhật. Máy chủ luôn kiểm tra phân công mới trên từng yêu cầu ghi.

## Kỹ thuật

`server/access-service.mjs`: tách hiệu lực credential (accessVersion) khỏi thay đổi chức vụ (permissionRevision); giữ tài khoản BCS có thể chờ phân công, chặn dữ liệu bằng quyền thực tế; phát tín hiệu khi lưu phân công.

`firebase-secure.js`: theo dõi membership và `artifacts/{appId}/classes/{classId}/permissionSignals/current`; GVCN ghi tín hiệu phiên bản trong cùng transaction với dữ liệu lớp. Tín hiệu chỉ chứa revision và updatedAt, không chứa danh sách học sinh. Làm mới token không được dùng để vượt qua việc khóa/đổi mật khẩu.

`to-pho.js`: nhận tín hiệu, đọc lại quyền, giữ chức vụ còn hợp lệ hoặc chọn lại khi cần; phục hồi tự động; hủy listener/timer khi thoát.

`server/deputy-service.mjs`: xác minh studentId, roleKey, chức vụ đang hoạt động và phạm vi trên máy chủ. Tài khoản không được phép đọc toàn bộ state của lớp qua Firestore.

`firestore.rules`: cho thành viên phù hợp đọc tín hiệu; chỉ GVCN được ghi tín hiệu. Không mở quyền đọc state cho BCS.

## Triển khai bắt buộc

1. Sao lưu mã nguồn và Rules đang dùng.
2. Cập nhật Firestore Rules bằng toàn bộ nội dung file `firestore.rules` trong gói. Giữ đúng dự án Firebase hiện tại. Phải cập nhật Rules trước khi frontend mới bắt đầu ghi tín hiệu, nếu không transaction lưu của GVCN có thể bị từ chối.
3. Đưa toàn bộ mã nguồn trong gói lên dự án Netlify đang dùng, bao gồm server, netlify/functions, scripts, JavaScript, CSS và index.html. Giữ các biến môi trường hiện có; build bằng `npm run build`, publish `dist`, dùng thư mục Functions đã khai báo trong netlify.toml. Không chỉ tải index.html hoặc bản dist được build thiếu cấu hình.
4. Build lại với cấu hình Firebase/Functions hiện có trên Netlify. Tải lại trang GVCN và học sinh để nhận script mới.
5. Thử bằng hai phiên: GVCN đổi phân công, học sinh đang mở trang phải đổi thẻ/phạm vi tự động. Gỡ toàn bộ chức vụ phải ẩn nội dung; gán lại phải tự mở. Thử cả chuyển tổ, nhiều chức vụ, đổi mật khẩu và mất mạng/kết nối lại.

Không cần xóa dữ liệu lớp hoặc tự sửa token trong Firebase. Tín hiệu được tạo tự động khi GVCN lưu. Những phiên đã bị vô hiệu hóa bởi phiên bản cũ hoặc tài khoản bị khóa thực sự cần đăng nhập lại sau khi GVCN cấp lại quyền đăng nhập phù hợp.

## Kiểm chứng và giới hạn

68/68 kiểm thử liên quan đạt: phân quyền máy chủ, giao diện DOM, chuyển chức vụ, phục hồi tự động, giữ bản nháp khi quyền không đổi, thu hồi quyền và phiên credential, giao dịch đồng bộ điểm. Kết quả trong KET_QUA_KIEM_THU_DONG_BO.txt. Build, cú pháp và kiểm tra tương thích Firebase runtime đạt.

Đây là kiểm thử bằng dữ liệu mô phỏng, chưa phải kiểm thử tích hợp Firebase/Netlify thật; chưa chạy Rules bằng Firebase Emulator hoặc kiểm tra trực quan trên điện thoại thật. Build cục bộ không có FIREBASE_CONFIG_JSON nên không dùng dist cục bộ để triển khai; phải build tại môi trường có cấu hình. Không khẳng định toàn bộ bộ kiểm thử lịch sử của ứng dụng đạt.

Mở XEM_TRUOC_BAN_CAN_SU.html để xem mẫu giao diện bằng dữ liệu giả lập, không kết nối lớp thật.
