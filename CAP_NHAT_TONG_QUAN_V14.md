# Bản v14 — Học sinh cần chú ý

Bộ lọc chung của widget Tổng quan và danh sách Xem tất cả chỉ chọn điểm hiện tại âm hoặc cờ needsAttention bằng true. Không còn so sánh với mức trung bình lớp để đưa điểm 0/điểm dương thấp vào danh sách. Các lần vi phạm trước reset không tự làm học sinh điểm 0 xuất hiện trở lại.

Loại bản ghi points-reset, danger-reset, Hệ thống, lý do Đặt lại điểm và bản ghi đã chốt tuần khỏi thống kê phạt dùng để xếp mức độ chú ý. Không sửa điểm hoặc lịch sử gốc.

Nếu dữ liệu có needsAttention:true, học sinh vẫn được chọn dù điểm 0/dương; attentionReason là nội dung hiển thị. Bản này chỉ hỗ trợ đọc cờ rõ ràng này, không bổ sung giao diện nhập đánh dấu và không suy diễn đánh dấu từ ghi chú tự do.

Bốn kiểm thử bộ lọc và build đạt. Cần triển khai bản mới, kiểm tra reset điểm về 0, học sinh điểm âm và danh sách Xem tất cả trên website thực tế. Các giới hạn phân quyền và yêu cầu triển khai Functions/Rules từ v12–v13 vẫn giữ nguyên.
