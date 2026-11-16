---
name: social-journal-phase1-status
description: Trạng thái Giai đoạn 1 của Social_Plan (bạn bè, sổ chung 1:1) — backend xong, frontend còn thiếu
metadata:
  type: project
---

Nhánh `feat/social-journal` (F-11, ADR-0007, theo `docs/Social_Plan.md`) — trạng thái 2026-11-14:

- Backend **đã xong** (commit `784db7f`): migration `m0010`, services `friendships.py`, `shared_journals.py`, `shared_photos.py`.
- Còn thiếu (mục 6–10 của `docs/Social_Plan.md` §8):
  - Web: `features/friends/` (danh sách bạn, yêu cầu, mã bạn) và `features/journals/` (màn sổ chung, ô viết mục).
  - i18n: nhóm `friends` + `journal` cho cả `vi` và `en`.
  - `npm run gen:api` + commit `src/api/openapi.json` và `schema.d.ts` (CI báo lỗi nếu lệch).
  - Cập nhật trang `/privacy` (mục "Ai xem được nhật ký").
  - Cập nhật `docs/Project_Structure.md` (cây + 1 dòng lịch sử).
- Giai đoạn 2 (chế độ luân phiên, `m0011`, mốc 30/100 ngày) và Giai đoạn 3 (nhóm/tổ chức, cần ADR 0008) **chưa bắt đầu**.
