# Chỉ dẫn bảo mật cho DailyDiary

DailyDiary là app nhật ký cá nhân; nội dung, ảnh và từ khóa là dữ liệu rất nhạy cảm.

## Mô hình đe dọa chính
- Người dùng A đọc/sửa/xóa nhật ký, ảnh của người dùng B bằng cách đổi ID hoặc ngày trong request (IDOR).
- Nội dung nhật ký bị lộ qua log, Sentry, công cụ phân tích hoặc thông báo lỗi.
- Ảnh bị truy cập công khai qua link không hết hạn.
- Đánh cắp phiên đăng nhập.

## Quy tắc bắt buộc
- Mọi truy vấn tới entries, entry_photos, entry_keywords, user_items phải lọc theo user_id lấy từ phiên đăng nhập, không lấy từ body/query.
- Tài nguyên không thuộc người dùng trả 404.
- Không log tiêu đề, nội dung, từ khóa, tên file ảnh, hay toàn bộ request body.
- Kho ảnh riêng tư; chỉ trả presigned URL hết hạn khoảng 1 giờ; đường dẫn bắt đầu bằng user_id/.
- Cookie phiên: HttpOnly, Secure, SameSite=Lax; request ghi có chống CSRF.
- Không viết cứng secret; đọc từ biến môi trường.
- Mỗi endpoint có test truy cập chéo tài khoản.
