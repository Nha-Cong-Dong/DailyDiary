# DailyDiary – Cây dự án chuẩn

|                  |                                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| **Vai trò**      | Nguồn chuẩn **duy nhất** cho cấu trúc thư mục. Tài liệu và skill khác chỉ link tới đây. |
| **Phiên bản**    | 8 (21/10/2026), xem [Lịch sử thay đổi](#lịch-sử-thay-đổi)                      |
| **Liên quan**    | Mô hình dữ liệu: `Project_Specs.md` mục 5.4 · Kế hoạch: `MVP_Plan.md` · Quyết định: `adr/` |

## Quy tắc dùng cây này

1. **Trước khi tạo, di chuyển hoặc xóa file:** tìm vị trí đúng trong cây dưới đây. Không tạo thư mục ngoài cây.
2. **Cần chỗ mới mà cây chưa có:** sửa file này **trong cùng thay đổi** (cùng commit) với code, thêm một dòng
   vào [Lịch sử thay đổi](#lịch-sử-thay-đổi). Đổi cấu trúc lớn (thêm thư mục cấp cao, đổi cách chia tầng) thì
   viết thêm một ADR trong `docs/adr/`.
3. **Khi một bước tạo ra file đang ghi `(Bn)`:** bỏ nhãn `(Bn)` ở dòng đó để cây phản ánh đúng hiện trạng.
4. **Không chép cây này sang tài liệu khác**; chỉ link tới `docs/Project_Structure.md`.

Ký hiệu: không nhãn = đã có trên đĩa · `(Bn)` = sẽ tạo ở bước n trong `MVP_Plan.md` · `[sinh tự động]` = không sửa tay
· `[không commit]` = nằm trong `.gitignore`.

## Cây thư mục

```
dailydiary/
├── CLAUDE.md                         # chỉ dẫn cho Claude Code (luôn được nạp)
├── README.md                         # giới thiệu ngắn + cách cài đặt, chạy thử
├── LICENSE
├── .mcp.json                         # MCP server cho Claude Code (Context7)
├── .gitignore  .gitattributes  .editorconfig
├── docker-compose.yml                # MongoDB + MinIO cho môi trường local
│
├── .claude/                          # cấu hình Claude Code dùng chung cả repo
│   ├── settings.json                 # plugin dùng chung (marketplace + enabledPlugins), vd. taste-skill
│   ├── claude-security-guidance.md   # mô hình đe dọa, quy tắc bảo mật
│   └── skills/                       # skill quy trình: implement-feature, add-db-change, deploy,
│                                     # privacy-check, date-timezone-rules, seed-demo-data
├── .github/workflows/
│   └── ci.yml                        # job api / web / e2e
│
├── docs/
│   ├── Project_Specs.md              # đặc tả sản phẩm
│   ├── Project_Structure.md          # FILE NÀY
│   ├── MVP_Plan.md                   # kế hoạch theo bước, các quyết định Q1..Qn
│   └── adr/                          # quyết định kiến trúc: NNNN-<ten>.md
│
├── shared/                           # dùng chung cho api và web; chỉ sửa ở đây
│   ├── limits.json                   # giới hạn theo cấp tài khoản (beta | free | premium)
│   ├── icons.json                    # bộ biểu tượng, sub icon gợi ý
│   └── flag_colors.json              # bảng màu cờ hiệu
│
└── apps/
    ├── api/                          # Backend: Python 3.12 (uv), FastAPI, MongoDB
    │   ├── .claude/skills/           # api-conventions, fastapi-backend
    │   ├── pyproject.toml  uv.lock  .python-version
    │   ├── .env.example              # .env [không commit]
    │   ├── Dockerfile  .dockerignore # (B4) build từ gốc repo để mang theo shared/
    │   ├── app/
    │   │   ├── main.py               # create_app(), lifespan, middleware, gắn router
    │   │   ├── core/                 # hạ tầng dùng chung, KHÔNG chứa nghiệp vụ
    │   │   │   ├── config.py         # Settings (biến môi trường)
    │   │   │   ├── errors.py         # ApiError + định dạng lỗi chuẩn
    │   │   │   ├── logging.py        # log request (không ghi body/query; che token ở /public/shares/***)
    │   │   │   ├── limits.py         # đọc shared/limits.json
    │   │   │   ├── rate_limit.py     # slowapi limiter + handler 429
    │   │   │   ├── catalog.py        # đọc shared/icons.json (danh sách bộ icon, bộ mặc định)
    │   │   │   ├── text.py           # (B5) chuẩn hóa NFC, norm từ khóa không dấu
    │   │   │   ├── security.py       # cookie phiên, get_current_user, CSRF
    │   │   │   ├── oauth.py          # Authlib Google
    │   │   │   └── storage.py        # (B7) boto3, presigned URL
    │   │   ├── db/
    │   │   │   ├── client.py         # AsyncMongoClient, dependency Db
    │   │   │   ├── collections.py    # tên collection
    │   │   │   ├── migrate.py        # python -m app.db.migrate
    │   │   │   └── migrations/       # m0001_initial.py, m0002_user_icon_set_onboarded.py, m0003_share_links.py, m0004_<mo_ta>.py ...
    │   │   ├── schemas/              # Pydantic, một file mỗi tài nguyên: XxxCreate/XxxUpdate/XxxOut (users.py, shares.py)
    │   │   ├── services/             # nghiệp vụ + truy vấn MongoDB; tham số đầu là user_id (users.py, shares.py)
    │   │   ├── routers/              # health, auth (Google + dev-login chỉ local/test), me, shares (F-10: chủ trang + /public/shares);
│   │   │                         # (B5) entries; (B7) photos; (B9) calendar;
    │   │   │                         # (B10) pixels; (B11) search; (B12) export, feedback
    │   │   └── jobs/                 # (B12–B13) dọn bài xóa mềm, hoàn tất xóa tài khoản, sao lưu
    │   ├── scripts/                  # công cụ chạy tay, dùng môi trường của api (uv run python scripts/...)
    │   │   ├── export_openapi.py     # xuất OpenAPI cho web (npm run gen:api, CI kiểm tra lệch)
    │   │   └── seed_demo.py          # (B14) nạp dữ liệu mẫu 3 tháng vào DB local
    │   └── tests/
    │       ├── conftest.py           # DB *_test, client, make_client (phiên đăng nhập), alice/bob
    │       ├── fakes.py              # (B7) S3 giả
    │       ├── unit/                 # hàm thuần, không cần DB
    │       ├── db/                   # migration, index, validator
    │       └── api/                  # test_<router>.py: thành công, dữ liệu sai, truy cập chéo
    │
    └── web/                          # Frontend: React + Vite + TypeScript
        ├── .claude/skills/           # web-conventions
        ├── package.json  package-lock.json  .npmrc  .oxlintrc.json  components.json
        ├── vite.config.ts  playwright.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json
        ├── index.html  .env.example
        ├── public/                   # file tĩnh phục vụ nguyên trạng (favicon Jotly)
        ├── e2e/                      # smoke test Playwright: <luồng>.spec.ts; session.ts (đăng nhập thử)
        └── src/
            ├── main.tsx  App.tsx  index.css  vite-env.d.ts
            ├── api/
            │   ├── client.ts         # openapi-fetch, credentials: "include"
            │   ├── openapi.json      # [sinh tự động] từ scripts/export_openapi.py
            │   └── schema.d.ts       # [sinh tự động] npm run gen:api
            ├── routes/               # router.tsx, RootLayout.tsx (+ RootLoading), ErrorPage.tsx (lỗi route), <Tên>Page.tsx
            │                         # (mỏng, ghép từ features; ghép feature với nhau ở đây, vd. DayPage = entry + share);
            │                         # LoginPage, OnboardingPage, TodayPage, ProfilePage, NotFoundPage có trong bản build;
            │                         # chỉ có khi chạy dev (tải lười, không vào bản build): DevUiPage, TimelinePage,
            │                         # DayPage (/day/:date), DayEditPage (/day/:date/edit), BackfillPage (/day/:date/backfill),
            │                         # PixelsPage, SearchPage, SharePage (/s/:token), SharedListPage (/profile/shares),
            │                         # cho tới khi có API ở các bước 5–11b
            ├── features/             # mỗi tính năng một thư mục
            │   ├── health/           # kiểm tra kết nối API
            │   ├── landing/          # trang giới thiệu cho người chưa đăng nhập (trang chủ /)
            │   ├── auth/             # trang đăng nhập + trạng thái lỗi (loginState.ts), RequireAuth (bảo vệ route)
            │   ├── profile/          # 3 bước lần đầu, Hồ sơ & cài đặt (giao diện; components/ vì ≥ 6 component);
            │   │                     # PATCH /me; (B12) xuất dữ liệu, xóa tài khoản
            │   ├── entry/            # màn Hôm nay, chi tiết một ngày, Sửa trang cũ, Ghi bù (giao diện, lưu tạm trong tab:
            │   │                     # localDays.ts, uploadPhoto.ts giả lập); components/ vì ≥ 6 component;
            │   │                     # (B5–B7) lưu nhật ký, ảnh, tự động lưu
            │   ├── timeline/         # dòng thời gian theo tháng: danh sách, nhịp điểm, lịch, thống kê tháng (thiết kế B8,
            │   │                     # dữ liệu mẫu); (B8–B9) GET /entries, /calendar
            │   ├── calendar/         # (B9) dự phòng; lịch tháng hiện nằm trong timeline/ theo thiết kế B8
            │   ├── pixels/           # Year in Pixels cả năm (giao diện, dữ liệu mẫu); (B10) GET /pixels/{year}
            │   ├── search/           # tìm theo từ khóa + bộ lọc (giao diện, dữ liệu mẫu); (B11) GET /search
            │   ├── share/            # Chia sẻ một trang (F-10, thiết kế B8): hộp thoại, trang người nhận, trang đang chia sẻ,
            │   │                     # link đã tắt; kiểu lấy từ schema.d.ts, dữ liệu mẫu demoShares.ts; components/
            │   └── feedback/         # (B12) góp ý
            ├── components/
            │   ├── ui/               # component shadcn: npx shadcn@4.22.0 add <tên> (đã chỉnh theo hệ thiết kế;
            │   │                     # có dialog, alert-dialog, switch)
            │   ├── diary/            # thành phần nhật ký dùng chung: main/sub icon, chọn điểm, cờ hiệu,
            │   │                     # chip từ khóa, ô lịch, ô pixel, thẻ nhật ký, ô ảnh + trình xem ảnh, tải ảnh (PhotoUploader)
            │   └── layout/           # logo, ảnh đại diện, thanh điều hướng (máy tính + tab dưới điện thoại), khung trang,
            │                         # thanh ngoại tuyến (OfflineBanner), trạng thái trang (PageStates: đang tải, 404, lỗi), logo Google (GoogleMark)
            ├── lib/                  # query.ts, limits.ts, utils.ts, catalog.ts (icons/cờ từ shared/),
            │                         # theme.ts (sáng/tối), date.ts (ngày theo múi giờ hồ sơ),
            │                         # profile.ts (GET/PATCH /me), session.ts (đăng xuất, đăng nhập thử), text.ts (bỏ dấu, tô sáng),
            │                         # demo.ts (dữ liệu mẫu chỉ cho dev, bỏ khi có API; ?demo=empty xem màn trống),
            │                         # image.ts (kiểm tra loại/kích thước ảnh), online.ts (trạng thái mạng);
            │                         # (B6) autosave.ts, storage.ts (IndexedDB)
            ├── styles/               # shadcn-tailwind.css (vendored), motion.css (keyframes, hiệu ứng di chuột/cuộn)
            └── test/                 # setup.ts (cấu hình Vitest), withMe.tsx (giả /me khi render test)
```

## Quy ước bên trong thư mục

**Backend (`apps/api/app`)**
- Tên file `snake_case`. Một tài nguyên dùng cùng tên ở ba tầng: `routers/entries.py`, `services/entries.py`,
  `schemas/entries.py`.
- Chiều phụ thuộc: `routers → services → db`; `core` dùng được ở mọi tầng; `services` không import `routers`.
- Test: `tests/api/test_<router>.py`, `tests/unit/test_<module>.py`, `tests/db/test_<chủ đề>.py`.

**Frontend (`apps/web/src`)**
- Thư mục feature **phẳng**: `<Tên>.tsx` (component, PascalCase), `use<Tên>.ts` (hook TanStack Query),
  `<tên>.ts` (hàm thuần, camelCase), `<Tên>.test.tsx` cạnh file được test. Chỉ tách thư mục con `components/`
  khi feature có từ 6 component trở lên.
- Feature không import feature khác; phần dùng chung đưa lên `components/` hoặc `lib/`.
- `routes/` chỉ ghép trang từ feature, không gọi API trực tiếp.

**Không đặt**
- Không đặt code ở `apps/*/` gốc ngoài các file cấu hình đã liệt kê.
- Không thêm thư mục `utils/`, `helpers/`, `common/` chung chung; đặt theo vai trò (`lib/`, `core/`).
- Không commit file `.env`, `dist/`, `node_modules/`, `.venv/`, `test-results/`.

## Những gợi ý đã cân nhắc nhưng chưa áp dụng

- **Proxy `/api` qua Vite thay cho CORS khi chạy local:** chưa dùng. Cookie, CORS và CSRF đã được thiết kế và test
  theo mô hình hai origin (`localhost:5173` gọi `localhost:8000`). Sẽ xem lại ở bước 4, khi chốt tên miền production.
- **`seed/` ở gốc repo:** đã bỏ. Script nạp dữ liệu cần client MongoDB và cấu hình của api, nên đặt ở
  `apps/api/scripts/seed_demo.py`.

## Lịch sử thay đổi

| Phiên bản | Ngày | Thay đổi |
| --- | --- | --- |
| 1 | 17/10/2026 | Cây đầu tiên trong `Project_Specs.md` mục 5.3 (MongoDB, chia feature) |
| 2 | 17/10/2026 | Tách ra file riêng. Bổ sung file cấu hình, `.claude/`, `docs/adr/`, `apps/api/scripts/` (export OpenAPI, seed), `Dockerfile` (B4), `tests/fakes.py`, `src/api/openapi.json`. Bỏ `seed/` ở gốc. Chốt feature frontend dạng phẳng. Sau hậu kiểm và gợi ý từ `/btw` |
| 3 | 19/10/2026 | Thêm `.claude/settings.json` để cả nhóm dùng chung plugin `taste-skill` (marketplace `Leonxlnx/taste-skill`) và `mattpocock-skills` (`claude-plugins-official`) |
| 4 | 19/10/2026 | Bước 2 (hệ thiết kế Jotly): thêm `components/diary/`, `features/landing/`, `lib/catalog.ts`, `lib/theme.ts`, `routes/DevUiPage.tsx`, `styles/motion.css`; bỏ nhãn (B2) ở `components/layout/` và `public/` |
| 5 | 19/10/2026 | Thiết kế B6: màn Hôm nay (`features/entry/`), 3 bước lần đầu (`features/profile/`), `lib/date.ts` (bỏ nhãn (B3)), `lib/profile.ts`, `routes/TodayPage.tsx`, `routes/OnboardingPage.tsx`; khung app theo B6 |
| 6 | 20/10/2026 | Thiết kế B7: `features/pixels/`, `features/search/` (bỏ `.gitkeep`), chi tiết ngày trong `features/entry/`, Hồ sơ trong `features/profile/` (tách `components/`), `lib/text.ts`, `lib/demo.ts`, `components/ui/dialog`, `alert-dialog`, `components/layout/Avatar.tsx`, `components/diary/PhotoViewer.tsx`; route dev tải lười |
| 7 | 20/10/2026 | Bước 3 (đăng nhập Google, hồ sơ): `core/security.py`, `core/oauth.py`, `core/catalog.py`, `routers/auth.py`, `routers/me.py`, `schemas/users.py`, `services/users.py`, migration `m0002`, `features/auth/`, `routes/LoginPage.tsx`, `lib/session.ts`, `src/test/withMe.tsx`, `e2e/session.ts`; bỏ nhãn (B3); các trang Lần đầu, Hôm nay, Hồ sơ vào bản build |
| 8 | 21/10/2026 | Thiết kế B8–B9 + Chia sẻ (ADR 0005): `features/timeline/` (bỏ `.gitkeep`), `features/share/`, Sửa/Ghi bù trong `features/entry/` (tách `components/`), `PhotoUploader`, `lib/image.ts` (bỏ nhãn (B7)), `lib/online.ts`, `OfflineBanner`, `PageStates`, `GoogleMark` (thay ô giữ chỗ logo Google), `routes/ErrorPage.tsx` và các trang dev mới; backend `shares` (router, service, schema, migration `m0003`); `core/logging.py` che token; `scripts/export_openapi.py` sửa lỗi in trên console Windows |
