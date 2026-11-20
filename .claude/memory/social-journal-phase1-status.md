---
name: social-journal-phase1-status
description: Trạng thái Giai đoạn 1 của Social_Plan (bạn bè, sổ chung 1:1) — xong code + CI, chờ PR
metadata:
  type: project
---

Nhánh `feat/social-journal` (F-11, ADR-0007, theo `docs/Social_Plan.md`) — trạng thái 2026-11-17:

- Backend **xong** (commit `784db7f`): migration `m0010`, services `friendships.py`, `shared_journals.py`, `shared_photos.py`, test + dọn khi xóa tài khoản.
- Frontend **xong**: gộp vào 1 feature `features/social/` (không tách `friends/`+`journals/` như plan ban đầu): SocialPage + FriendCodeCard (có AlertDialog xác nhận xoay mã), SocialSections (lỗi cụ thể theo mã API), JournalDetail (2 cột "mục của tôi/họ" trên desktop, form mục + 409 conflict sync, AlertDialog kết thúc sổ, ảnh ≤2/mục + needsEntry), route `/social` + tab nav. Commit `b7c3495`, i18n `8ebc4c9`.
- `npm run gen:api` + `openapi.json`/`schema.d.ts` đã commit cùng `b7c3495`.
- Trang `/privacy` đã cập nhật (section 3 "Ai xem được nhật ký", dữ liệu sổ chung, phạm vi xóa, ngày cập nhật).
- CI web xanh: lint + typecheck + 232 test + build (17/11/2026).
- Chưa làm: e2e social (tùy chọn), preview artifact mock HTML (mục 7 plan, tùy chọn), PR.
- Giai đoạn 2 (chế độ luân phiên, `m0011`, mốc 30/100 ngày) và Giai đoạn 3 (nhóm/tổ chức, ADR 0008) **chưa bắt đầu**.
