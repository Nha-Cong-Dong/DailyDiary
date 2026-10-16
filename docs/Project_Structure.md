# DailyDiary – Cây dự án chuẩn

|                  |                                                                                |
| ---------------- | ------------------------------------------------------------------------------ |
| **Vai trò**      | Nguồn chuẩn **duy nhất** cho cấu trúc thư mục. Tài liệu và skill khác chỉ link tới đây. |
| **Phiên bản**    | 2 (17/10/2026), xem [Lịch sử thay đổi](#lịch-sử-thay-đổi)                      |
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
    │   │   │   ├── logging.py        # log request (không ghi body/query)
    │   │   │   ├── limits.py         # đọc shared/limits.json
    │   │   │   ├── rate_limit.py     # slowapi limiter + handler 429
    │   │   │   ├── text.py           # (B5) chuẩn hóa NFC, norm từ khóa không dấu
    │   │   │   ├── security.py       # (B3) cookie phiên, get_current_user, CSRF
    │   │   │   ├── oauth.py          # (B3) Authlib Google
    │   │   │   └── storage.py        # (B7) boto3, presigned URL
    │   │   ├── db/
    │   │   │   ├── client.py         # AsyncMongoClient, dependency Db
    │   │   │   ├── collections.py    # tên collection
    │   │   │   ├── migrate.py        # python -m app.db.migrate
    │   │   │   └── migrations/       # m0001_initial.py, m0002_<mo_ta>.py ...
    │   │   ├── schemas/              # Pydantic, một file mỗi tài nguyên: XxxCreate/XxxUpdate/XxxOut
    │   │   ├── services/             # nghiệp vụ + truy vấn MongoDB; tham số đầu là user_id
    │   │   ├── routers/              # health; (B3) auth, me; (B5) entries; (B7) photos; (B9) calendar;
    │   │   │                         # (B10) pixels; (B11) search; (B12) export, feedback
    │   │   └── jobs/                 # (B12–B13) dọn bài xóa mềm, hoàn tất xóa tài khoản, sao lưu
    │   ├── scripts/                  # công cụ chạy tay, dùng môi trường của api (uv run python scripts/...)
    │   │   ├── export_openapi.py     # xuất OpenAPI cho web (npm run gen:api, CI kiểm tra lệch)
    │   │   └── seed_demo.py          # (B14) nạp dữ liệu mẫu 3 tháng vào DB local
    │   └── tests/
    │       ├── conftest.py           # DB *_test, client; (B3) người dùng alice/bob
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
        ├── public/                   # file tĩnh phục vụ nguyên trạng (favicon; (B2) hình biểu tượng)
        ├── e2e/                      # smoke test Playwright: <luồng>.spec.ts
        └── src/
            ├── main.tsx  App.tsx  index.css  vite-env.d.ts
            ├── api/
            │   ├── client.ts         # openapi-fetch, credentials: "include"
            │   ├── openapi.json      # [sinh tự động] từ scripts/export_openapi.py
            │   └── schema.d.ts       # [sinh tự động] npm run gen:api
            ├── routes/               # router.tsx, RootLayout.tsx, <Tên>Page.tsx (mỏng, ghép từ features)
            ├── features/             # mỗi tính năng một thư mục
            │   ├── health/           # kiểm tra kết nối API
            │   ├── auth/             # (B3) đăng nhập, bảo vệ route
            │   ├── profile/          # (B3) hồ sơ; (B12) xuất dữ liệu, xóa tài khoản
            │   ├── entry/            # (B5–B7) viết nhật ký, ảnh, trạng thái tự động lưu
            │   ├── timeline/         # (B8) dòng thời gian
            │   ├── calendar/         # (B9) lịch tháng + thống kê tháng
            │   ├── pixels/           # (B10) Year in Pixels
            │   ├── search/           # (B11) tìm kiếm
            │   └── feedback/         # (B12) góp ý
            ├── components/
            │   ├── ui/               # component shadcn: npx shadcn@4.22.0 add <tên>
            │   └── layout/           # (B2) thanh điều hướng, khung trang dùng chung
            ├── lib/                  # query.ts, limits.ts, utils.ts; (B3) date.ts;
            │                         # (B6) autosave.ts, storage.ts (IndexedDB); (B7) image.ts
            ├── styles/               # shadcn-tailwind.css (vendored), CSS dùng chung
            └── test/setup.ts         # cấu hình Vitest
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
