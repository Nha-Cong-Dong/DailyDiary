# 0006. Thêm tiếng Anh cho giao diện web (i18n)

- Trạng thái: Chấp nhận
- Ngày: 08/11/2026
- Liên quan: Project_Specs.md mục 2.2 (trước đây ghi "ngôn ngữ khác tiếng Việt: không có"), F-04 · `apps/web/src/lib/i18n.ts` · `apps/web/src/locales/`

## Bối cảnh

Giao diện web viết cứng tiếng Việt trong khoảng 150 file; ô chọn ngôn ngữ chỉ là nút khóa "English · Sắp có". Người dùng
chọn thêm bản dịch tiếng Anh cho **giao diện web** (ngày 08/11/2026). Ngoài phạm vi: chính sách quyền riêng tư (văn bản
pháp lý chưa được rà soát), email hệ thống (góp ý, xác nhận xóa tài khoản), nội dung nhật ký của người dùng.

## Quyết định

- Thư viện: `i18next` + `react-i18next`. Không có máy chủ nào dựng trang nên dịch hoàn toàn ở trình duyệt.
- Bản dịch là module TypeScript ở `src/locales/<ngôn ngữ>/<nhóm>.ts`, mỗi tính năng một nhóm (`common`, `catalog`,
  `errors`, `components`, `landing`, `auth`, `profile`, `entry`, `timeline`, `pixels`, `search`, `share`, `feedback`,
  `legal`). **Tiếng Việt là nguồn chuẩn**: kiểu của khóa lấy từ `locales/vi`, bản tiếng Anh khai báo bằng `Shape<typeof vi>`
  nên thiếu khóa là lỗi biên dịch, gõ sai khóa hoặc thiếu biến nội suy cũng vậy.
- Tiếng Việt luôn nằm trong bản build; tiếng Anh tải riêng (`import()`) khi người dùng chọn. Thiếu khóa tiếng Anh thì
  hiện tiếng Việt (`fallbackLng: 'vi'`).
- Lựa chọn lưu ở `localStorage` (`jotly.lang`), **không** lưu trong hồ sơ ở máy chủ, nên không đổi API hay cơ sở dữ liệu.
  Mặc định tiếng Việt cho người mới, không đoán theo trình duyệt.
- Quy ước viết: trong component dùng `useTranslation()` không tham số và khóa có nhóm, `t('landing:hero.title')`;
  ngoài component (lib/, hàm thuần) dùng `t` xuất từ `lib/i18n.ts`. Số nhiều: tiếng Việt chỉ có `_other`, tiếng Anh có
  `_one` và `_other`. Ngày giờ lấy từ `lib/date.ts` (tên thứ, tháng nằm trong nhóm `common`).
- Đổi ngôn ngữ thì `App` dựng lại cây giao diện (`key` theo ngôn ngữ) để chữ dịch bằng `t` ngoài component cũng đổi theo.
- Chữ từ backend: thông báo lỗi dịch ở web theo `error.code` (nhóm `errors`), `message` của máy chủ chỉ là dự phòng.
- Tên bộ icon, nhãn điểm, tên màu cờ nằm trong `shared/*.json` bằng tiếng Việt (backend dùng chung); bản dịch ở nhóm
  `catalog` theo `id`, `lib/catalog.ts` đọc từ đó và lấy chữ trong JSON làm dự phòng.
- Chính sách quyền riêng tư giữ tiếng Việt; bản tiếng Anh chỉ có dòng báo "hiện chỉ có tiếng Việt" cho đến khi luật sư rà soát.

## Hệ quả

- Mọi chữ hiển thị mới phải thêm vào **cả hai** ngôn ngữ; không viết cứng chuỗi trong component.
- Chữ tiếng Anh dài hơn tiếng Việt nên phải kiểm tra tràn ở 360 px.
- Đổi ngôn ngữ làm mất trạng thái giao diện tạm thời của màn đang mở (bản nháp đã nằm trong IndexedDB nên không mất).
- Email hệ thống vẫn tiếng Việt; muốn dịch cần thêm ngôn ngữ vào API (việc sau).
- Test mặc định chạy tiếng Việt (`test/setup.ts`); test cho tiếng Anh gọi `setLanguage('en')`, được đặt lại sau mỗi test.
