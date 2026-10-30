# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Người Việt từ 16 tuổi muốn giữ thói quen ghi lại cuộc sống. Hai khoảnh khắc chính, ngang nhau:

- **Buổi tối, trên điện thoại:** viết vài dòng trước khi ngủ, thường trên giường, ánh sáng yếu.
- **Rải rác trong ngày, trên điện thoại:** chấm điểm tâm trạng nhanh, ghi chú ngắn, thêm ảnh.

Máy tính dùng được và có bố cục riêng, chủ yếu để viết dài và nhìn lại theo tháng/năm.

## Product Purpose

Jotly là nhật ký cá nhân trên web: mỗi ngày một trang, chấm điểm tâm trạng 1–5 trong một chạm, thêm chữ, từ khóa, ảnh;
nhìn lại qua dòng thời gian, lịch tháng, Year in Pixels; chia sẻ từng trang qua link chỉ xem. Mục tiêu là thay thói
quen "dopamine nhanh" bằng một thói quen nhỏ, lành mạnh và bền. Thành công: người dùng còn ghi sau 7 và 30 ngày, ghi
nhiều ngày mỗi tuần, ghi đúng ngày.

## Positioning

Một chạm là đủ cho một ngày: điểm tâm trạng bằng biểu tượng vẽ tay là đơn vị ghi chép chính, chữ và ảnh là phần thêm.
Riêng tư theo thiết kế (không log nội dung, kho ảnh riêng tư), tiếng Việt, ngày theo múi giờ của người dùng.

## Operating Context

Màn chính: Hôm nay, chi tiết/sửa ngày, ghi bù, Dòng thời gian (danh sách theo tháng + lịch + nhịp điểm), Year in
Pixels, Tìm kiếm, Hồ sơ (cài đặt, link chia sẻ, thùng rác), onboarding 3 bước, đăng nhập Google, trang chia sẻ công
khai, trang chủ giới thiệu, chính sách quyền riêng tư. Điện thoại từ 360 px có thanh tab dưới; máy tính có thanh tab trên.

## Capabilities and Constraints

- React 19 + Vite + Tailwind CSS 4 + shadcn/ui (Radix), không thư viện animation JS. Chế độ sáng/tối/theo hệ thống/theo giờ.
- Giới hạn số chỉ đọc từ `shared/limits.json`; biểu tượng và màu cờ từ `shared/icons.json`, `shared/flag_colors.json`.
- Font phải hỗ trợ đầy đủ tiếng Việt; font tự host, cắt còn ký tự Việt + Latin (`apps/web/scripts/subset_fonts.py`).
- Hiệu năng: LCP < 2,5 s, INP < 200 ms, CLS < 0,1 trên điện thoại.
- Không theme, sticker, trò chơi hóa trong phạm vi hiện tại.

## Brand Commitments

- Tên **Jotly**; khẩu hiệu "Chạm để ghi chú, mở để nhìn lại."
- **Phong cách Neo Brutalism (bắt buộc, 30/10/2026):** viền mực dày, bóng cứng lệch không nhòe, mặt phẳng màu. Đã cân
  nhắc thay bằng hướng khác và người dùng từ chối; mọi thay đổi giao diện là tinh chỉnh trên phong cách này.
- **Logo giữ nguyên:** biểu tượng cuốn sổ (bìa sage `#B3BCA1` + oải hương `#CBAAC7`, tim và bút đào `#F1BD90`, nét mực
  `#272218`) và chữ "Jotly" Young Serif.
- **Màu light mode lấy từ logo**, nền trắng ấm `#FFFCF8`.
- **Font giao diện: Commissioner** (thay Be Vietnam Pro và Lora).
- **Giữ nguyên:** bộ biểu tượng tâm trạng (6 bộ main icon vẽ tay + 47 sub icon) và 8 màu cờ + màu tự thêm.
- **Không được:** trẻ con hoặc trò chơi hóa; lạnh như app công việc; hoài cổ sách vở (giấy kem, serif nghiêng, đèn vàng);
  rối, nhiều hiệu ứng.

## Evidence on Hand

Nội dung thật của sản phẩm: chữ trên giao diện tiếng Việt, biểu tượng SVG trong `apps/web/src/components/diary/ScoreIcon.tsx`,
chính sách quyền riêng tư `/privacy`. Chưa có lời chứng thực, số liệu người dùng hay báo chí; không được bịa.

## Product Principles

1. Một chạm trước, chữ sau: ghi một ngày phải nhanh hơn mở mạng xã hội.
2. Riêng tư là mặc định, không phải tùy chọn.
3. Nhìn lại phải đẹp hơn ghi: dữ liệu tích lũy (lịch, pixels) là phần thưởng duy nhất, không huy hiệu.
4. Yên tĩnh khi viết: giao diện lùi lại khi người dùng gõ.

## Accessibility & Inclusion

Tương phản WCAG AA cho chữ; vùng chạm tối thiểu 44 px; tôn trọng `prefers-reduced-motion`; dùng tốt trong bóng tối
(chế độ tối) và trên màn hình 360 px.
