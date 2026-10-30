# Jotly – Hệ thiết kế

|                |                                                                                                   |
| -------------- | ------------------------------------------------------------------------------------------------- |
| **Phiên bản**  | 1.1 (đang triển khai theo giai đoạn ở mục 9; xong giai đoạn 1–4)                                   |
| **Cập nhật**   | 30/10/2026                                                                                        |
| **Bản trực quan** | Trang hệ thiết kế có bản chạy thử từng component: https://claude.ai/artifact/5XQcMY3cAg23QNpz8qy4og |
| **Liên quan**  | Người dùng, mục đích, cam kết thương hiệu: [`PRODUCT.md`](PRODUCT.md) · Màn hình và tính năng: [`docs/Project_Specs.md`](docs/Project_Specs.md) |

Tài liệu này là nguồn của token, quy tắc giao diện và chuyển động. Khi code đã đổi theo một mục, code là đúng; khi hai
bên lệch nhau, sửa bên lệch trong cùng PR.

## 1. Ý tưởng

Jotly giữ phong cách **Neo Brutalism**. Logo là một cuốn sổ mở (bìa trái sage, bìa phải oải hương, tim và bút màu đào,
nét mực nâu đen) và cả hệ thiết kế đi ra từ vật đó:

- **Mỗi vật thể là một tờ giấy dán lên trang:** nền `card`, viền `stroke` 1,5px, bóng cứng lệch xuống phải. Ấn vào thì
  tờ giấy dịch xuống đúng bằng độ lệch bóng và bóng biến mất.
- **Ba màu bìa sổ có nghĩa cố định:** đào là "bây giờ, việc chính"; sage là "đã lưu"; oải hương là "đang chọn, đã qua".
- **Ngày, tháng, năm là cùng một dữ liệu ở ba tỉ lệ.** Chuyển động nối component chỉ để cho thấy mối nối này.

## 2. Màu

| Token | Sáng | Tối | Dùng cho |
| --- | --- | --- | --- |
| `paper` | `#FFFCF8` | `#14110D` | nền trang |
| `card` | `#FFFFFF` | `#1D1A15` | thẻ, ngăn kéo, ô nhập, menu |
| `sunk` | `#F5EFE6` | `#0E0C08` | rãnh điều khiển phân đoạn, ô ảnh trống, khung xương |
| `pressed` | `#ECE3D6` | `#36322C` | nền khi di chuột/ấn trên hàng và nút phụ |
| `ink` | `#272218` | `#FEF7EC` | chữ chính |
| `ink-soft` | `#5E574B` | `#B2AA9D` | chữ phụ (≥ 5,5:1 trên mọi nền) |
| `ink-faint` | `#7A7266` | `#8F877A` | gợi ý, placeholder; chỉ trên `paper`/`card` |
| `stroke` | `#272218` | `#BDB4A5` | viền mực |
| `shadow-ink` | `#272218` | `#4F493F` | màu bóng cứng |
| `peach` | `#F1BD90` | `#F1BD90` | màu nhấn duy nhất: bóng nút chính, mốc bây giờ, ô hôm nay, tab đang chọn |
| `peach-soft` / `peach-ink` | `#FCEBDC` / `#9A5520` | `#33261B` / `#F1BD90` | mặt phẳng nhạt / chữ màu đào |
| `sage` | `#B3BCA1` | `#B3BCA1` | đã lưu, thành công |
| `sage-soft` / `sage-ink` | `#E8ECE0` / `#566147` | `#252B1F` / `#B3BCA1` | |
| `lavender` | `#CBAAC7` | `#CBAAC7` | đang chọn, thời gian đã qua |
| `lavender-soft` / `lavender-ink` | `#F2E8F0` / `#7A5575` | `#2E2330` / `#CBAAC7` | |
| `on-accent` | `#272218` | `#272218` | chữ trên `peach`, `sage`, `lavender` |
| `primary` / `on-primary` | `#272218` / `#FFFCF8` | `#FEF7EC` / `#272218` | nút chính |
| `danger` / `danger-soft` | `#A43C33` / `#FFE7E3` | `#E6867A` / `#3A211E` | lỗi, xóa |
| `danger-fill` / `on-danger` | `#A43C33` / `#FFFFFF` | như sáng | nút Xóa vĩnh viễn |
| `focus` | `#272218` | `#FEF7EC` | vòng focus 3px, cách vật 2px |
| `disabled-line` | `#C9C0B2` | `#3F3A33` | viền nét đứt của điều khiển bị tắt |
| `score-1`…`score-5` | giữ nguyên | giữ nguyên | chỉ cho dữ liệu tâm trạng |

