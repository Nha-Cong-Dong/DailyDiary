# 0002. Phiên đăng nhập lưu trong DB, cookie HttpOnly + CSRF double-submit

- Trạng thái: Chấp nhận
- Ngày: 16/10/2026
- Liên quan: MVP_Plan.md Q4 · Project_Specs.md mục 4.1, 5.4 · skill `fastapi-backend` (`auth-google-cookie.md`)

## Bối cảnh

Đặc tả yêu cầu phiên 30 ngày trong cookie `HttpOnly`, `Secure`, `SameSite=Lax`, có chống CSRF cho request ghi,
và xóa tài khoản phải xóa toàn bộ dữ liệu.

## Quyết định

- Cookie `dd_session` chứa token ngẫu nhiên; collection `user_sessions` chỉ lưu SHA-256 của token, có TTL index.
- Cookie `dd_csrf` (không HttpOnly) + header `X-CSRF-Token` phải khớp, cộng kiểm tra `Origin`, cho mọi request ghi
  có cookie phiên. Sai trả `403 CSRF_FAILED`; không có phiên thì trả 401.
- Cookie `dd_oauth` riêng (SessionMiddleware, 10 phút) chỉ dùng cho luồng OAuth.
- Kho ảnh dùng hai endpoint: `S3_ENDPOINT_URL` (backend gọi) và `S3_PUBLIC_ENDPOINT_URL` (ký URL cho trình duyệt).

## Hệ quả

- Đăng xuất và xóa tài khoản thu hồi phiên ngay lập tức (không như JWT tự chứa).
- Mỗi request có xác thực đọc DB một lần để kiểm tra phiên.
- Production cần frontend và API chung tên miền gốc để cookie hoạt động.
