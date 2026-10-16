---
name: date-timezone-rules
description: Quy tắc ngày và múi giờ của DailyDiary. Dùng mỗi khi code đụng tới entry_date, created_at, updated_at, múi giờ người dùng, lịch tháng, Year in Pixels, chuỗi ngày liên tiếp, nhãn "ghi đúng ngày"/"cập nhật muộn", hoặc khi sửa lỗi bài viết rơi vào sai ngày.
---

# Quy tắc ngày và múi giờ

## Lưu trữ
- `entries.entry_date` (kiểu `date`): ngày **địa phương** theo `users.timezone` (IANA, vd `Asia/Ho_Chi_Minh`).
- `created_at`, `updated_at`, `deleted_at`: `timestamptz`, luôn lưu UTC.
- Không bao giờ suy ra `entry_date` bằng `datetime.utcnow().date()` hay `new Date().toISOString().slice(0,10)`.

## Tính "hôm nay"
- Backend: `datetime.now(ZoneInfo(user.timezone)).date()`.
- Frontend: dùng `date-fns-tz` với múi giờ trong hồ sơ người dùng, không dùng múi giờ máy.
- Backend từ chối `entry_date` lớn hơn "hôm nay" của người dùng (lỗi 422).

## Nhãn ghi đúng ngày
- "Ghi đúng ngày" khi `updated_at` đổi sang múi giờ người dùng có cùng ngày với `entry_date`; ngược lại là "cập nhật muộn".

## Đổi múi giờ
- Chỉ áp dụng cho các ngày từ sau thời điểm đổi; không tính lại `entry_date` cũ.

## Test bắt buộc khi đụng logic ngày
- 23:59 và 00:01 giờ địa phương (UTC+7) → đúng ngày.
- 06:00 sáng giờ Việt Nam (vẫn là ngày hôm trước theo UTC) → vẫn là ngày hôm nay.
- Người dùng ở múi giờ âm (vd `America/Los_Angeles`).
- Năm nhuận: Year in Pixels có 366 ô.
