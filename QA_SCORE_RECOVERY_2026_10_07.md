# Bổ sung bản sửa lưu điểm BCS — 07/10/2026

Áp dụng trên nền 85b376c của repository đang kết nối coruscating-kitten-542ce9. Giữ bản sửa phân biệt lưu thành công/tải lại thất bại và khóa biểu mẫu trong lúc đang tải của 022409b.

Bổ sung: giữ đúng điểm âm khi lý do có chữ “giơ tay phát biểu”; chỉ quy đổi +2 cho mẫu thành tích dương phù hợp. API giao diện phải xác nhận saved=true trước khi báo đã lưu. Lượt nhập mới đã bấm gửi nhưng chưa được xác nhận được giữ trong sessionStorage theo app/lớp/UID, khôi phục với cùng requestId sau tải lại trong cùng tab để tránh cộng/trừ lần hai. Chỉ khôi phục khi phạm vi và quyền hiện tại còn hợp lệ. Trình duyệt chặn storage vẫn lưu được, nhưng không khôi phục qua tải lại. Chủ động làm mới chỉ bỏ bản nháp sau khi đọc dữ liệu thành công.

Kiểm thử bằng DOM và dịch vụ giao dịch giả lập: tạo/phân công cán sự, cấp mật khẩu, đăng nhập, +5/-3, đăng nhập lại đọc điểm/lịch sử; mất phản hồi rồi tải lại/gửi lại không ghi trùng; từ chối phản hồi thiếu saved; giữ bản nháp khi refresh thất bại; lưu bình thường khi storage bị chặn; các kiểm thử nền về ghi thành công/đọc thất bại vẫn được giữ.

Đây là kiểm thử dữ liệu giả, chưa phải xác minh học sinh thật trên Firebase production. Toàn dự án còn 57 ca thất bại cũ được ghi trong QA_2026_10_07.md. Không thay Firestore Rules, dữ liệu lớp hoặc cấu hình Firebase.
