---
name: web-conventions
description: Quy ước code frontend React + Vite của DailyDiary. Dùng khi viết hoặc sửa component, trang, hook, gọi API, form, tự động lưu, nén ảnh hoặc giao diện trong apps/web.
---

# Quy ước frontend

## Cấu trúc
Cây thư mục chuẩn và quy ước bên trong thư mục feature: `docs/Project_Structure.md` (không tạo thư mục ngoài cây đó;
đổi cấu trúc thì sửa file đó cùng lúc).
- `src/features/<tên>/`: mỗi tính năng (entry, timeline, pixels, search, profile) gồm component, hook, và query riêng.
- `src/components/`: component dùng chung; ưu tiên shadcn/ui. Thêm component bằng `npx shadcn@4.22.0 add <tên>`;
  không cài CLI `shadcn` vào `package.json`, không chạy `npm audit fix --force`.
- `src/lib/`: `date.ts` (múi giờ), `image.ts` (nén ảnh), `autosave.ts`, `storage.ts` (IndexedDB).
- `src/api/`: client sinh từ OpenAPI. Không sửa tay; chạy `npm run gen:api` để sinh lại.

## Gọi API
- Chỉ qua TanStack Query (`useQuery`, `useMutation`); key dạng `['entries', date]`, `['calendar', year, month]`, `['pixels', year]`.
- Sau khi lưu nhật ký, invalidate key lịch tháng và pixels của năm tương ứng.

## Tự động lưu
- Ghi nháp vào IndexedDB sau 1 giây ngừng gõ; đồng bộ sau 3–5 giây, khi blur/rời trang; chỉ gửi khi có thay đổi.
- Luôn gửi kèm `updated_at` đã biết; xử lý lỗi 409 bằng cách hỏi người dùng giữ bản nào.
- Hiển thị 3 trạng thái: Đang lưu / Đã lưu / Chưa đồng bộ.

## Giao diện
- Ưu tiên máy tính nhưng phải dùng được từ 360 px; luồng chọn biểu tượng và thêm ảnh phải dễ bấm trên điện thoại.
- Kích thước sub icon lấy từ biến CSS `--sub-icon-ratio` (mặc định 0.55).
- Màu cờ hiệu, danh sách icon đọc từ `shared/`.
- Mọi danh sách có trạng thái đang tải, lỗi, rỗng.
- Đạt LCP < 2,5 s, CLS < 0,1: đặt kích thước cố định cho ảnh thu nhỏ và ô lịch.
