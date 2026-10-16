# 0003. Không cài CLI shadcn, chép CSS vào dự án

- Trạng thái: Chấp nhận
- Ngày: 17/10/2026
- Liên quan: MVP_Plan.md Q13

## Bối cảnh

`npm install` báo 7 lỗ hổng mức cao, đều bắt nguồn từ gói `braces` (GHSA-vfj7-8cjw-p6xm, DoS) mà CLI `shadcn`
kéo theo qua `fast-glob`/`ts-morph`. Chưa có bản `braces` nào vá lỗi. `npm audit fix --force` đổi `shadcn` sang
bản 1.0.0, là gói rỗng, làm hỏng `@import "shadcn/tailwind.css"`. Dự án chỉ dùng gói này cho đúng một file CSS.

## Quyết định

- Chép `shadcn/dist/tailwind.css` (shadcn 4.22.0, MIT) vào `apps/web/src/styles/shadcn-tailwind.css`.
- Gỡ `shadcn` khỏi `package.json`. Thêm component bằng `npx shadcn@4.22.0 add <tên>` (giữ `components.json`).
- Không chạy `npm audit fix --force` trong dự án.

## Hệ quả

- `npm audit` sạch; CSS build ra giống hệt trước khi đổi.
- Khi nâng cấp shadcn phải chép lại file CSS bằng tay và cập nhật phiên bản trong lệnh `npx`.
