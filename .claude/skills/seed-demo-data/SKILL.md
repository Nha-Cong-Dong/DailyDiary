---
name: seed-demo-data
description: Sinh dữ liệu nhật ký mẫu cho DailyDiary để demo lịch tháng, thống kê và Year in Pixels.
disable-model-invocation: true
argument-hint: "[số tháng]"
---

Sinh dữ liệu mẫu cho số tháng gần nhất sau: $ARGUMENTS (nếu không có, dùng 3 tháng). Ghi script vào `apps/api/scripts/seed_demo.py` (dùng `app.db.client.make_client` và cấu hình của api) và nạp vào DB local bằng `cd apps/api && uv run python scripts/seed_demo.py`. Chỉ ghi vào DB `dailydiary` local; từ chối chạy nếu `MONGODB_URI` không trỏ tới `localhost`.

Yêu cầu dữ liệu:
- Một người dùng demo, múi giờ `Asia/Ho_Chi_Minh`.
- Khoảng 75–85% số ngày có nhật ký; vài chuỗi ngày liên tiếp dài và vài khoảng trống.
- Điểm 1–5 phân bố tự nhiên (nhiều 3–4, ít 1 và 5), có xu hướng tăng nhẹ theo thời gian.
- Khoảng 60% ngày có sub icon, 40% có cờ hiệu, 30% có 1–3 ảnh mẫu, 50% có 1–4 từ khóa tiếng Việt có dấu.
- Một phần nhật ký chỉ có điểm (không có chữ) để kiểm tra điều kiện "đã ghi".
- Có cả bài "ghi đúng ngày" và "cập nhật muộn".
- Chỉ dùng mã biểu tượng, sub icon, màu cờ có trong `shared/`.
- Nội dung là văn bản tự viết, ngắn, không chứa thông tin thật của ai.

Script phải chạy lại được nhiều lần (xóa dữ liệu demo cũ trước khi nạp).