Quy tắc:

- Mỗi màn có **một** vùng `peach` nổi bật. `sage` và `lavender` không dùng để trang trí.
- Chữ trên ba màu nhấn luôn là `on-accent`; chữ có màu dùng bản `-ink`.
- Ba màu nhấn nằm dưới 3:1 so với `paper`, nên vật có nền màu luôn có viền `stroke`.
- `score-*` và 8 màu cờ (`shared/flag_colors.json`) chỉ dành cho dữ liệu người dùng. `score-3` thôi làm bóng nút chính.
- Mọi cặp chữ/nền trong bảng đạt WCAG AA ở cả hai chế độ.

## 3. Chữ

Một họ **Commissioner** (biến thiên, trục `wght` 400–800 và `FLAR` 0–100) cho toàn bộ giao diện; **Young Serif** chỉ cho
chữ "Jotly" trong logo. Font tự host, cắt còn ký tự Việt + Latin: một file 40 KB thay 8 file Be Vietnam Pro + Lora
(145 KB). Khi font chưa tải xong, chữ hiện bằng Arial đã chỉnh cỡ và khoảng dòng cho khớp (`Commissioner Fallback`)
để không nhảy chữ.

Trong code: `font-sans` cho chữ thường, `font-heading` (FLAR 60, mặc định cho `h1`–`h3`) cho tiêu đề, `font-display`
(FLAR 100) cho tiêu đề lớn; cỡ chữ là `text-display`, `text-title`, `text-heading`, `text-reading`, `text-body`,
`text-label`.

| Kiểu | Cỡ / dòng | Đậm | FLAR | Dùng cho |
| --- | --- | --- | --- | --- |
| `display` | clamp(40px, 6vw, 64px) / 1,02, tracking -0,03em | 800 | 100 | tiêu đề trang chủ, trang chia sẻ |
| `title` | 30/38 (điện thoại 26/32), tracking -0,015em | 700 | 60 | tiêu đề màn, tiêu đề mục trang chủ |
| `heading` | 22/30 | 600 | 60 | tiêu đề ngày, thẻ, ngăn kéo |
| `reading` | 18/30 | 400 | 0 | nội dung nhật ký, dòng kẻ vở 30px |
| `body` | 16/24 | 400, nút 600 | 0 | chữ giao diện, nút, ô nhập |
| `label` | 13/18 | 600 | 0 | nhãn tab, ngày trong lịch, chú thích |

Không có cỡ nào khác. Không in hoa giãn chữ, không chữ nghiêng hay chữ màu để nhấn một từ trong tiêu đề, không monospace.
Commissioner không có bộ số cùng độ rộng (`tnum`), nên `tabular-nums` không có tác dụng: số cần thẳng cột (lịch, đồng
hồ đếm ngược) đặt trong ô có độ rộng cố định.

## 4. Khoảng cách, bo góc, viền, bóng

- Lưới 4px theo thang Tailwind. Lề hai bên 16px (điện thoại), 32px (máy tính). Vùng chạm tối thiểu 44 × 44px.
- Bo góc: `radius-sm` 8px (ô lịch, chip), `radius-md` 14px (nút, ô nhập), `radius-lg` 22px (thẻ lớn, ngăn kéo),
  `radius-full` chỉ cho ảnh đại diện và vòng chứa main icon.
- Viền: `stroke-width` 1,5px; vòng focus 3px.
- Bóng cứng, không nhòe: `shadow-sm` 2px (chip), `shadow-md` 4px (thẻ, nút phụ), `shadow-lg` 6px (vật đang nổi),
  `shadow-accent` 4px màu `peach` (nút chính, một nút mỗi màn), `shadow-danger`.
- Không gradient, không kính mờ, không phát sáng. Đường kẻ chỉ khi là thứ thật của cuốn sổ (dòng kẻ vở, trục giờ).

## 5. Trạng thái

