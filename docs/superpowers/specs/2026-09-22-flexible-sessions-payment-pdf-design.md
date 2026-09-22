# Lịch học linh hoạt, thanh toán gộp và PDF có QR — Đặc tả

## Mục tiêu

Giảm thao tác khi quản lý gia sư: mọi buổi học mới mặc định là `completed`, thanh toán toàn bộ công nợ của một học sinh bằng một lần bấm, lịch lặp tạo ra các buổi độc lập nhưng vẫn có thể sửa/hủy từng buổi hoặc cả chuỗi, và báo cáo PDF luôn lấy dữ liệu mới nhất kèm QR thanh toán sạch.

## Phạm vi và quyết định

- Áp dụng mặc định `completed` cho mọi buổi tạo mới, gồm cả buổi đơn và buổi sinh từ lịch lặp.
- Không tự chuyển các buổi cũ đang `scheduled`; dữ liệu hiện có được giữ nguyên.
- Vẫn giữ trạng thái `scheduled` để người dùng có thể đổi lại khi cần, và giữ `cancelled` để hủy buổi.
- Thanh toán gộp chỉ cập nhật các buổi `completed` chưa thanh toán của đúng học sinh; buổi hủy không được tính công nợ.
- Lịch lặp được lưu thành các session độc lập. Mỗi session có `series_id` tùy chọn và có thể sửa/xóa riêng. Các thao tác theo chuỗi là thao tác lặp qua các session cùng `series_id`, không khóa dữ liệu vào một rule không thể đảo ngược.
- Hỗ trợ tần suất `none`, `daily`, `weekly`, `monthly`; ngày kết thúc là bắt buộc khi chọn lặp để tránh sinh vô hạn.
- Cấu hình thanh toán lưu theo tài khoản trong `user_settings`: ngân hàng, số tài khoản, tên chủ tài khoản. Giá trị mặc định là MB / 0976406248 / NGUYEN THI THU HUONG nhưng có thể sửa.
- PDF đọc lại student, sessions, notes, balance và settings sau khi người dùng bấm xuất. QR được tạo từ cấu hình hiện thời bằng URL ảnh VietQR, không nhúng nguyên ảnh mẫu; nếu QR không tải được, PDF vẫn xuất và hiện thông tin tài khoản dạng chữ.

## Luồng dữ liệu

1. Form thêm buổi nhận student, ngày, giờ, trạng thái mặc định hoàn thành, và tùy chọn lịch lặp.
2. App tạo các session độc lập, gắn cùng `series_id` khi là một chuỗi.
3. Chi tiết học sinh hiển thị nút thanh toán gộp; Store cập nhật `paid=true` cho các session hoàn thành chưa thanh toán của học sinh.
4. PDF reload dữ liệu và dựng phần thanh toán/QR từ settings mới nhất.

## Tương thích dữ liệu

- Schema dùng `alter table ... add column if not exists` cho các cột mới.
- Các bản ghi hiện tại có `series_id` null và vẫn hoạt động.
- Settings cũ không có cấu hình thanh toán sẽ nhận giá trị mặc định ở lớp Store.

## Tiêu chí nghiệm thu

- Tạo một buổi mới thấy ngay trạng thái Hoàn thành và được tính học phí.
- Tạo chuỗi theo tuần/tháng/ngày sinh đúng các ngày trong khoảng chọn, không sinh ngoài khoảng.
- Sửa/hủy/xóa từng buổi trong chuỗi được; sửa/xóa theo chuỗi chỉ tác động đúng các buổi cùng chuỗi.
- Một nút thanh toán gộp đưa công nợ học sinh về 0 và PDF phản ánh ngay sau lần xuất tiếp theo.
- PDF có QR và ba trường thông tin tài khoản hiện thời; không chứa ảnh nền/thẻ ngân hàng nguyên bản.
- Không có dữ liệu cũ bị mất khi chạy schema nâng cấp.
