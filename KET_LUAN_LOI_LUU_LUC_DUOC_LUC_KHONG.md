# Kiểm tra hiện tượng lưu lúc được, lúc không — 04/10/2026

## Phạm vi và bằng chứng

Đã mở website https://tangerine-faloodeh-15216b.netlify.app/ bằng trình duyệt thử nghiệm. Trang đăng nhập GVCN tải được. Sau bước đăng nhập bảo mật, điều hướng lại vẫn hiện trang đăng nhập, nên chưa có bằng chứng về một phiên GVCN đã đăng nhập thành công. Không nhập/sửa điểm hay dữ liệu thật, không thay Netlify/Firebase. Chưa xác minh website đã triển khai đúng bản ZIP đang kiểm tra hoặc Rules nào đang chạy.

Đã kiểm tra mã nguồn trong ZIP `so-tay-gvcn-7n-da-sua-dong-bo-2.zip`. Ba ca kiểm thử hồi quy mới đều thất bại trên mã gốc của ZIP. Sau sửa, 46/46 ca trong nhóm đồng bộ/phân quyền/phục hồi đạt, kiểm tra cú pháp và cấu trúc HTML đạt.

## Các lỗi xác nhận trong mã nguồn

### 1. Mở lại trang có bản nháp: không thiết lập mốc dữ liệu máy chủ

Khi mở lại trang và Firebase trả về đúng dữ liệu nền của bản nháp, ứng dụng khôi phục nội dung nhập nhưng không cập nhật `lastSavedStateSignature` và `cloudStateScoreRevision`.

Hệ quả: hàm tự đồng bộ nhìn thấy bản nháp nhưng cho rằng chưa nhận dữ liệu máy chủ, rồi tiếp tục hẹn thử lại. Nếu đi qua đường lưu khác, số phiên bản có thể vẫn bằng 0 và bị máy chủ từ chối vì bản mới hơn.

Tái hiện bằng kiểm thử: bản máy chủ revision 7, điểm 10; bản nháp điểm 12, cùng dữ liệu nền. Trước sửa: mốc dữ liệu vẫn trống. Sau sửa: khôi phục mốc đã được máy chủ xác nhận và bản nháp đi tới hàm ghi.

### 2. Xung đột khi ghi bị xử lý nhầm là lỗi mạng

Nhánh xử lý `cloud/revision-conflict` của bản sửa trước nằm nhầm trong callback lỗi đọc dữ liệu, thay vì khối bắt lỗi của `saveData`. Khi hai thiết bị ghi cùng lúc, giao dịch bảo vệ dữ liệu đúng cách nhưng giao diện lại xếp lỗi vào nhóm kết nối gián đoạn, tiếp tục thử lại và không đưa ra hướng xử lý xung đột đúng.

Đã chuyển nhánh này về đúng luồng lưu. Xung đột giữ bản nháp, dừng tự thử lại và hiển thị cách tải bản nháp/nạp dữ liệu mới. Không tự ghi đè dữ liệu của thiết bị khác.

### 3. Bản cache có thể được dùng như xác nhận của máy chủ

Đường khôi phục bản nháp chưa tách snapshot từ cache/local echo khỏi snapshot đã được máy chủ xác nhận. Đã bổ sung điều kiện: có thể hiển thị bản nháp khi chưa có mạng nhưng chỉ thiết lập mốc và tự lưu sau khi máy chủ xác nhận.

### 4. Một số nút báo thành công trước khi máy chủ xác nhận

Phần nhận xét GVCN và hồ sơ học sinh gọi hàm lưu bất đồng bộ rồi hiện “đã lưu thành công” ngay. Nếu mất mạng, lỗi quyền hoặc xung đột, thông báo gây hiểu nhầm rằng dữ liệu đã lên Firebase. Đã sửa hai luồng này để chờ kết quả và hiển thị trạng thái thực tế. Nhãn trạng thái đồng bộ cũng được cho hiển thị trên màn hình nhỏ.

Vẫn còn các thao tác khác trong ứng dụng dùng `void saveData` hoặc không chờ kết quả (ví dụ một số thao tác trò chơi/cài đặt). Không khẳng định đã rà soát và sửa mọi thông báo của toàn ứng dụng.

## Lưu ý về kết luận

Các lỗi trên có thể giải thích tình trạng cô gặp, đặc biệt khi từng mất mạng, tải lại trang hoặc dùng nhiều thiết bị. Chưa thể khẳng định đó là nguyên nhân duy nhất trên website thật; cần xem trạng thái và lỗi của đúng thao tác đang thất bại sau khi đăng nhập được. Chưa xác nhận lỗi Rules, hết hạn tài khoản hay mất mạng trên phiên của cô.

## Triển khai và kiểm tra lại

Bản ZIP này giữ các sửa đổi phân quyền và đồng bộ trước, bổ sung sửa lỗi phục hồi trong `index.html`, thêm kiểm thử và báo cáo này. Nếu website đã triển khai đầy đủ chính xác bản ZIP trước thì thay đổi chức năng bổ sung lần này nằm ở `index.html`; vẫn cần build/deploy từ dự án hiện có. Nếu trước đó chỉ cập nhật HTML thì phải triển khai đầy đủ mã nguồn và Functions theo `HUONG_DAN_BAN_SUA_DONG_BO.md`.

Không thay đổi thêm `firestore.rules` trong lần bổ sung này. Không xóa dữ liệu lớp, bản nháp hay tạo lại tài khoản để chữa lỗi.

Trên dữ liệu thử được cho phép, cần thử: lưu bình thường rồi tải lại; nhập khi mất mạng rồi nối lại; mở lại trang còn bản nháp; và hai thiết bị cùng sửa. Chỉ công nhận đã lưu lên máy chủ khi thông báo đồng bộ xác nhận và dữ liệu vẫn còn sau khi tải lại.

Lệnh kiểm tra đã chạy:

```
node --test tests/pending-recovery.test.mjs tests/deputy.test.mjs tests/score-sync.test.mjs tests/sync-routing.test.mjs
node scripts/build.mjs --check
```

Bộ kiểm thử toàn dự án từng có các lỗi có sẵn như ghi trong hướng dẫn trước; lần này chỉ chạy nhóm liên quan và kiểm tra cú pháp, không tuyên bố toàn bộ ứng dụng đạt kiểm thử.
