---
name: privacy-check
description: Rà soát quyền riêng tư và phân quyền dữ liệu của DailyDiary. Dùng trước khi commit hoặc review bất kỳ thay đổi nào chạm tới API nhật ký, ảnh, đăng nhập, log, Sentry, phân tích sự kiện hoặc truy vấn cơ sở dữ liệu.
---

# Kiểm tra quyền riêng tư

Rà từng mục trên các file thay đổi (`git diff`), báo cáo dạng: mục – đạt/không đạt – vị trí – cách sửa.

1. **Lọc theo người dùng**: mọi truy vấn tới `entries`, `entry_photos`, `entry_keywords`, `user_items` đều có điều kiện `user_id` lấy từ phiên đăng nhập, không lấy từ tham số request.
2. **Không lộ qua ID**: endpoint nhận `id` ảnh/nhật ký phải kiểm tra quyền sở hữu, trả 404 (không phải 403) khi không thuộc người dùng.
3. **Ảnh**: kho ảnh riêng tư; chỉ trả link có thời hạn (khoảng 1 giờ); đường dẫn bắt đầu bằng `user_id/`.
4. **Log và Sentry**: không ghi tiêu đề, nội dung, từ khóa, tên file ảnh; không log toàn bộ request body.
5. **Phân tích sự kiện**: chỉ gửi tên sự kiện và số liệu, không gửi nội dung.
6. **Cookie phiên**: `HttpOnly`, `Secure`, `SameSite=Lax`; request ghi có chống CSRF.
7. **Xóa tài khoản**: xóa cả dữ liệu DB lẫn file trong kho ảnh.
8. **Test**: có test tài khoản A truy cập dữ liệu của B và bị từ chối.