- Di chuột (chỉ `hover: hover` và `pointer: fine`): nhấc 2px, bóng lên `shadow-lg`.
- Ấn: dịch bằng độ lệch bóng, bóng về 0, 100ms.
- Tắt: nền `sunk`, chữ `ink-faint`, viền nét đứt `disabled-line`, không bóng.
- Đang tải: khối `sunk` phẳng, không dải gradient chạy.
- Trạng thái lưu (Đã lưu, Chưa đồng bộ, Chưa lưu được, Trong thùng rác còn N ngày) dùng component **Stamp**, luôn có
  icon và chữ. Stamp không có chuyển động: trạng thái lưu đổi hàng chục lần khi đang viết.

Component nền trong code (`apps/web/src/components/`):

- `ui/button.tsx`: `cta` (nút chính, bóng đào, một nút mỗi màn), `default` (đặc mực, không bóng), `secondary`,
  `destructive`, `destructive-solid`, `ghost`, `outline`, `link`.
- `ui/card.tsx`: `elevation` = `raised` (4px), `low` (2px), `flat` (trong danh sách dài); `interactive` cho thẻ bấm được.
- `ui/segmented.tsx`: chọn một trong 2–4 mục ngang hàng; mũi tên, Home, End để đổi mục.
- `diary/Stamp.tsx`: `tone` = `saved`, `saving`, `pending`, `error`, `trash`.
- `diary/Toast.tsx`: thông báo nổi, `action` cho nút như Hoàn tác; trượt lên khi hiện, trượt xuống theo đường cũ khi ẩn.
- `diary/BottomSheet.tsx`: trên điện thoại trượt trọn chiều cao từ đáy (`ease-drawer`, mở 280ms, đóng 200ms); từ 768px là
  hộp giữa màn.

## 6. Chuyển động

| Token | Giá trị | Dùng cho |
| --- | --- | --- |
| `ease-out` | `cubic-bezier(0.23, 1, 0.32, 1)` | vào/ra màn |
| `ease-drawer` | `cubic-bezier(0.32, 0.72, 0, 1)` | ngăn kéo |
| `ease-move` | `cubic-bezier(0.77, 0, 0.175, 1)` | vật đổi chỗ, chuyển cảnh nối |
| `dur-press` / `dur-fast` / `dur-base` | 100 / 160 / 220ms | ấn / di chuột, tab / dấu Đã lưu, thông báo |
| `dur-sheet-in` / `dur-sheet-out` | 280 / 200ms | ngăn kéo mở / đóng |
| `dur-morph` | 320ms | chuyển cảnh nối |
| `dur-story` | 700ms | chỉ trang chủ |

- Thao tác lặp hàng trăm lần mỗi ngày (gõ, phím tắt) không có animation; đổi tab chỉ trượt chỉ báo, nội dung đổi ngay.
- Bỏ 11 vòng lặp vô hạn (`pencil`, `twinkle`, `pend`, `glow`, `float`, `sway`, `steam`, `blink`, `writing`, `bob`,
  `seek`) và `wiggle`. Chỉ vòng chờ được quay liên tục.
- Không `ease-in`, không `transition: all`, không bắt đầu từ `scale(0)`. Chỉ animate `transform` và `opacity`.
- **Chuyển cảnh nối** bằng View Transitions (`view-transition-name` theo ngày, vd. `day-2026-10-30`): icon vừa chấm →
  ô hôm nay của Dải tháng; ô lịch → trang ngày; pixel → tháng; kết quả tìm kiếm → trang ngày. Trình duyệt không hỗ
  trợ thì đổi ngay.
- `prefers-reduced-motion`: bỏ dịch chuyển và phóng to, giữ đổi độ mờ và vòng chờ.

Trong code (`apps/web/src/styles/motion.css`):

- Đường cong là utility `ease-out`, `ease-drawer`, `ease-move` (biến CSS `--ease-*`); thời lượng là biến `--dur-*`,
  dùng dạng `duration-(--dur-fast)`. Không viết tay `cubic-bezier(...)` trong component.
- Cử chỉ "tờ giấy": `lift` cho vật có bóng (độ lệch bóng là `--lift`, mặc định 2px; vật `shadow-ink` đặt
  `[--lift:4px]`), `cta` cho nút chính bóng đào, `press` cho nút không bóng. Di chuột chỉ có tác dụng với con trỏ chuột.
- Animation vào màn: `animate-rise`, `animate-pop`, `animate-stamp`, `animate-grow`, `animate-menu`, `animate-land`,
  `animate-drop` (đều 160–220ms); `animate-drop-left/right`, `animate-draw` chỉ cho trang chủ.
