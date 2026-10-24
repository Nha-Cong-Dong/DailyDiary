# DailyDiary – Cây dự án chuẩn

|                  |                                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| **Vai trò**      | Nguồn chuẩn **duy nhất** cho cấu trúc thư mục. Tài liệu và skill khác chỉ link tới đây. |
| **Phiên bản**    | 13 (21/10/2026), xem [Lịch sử thay đổi](#lịch-sử-thay-đổi)                      |
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
├── docker-compose.yml                # MongoDB + MinIO + Mailpit (bắt email) cho môi trường local
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
    │   │   │   ├── text.py           # chuẩn hóa NFC, norm từ khóa không dấu
    │   │   │   ├── security.py       # cookie phiên, get_current_user, CSRF
    │   │   │   ├── oauth.py          # Authlib Google
    │   │   │   ├── mailer.py         # gửi email qua SMTP (Gmail thật, Mailpit local), chạy ngoài event loop: góp ý, thư xác nhận xóa tài khoản
    │   │   │   └── storage.py        # boto3: ký URL PUT/GET, kiểm tra object, xóa theo lô (báo lỗi từng key); dependency S3 / OptionalS3
    │   │   ├── db/
    │   │   │   ├── client.py         # AsyncMongoClient, dependency Db
    │   │   │   ├── collections.py    # tên collection
    │   │   │   ├── migrate.py        # python -m app.db.migrate
    │   │   │   └── migrations/       # m0001_initial.py, m0002_user_icon_set_onboarded.py, m0003_share_links.py, m0004_entries_icon_set_norm.py, m0005_user_custom_flag_colors.py, m0006_user_avatar_key.py, m0007_entries_norm_backfill.py, m0008_feedback_emailed_at.py, m0009_deletion_log.py, m0010_<mo_ta>.py ...
    │   │   ├── schemas/              # Pydantic, một file mỗi tài nguyên: XxxCreate/XxxUpdate/XxxOut (users.py, entries.py, photos.py, calendar.py, pixels.py, search.py, shares.py, account.py, feedback.py)
    │   │   ├── services/             # nghiệp vụ + truy vấn MongoDB; tham số đầu là user_id (users.py, entries.py, photos.py, calendar.py, pixels.py, search.py, shares.py,
    │   │   │                         # account.py: xóa toàn bộ dữ liệu, xóa tài khoản, dọn kho; feedback.py;
    │   │   │                         # maintenance.py: dọn thùng rác quá hạn, không theo một người dùng)
    │   │   ├── routers/              # health, auth (Google + dev-login chỉ local/test), me, entries, photos, calendar, pixels,
    │   │   │                         # search (/search, /keywords/top, /sub-icons/top), shares (F-10: chủ trang + /public/shares);
    │   │   │                         # feedback (POST /feedback)
    │   │   └── jobs/                 # tác vụ định kỳ: uv run python -m app.jobs.run <tên> (run.py);
    │   │                             # purge_accounts.py (làm nốt xóa tài khoản dang dở), backup_db.py (sao lưu + khôi phục DB),
    │   │                             # backup_photos.py (chép ảnh tăng dần sang kho sao lưu), blobstore.py (giao diện kho sao lưu)
    │   ├── scripts/                  # công cụ chạy tay, dùng môi trường của api (uv run python scripts/...)
    │   │   ├── export_openapi.py     # xuất OpenAPI cho web (npm run gen:api, CI kiểm tra lệch)
    │   │   └── seed_demo.py          # (B14) nạp dữ liệu mẫu 3 tháng vào DB local
    │   └── tests/
    │       ├── conftest.py           # DB *_test, client, make_client (phiên đăng nhập), alice/bob
    │       ├── fakes.py              # kho ảnh giả (FakeStorage), kho sao lưu giả (FakeBlobStore) + byte đầu WebP/JPEG/PNG mẫu
    │       ├── unit/                 # hàm thuần, không cần DB
    │       ├── db/                   # migration, index, validator
    │       ├── api/                  # test_<router>.py: thành công, dữ liệu sai, truy cập chéo
    │       └── jobs/                 # test_<tác vụ>.py; test_minio_integration.py tự skip khi không có MinIO
    │
    └── web/                          # Frontend: React + Vite + TypeScript
        ├── .claude/skills/           # web-conventions
        ├── package.json  package-lock.json  .npmrc  .oxlintrc.json  components.json
        ├── vite.config.ts  playwright.config.ts  tsconfig.json  tsconfig.app.json  tsconfig.node.json
        ├── index.html  .env.example
        ├── public/                   # file tĩnh phục vụ nguyên trạng (favicon Jotly)
        ├── scripts/                  # công cụ chạy tay, không vào bản build: subset_fonts.py (tạo font tự host trong src/assets/fonts/)
        ├── e2e/                      # smoke test Playwright: <luồng>.spec.ts; session.ts (đăng nhập thử)
        └── src/
            ├── main.tsx  App.tsx  index.css  vite-env.d.ts
            ├── assets/
            │   └── fonts/            # [sinh bằng scripts/subset_fonts.py] Be Vietnam Pro 400–700, Young Serif (chữ logo)
            │                         # đã cắt còn ký tự tiếng Việt + Latin; OFL-*.txt (giấy phép). Lora vẫn lấy từ fontsource
            ├── api/
            │   ├── client.ts         # openapi-fetch, credentials: "include"
            │   ├── openapi.json      # [sinh tự động] từ scripts/export_openapi.py
            │   └── schema.d.ts       # [sinh tự động] npm run gen:api
            ├── routes/               # router.tsx (createRouter(queryClient)), prefetch.ts (loader tải trước dữ liệu của màn khi có /me),
            │                         # RootLayout.tsx (+ RootLoading), ErrorPage.tsx (lỗi route), <Tên>Page.tsx
            │                         # (mỏng, ghép từ features; ghép feature với nhau ở đây, vd. DayPage = entry + share, HomePage = landing + share);
            │                         # route có khung riêng trên điện thoại khai báo handle.phoneChrome ('tabs' | 'none');
            │                         # trong bản build: LoginPage, OnboardingPage, TodayPage, ProfilePage, NotFoundPage,
            │                         # DayPage (/day/:date), DayEditPage (/day/:date/edit), BackfillPage (/day/:date/backfill),
            │                         # SharePage (/s/:token), SharedListPage (/profile/shares), TrashPage (/profile/trash), TimelinePage (/timeline), PixelsPage (/pixels),
            │                         # SearchPage (/search), PrivacyPage (/privacy, công khai); chỉ có khi chạy dev: DevUiPage (/dev/ui)
            ├── features/             # mỗi tính năng một thư mục
            │   ├── health/           # kiểm tra kết nối API
            │   ├── landing/          # trang chủ /: bản giới thiệu cho người chưa đăng nhập và bản đã đăng nhập (menu tài khoản,
            │   │                     # tóm tắt tháng; thiết kế B5-Landing-Signed)
            │   ├── auth/             # trang đăng nhập + trạng thái lỗi (loginState.ts), RequireAuth (bảo vệ route)
            │   ├── profile/          # 3 bước lần đầu, Hồ sơ & cài đặt (giao diện; components/ vì ≥ 6 component);
            │   │                     # PATCH /me; xóa toàn bộ dữ liệu, xóa tài khoản (confirm.ts, useJournalData.ts);
            │   │                     # dung lượng ảnh (components/StorageUsage.tsx)
            │   ├── entry/            # màn Hôm nay, chi tiết một ngày, Sửa trang cũ, Ghi bù (giao diện, lưu tạm trong tab:
            │   │                     # entries.ts: GET/PUT/DELETE /entries + khôi phục; uploadPhoto.ts giả lập tới B7); bản điện thoại B10; useRecentDays.ts (7 ngày qua), useFrequentSubIcons.ts (sub icon hay dùng); useAutosave.ts (tự lưu + nháp + xung đột,
            │   │                     # components/ConflictDialog.tsx);
            │   │                     # components/ vì ≥ 6 component;
            │   │                     # (B5–B7) lưu nhật ký, ảnh, tự động lưu
            │   ├── timeline/         # dòng thời gian theo tháng: danh sách, nhịp điểm, lịch, thống kê tháng, hôm nay chưa viết +
            │   │                     # chấm điểm nhanh, bản điện thoại (thiết kế B8, B10);
            │   │                     # GET /entries?month (danh sách), GET /calendar/{y}/{m} (lịch + chuỗi ngày)
            │   ├── calendar/         # dự phòng, chưa dùng: lịch tháng nằm trong timeline/ theo thiết kế B8
            │   ├── pixels/           # Year in Pixels cả năm; GET /pixels/{year} (dạng gọn), xem nhanh ngày qua GET /entries/{day}
            │   ├── search/           # tìm theo từ khóa + bộ lọc; GET /search (chờ ngừng gõ 300 ms, Xem thêm theo cursor), /keywords/top
            │   ├── share/            # Chia sẻ một trang (F-10, thiết kế B8): hộp thoại, trang người nhận, trang đang chia sẻ,
            │   │                     # link đã tắt; kiểu lấy từ schema.d.ts, dữ liệu mẫu demoShares.ts; components/
            │   ├── feedback/         # form góp ý (FeedbackDialog, useSendFeedback); trang Hồ sơ ghép vào
            │   └── legal/            # trang pháp lý công khai: PrivacyPolicy.tsx (chính sách quyền riêng tư, đặc tả 4.1; email liên hệ)
            ├── components/
            │   ├── ui/               # component shadcn: npx shadcn@4.22.0 add <tên> (đã chỉnh theo hệ thiết kế;
            │   │                     # có dialog, alert-dialog, switch, dropdown-menu; button có biến thể cta)
            │   ├── diary/            # thành phần nhật ký dùng chung: main/sub icon, chọn điểm, cờ hiệu,
            │   │                     # chip từ khóa, ô lịch, ô pixel, thẻ nhật ký, ô ảnh + trình xem ảnh, tải ảnh (PhotoUploader),
            │   │                     # BottomSheet (bảng trượt/hộp thoại dùng chung cả app: layout responsive | sheet), Toast (thông báo nổi dùng chung), SyncStatus (Đang lưu / Đã lưu / Chưa đồng bộ),
            │   │                     # xem nhanh một ngày (DayPeek)
            │   └── layout/           # logo, ảnh đại diện, thanh điều hướng (máy tính + tab dưới điện thoại), khung trang,
            │                         # thanh ngoại tuyến (OfflineBanner), trạng thái trang (PageStates: đang tải, 404, lỗi), logo Google (GoogleMark),
            │                         # khung công khai (PlainFrame: 404/lỗi khi chưa đăng nhập)
            ├── lib/                  # query.ts, limits.ts, utils.ts, catalog.ts (icons/cờ từ shared/),
            │                         # theme.ts (sáng/tối), date.ts (ngày theo múi giờ hồ sơ),
            │                         # profile.ts (GET/PATCH /me), session.ts (đăng xuất, đăng nhập thử), text.ts (bỏ dấu, tô sáng),
            │                         # demo.ts (dữ liệu mẫu chỉ cho dev, bỏ khi có API; ?demo=empty xem màn trống; demoWrite lưu tạm trong tab),
            │                         # image.ts (kiểm tra loại/kích thước ảnh), online.ts (trạng thái mạng);
            │                         # autosave.ts (bộ máy tự lưu, F-06), storage.ts (nháp IndexedDB qua `idb`);
            │                         # usage.ts (GET /me/data-summary: số trang/ảnh + dung lượng, dùng ở Hồ sơ và ô tải ảnh)
            ├── styles/               # shadcn-tailwind.css (vendored), motion.css (keyframes, hiệu ứng di chuột/cuộn),
            │                         # fonts.css (@font-face cho font tự host trong assets/fonts/)
            └── test/                 # setup.ts (cấu hình Vitest), withMe.tsx (giả /me và API nhật ký khi render test),
                                      # demoApi.ts (giả API chia sẻ)
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
| 9 | 21/10/2026 | Thiết kế B10 (điện thoại), B5-Landing-Signed, B8-Timeline-Today, chuyển động dịu lại: `components/diary/BottomSheet.tsx`, `DayPeek.tsx`, `components/layout/PlainFrame.tsx`, `components/ui/dropdown-menu.tsx`, `features/landing/AccountMenu.tsx`, `useHomeSummary.ts`, `features/timeline/TodayPrompt.tsx`, `WritingNotebook.tsx`, `useQuickScore.ts`, `features/entry/useIsPhone.ts`, `features/profile/components/sheet.ts` (hai file sau đã bỏ ở phiên bản 10); route `*` ra ngoài AppShell; `handle.phoneChrome` cho các route có khung điện thoại riêng |
| 10 | 21/10/2026 | Làm theo báo cáo rà thiết kế: `components/diary/Toast.tsx` mới, `BottomSheet` dùng chung cả app; bỏ `features/profile/components/sheet.ts`, `features/share/components/Toast.tsx`, `features/entry/useIsPhone.ts`; thêm `features/profile/confirm.ts`, `useJournalData.ts`, `features/entry/useRecentDays.ts`, `useFrequentSubIcons.ts`, `features/search/Search.test.tsx`; route trong app tải lười |
| 11 | 21/10/2026 | Bước 5 (backend): `routers/entries.py`, `services/entries.py`, `schemas/entries.py`, `core/text.py` (bỏ nhãn (B5)), migration `m0004_entries_icon_set_norm.py` |
| 12 | 21/10/2026 | Bước 5 (web): `features/entry/entries.ts`, `src/test/demoApi.ts`; bỏ `features/entry/localDays.ts`; Trang ngày, Sửa, Ghi bù, Chia sẻ vào bản build |
| 13 | 21/10/2026 | Bước 6: `lib/autosave.ts`, `lib/storage.ts` (bỏ nhãn (B6)), `features/entry/useAutosave.ts`, `features/entry/components/ConflictDialog.tsx`, `components/diary/SyncStatus.tsx`, `e2e/autosave.spec.ts`; thư viện `idb`, `fake-indexeddb` (test) |
| 14 | 23/10/2026 | Màu cờ tùy chỉnh (Q6): migration `m0005_user_custom_flag_colors.py`, `features/profile/components/CustomFlagColors.tsx`, `components/diary/FlagPicker.test.tsx` |
| 15 | 23/10/2026 | Bước 7 (ảnh): `core/storage.py`, `routers/photos.py`, `schemas/photos.py`, `services/photos.py`, `tests/fakes.py` (bỏ nhãn (B7)), migration `m0006_user_avatar_key.py`, `tests/api/test_photos.py`; web: `features/entry/uploadPhoto.ts` (thay hàm giả), `uploadPhoto.test.ts`, `e2e/photos.spec.ts`; thư viện `boto3`, `browser-image-compression`, `heic-to` (tải lười) |
| 16 | 23/10/2026 | Bước 8 (dòng thời gian): `GET /entries?month` trong `routers|services|schemas/entries.py`; web `features/timeline/useMonth.ts`, `useQuickScore.ts` dùng API thật, `TimelinePage` vào bản build; `e2e/timeline.spec.ts` |
| 17 | 23/10/2026 | Bước 9 (lịch + thống kê tháng): `routers|schemas|services/calendar.py` (bỏ nhãn (B9)), `tests/api/test_calendar.py`; web `features/timeline/useCalendar.ts`; dải 7 ngày ở Hôm nay đọc `/calendar` |
| 18 | 23/10/2026 | Bước 10 (Year in Pixels): `routers|schemas|services/pixels.py` (bỏ nhãn (B10)), `tests/api/test_pixels.py`; web `features/pixels/usePixels.ts` dùng API, `PixelsPage` vào bản build; `e2e/pixels.spec.ts` |
| 19 | 23/10/2026 | Year in Pixels tô theo màu cờ (tùy chọn): `features/pixels/ColorByFlag.tsx`, `useColorBy.ts` |
| 20 | 23/10/2026 | Bước 11 (tìm kiếm): `routers|schemas|services/search.py` (bỏ nhãn (B11)), migration `m0007_entries_norm_backfill.py`, `tests/api/test_search.py`; web `features/search/useSearch.ts` dùng API, bỏ `searchEntries.test.ts` (tìm ở backend), `SearchPage` vào bản build (không còn route dev nào ngoài /dev/ui); `e2e/search.spec.ts` |
| 21 | 23/10/2026 | Bỏ dữ liệu mẫu ở "sub icon hay dùng" (`GET /sub-icons/top`, `features/entry/useFrequentSubIcons.ts`) và tóm tắt trang chủ (`features/landing/useHomeSummary.ts` đọc `GET /calendar`) |
| 22 | 23/10/2026 | Bước 12 (góp ý): `core/mailer.py`, `routers|schemas|services/feedback.py` (bỏ nhãn (B12) ở feedback), migration `m0008_feedback_emailed_at.py`, `tests/api/test_feedback.py`; web `features/feedback/` (bỏ `.gitkeep`), `e2e/feedback.spec.ts`; Mailpit trong `docker-compose.yml` |
| 23 | 24/10/2026 | Bước 12 (xóa dữ liệu/tài khoản): `schemas|services/account.py`, `app/jobs/__init__.py`, `app/jobs/purge_accounts.py`, `tests/api/test_account.py`; `core/storage.py` thêm `list_keys`/`delete_prefix`; web `features/profile/useJournalData.ts` dùng API, `DeleteData.test.tsx`, `e2e/account.spec.ts` |
| 24 | 24/10/2026 | Bổ sung xóa dữ liệu: migration `m0009_deletion_log.py` (collection `deletion_log`), `core/mailer.py` + cấu hình SMTP + Mailpit (chép nguyên từ nhánh góp ý), `features/entry/Trash.tsx`, `Trash.test.tsx`, `routes/TrashPage.tsx` |
| 25 | 24/10/2026 | Bước 13 (vận hành, phần làm được ở local): `core/observability.py`, `services/maintenance.py`, `app/jobs/run.py`, `backup_db.py`, `backup_photos.py`, `blobstore.py` (bỏ nhãn (B13) ở `jobs/`), `tests/jobs/`, `tests/unit/test_observability.py`, `test_storage.py`; thư viện `sentry-sdk`, `@sentry/react`; web `lib/sentry.ts`, `lib/analytics.ts`, `lib/usage.ts` (+ test), `features/profile/components/StorageUsage.tsx` |
| 26 | 24/10/2026 | Tạm gỡ Sentry và Umami (sẽ thêm lại sau): xóa `core/observability.py`, `tests/unit/test_observability.py`, web `lib/sentry.ts`, `lib/analytics.ts` (+ test); bỏ thư viện `sentry-sdk`, `@sentry/react` |
| 27 | 24/10/2026 | Bước 14 (hiệu năng): `apps/web/scripts/subset_fonts.py`, `src/assets/fonts/` (font tự host + OFL), `src/styles/fonts.css`, `src/routes/prefetch.ts` (+ test); bỏ `@fontsource/be-vietnam-pro`, `@fontsource/young-serif`; trang chủ và /login tải lười |
| 28 | 24/10/2026 | Bước 14 (chính sách quyền riêng tư): `features/legal/PrivacyPolicy.tsx` (+ test), `routes/PrivacyPage.tsx` (/privacy); link "Chính sách quyền riêng tư" ở Landing, đăng nhập, Hồ sơ, trang chia sẻ trỏ tới /privacy |