- Ô "hôm nay chưa viết" đánh dấu bằng màu đào tĩnh (`bg-peach` hoặc `ring-peach`), không nhấp nháy.

## 7. Trang chủ

Trình tự: Hero → Một chạm → Ngày → tháng → năm → Một trang ngày → Riêng tư → CTA → chân trang. Nền đổi theo mục
(`paper`, `peach-soft`, `paper`, `sage-soft`, khối `primary`), ranh giới là đường `stroke` liền.

1. **Mở đầu hero** (một lần, dưới 1,4 s): chữ hiện ngay ở khung đầu; thẻ lịch và thẻ ngày "dán" xuống (bóng mọc từ 0);
   main icon của thẻ ngày bay vào ô hôm nay của lịch; nét bút `peach` chạy dưới "nhìn lại.".
2. **Một chạm:** bộ chấm điểm thật bên cạnh dải 7 ngày; chạm một mức, icon bay vào ô hôm nay.
3. **Ngày → tháng → năm** (cảnh cuộn, `animation-timeline: view()`): thẻ ngày thu vào lịch tháng, lịch thu vào Year in
   Pixels. Không hỗ trợ hoặc giảm chuyển động: ba khung tĩnh. Thay mục Year in Pixels riêng.
4. Mục **Tính năng** (hàng 6 thẻ) thay bằng một trang ngày thật kèm chú thích; mục **Riêng tư** (ba ô icon) thay bằng
   một câu lớn trên nền `sage-soft` và ba sự thật viết thành câu (người dùng đồng ý 30/10/2026).

Tối đa ba khoảnh khắc lớn; không hiệu ứng theo chuột, không video; tiêu đề hero là phần tử LCP và hiện ngay.

## 8. UX trong bản 1.1

| Việc | Ghi chú |
| --- | --- |
| Dải 24 giờ (DayClock) ở Hôm nay | "Còn X giờ Y phút trước khi sang ngày mới", theo múi giờ người dùng |
| Dải tháng (MonthStrip) dưới bộ chấm điểm | chạm ngày trống đã qua để ghi bù |
| Stamp thay `SyncStatus` | kể cả thùng rác "còn N ngày" |
| Chế độ "Theo giờ" | tối từ 20:00 đến 05:00 theo giờ người dùng |
| Chống nháy sáng chế độ tối, `theme-color` | `index.html` |
| Segmented dùng chung | Dòng thời gian, Hồ sơ, Tìm kiếm |
| **B1** Chuyển cảnh nối | ô lịch → trang ngày, pixel → tháng, kết quả tìm kiếm → trang ngày |
| **B2** Hoàn tác thay hộp xác nhận | xóa một trang vào thùng rác: thông báo "Đã chuyển vào thùng rác · Hoàn tác" 6 giây; xóa vĩnh viễn vẫn hỏi |
| **B5** Nháp khi mất mạng | cơ chế đã có (F-06: IndexedDB, thử lại khi có mạng); 1.1 thêm Stamp "Chưa đồng bộ" và test e2e mất mạng |

Đề xuất B3 (ẩn thanh tab khi gõ), B4 (vuốt giữa các ngày), B6 (rung khi chấm điểm), B7 (nút "Hôm nay" nổi) để sau,
ghi trong `docs/Backlog.md`.

## 9. Lộ trình

Mỗi giai đoạn một PR, người dùng duyệt rồi mới làm giai đoạn sau.

| Giai đoạn | Việc |
| --- | --- |
| 1 · Hồ sơ | `PRODUCT.md`, `DESIGN.md`, cây dự án, `.gitignore` |
| 2 · Font và token | Commissioner, gỡ Lora, token mục 2–6 trong `src/index.css`, preload font, chống nháy chế độ tối |
| 3 · Chuyển động | viết lại `src/styles/motion.css` theo mục 6 |
| 4 · Component nền | Button, Card, Segmented, BottomSheet, Stamp, thông báo Hoàn tác |
| 5 · Tính năng | DayClock, MonthStrip, "Theo giờ", B1, B2, B5 |
| 6 · Trang chủ | mục 7 |
| 7 · Quét và phát hành | thay giá trị viết tay bằng token, kiểm tra tương phản, build, tải lên Pages |
