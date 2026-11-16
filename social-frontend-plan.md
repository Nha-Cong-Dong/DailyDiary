# BUILD PLAN — Frontend Social (Giai đoạn 1): Bạn bè + Sổ chung + Ảnh chung

> File này là **kế hoạch build chi tiết** để thực thi, không phải bản phác.
> Trạng thái hiện tại (đã xác nhận trên `feat/social-journal`):
> - Backend Social (F-11/ADR-0007, commit `784db7f`) đã xong + có test.
> - `npm run gen:api` đã chạy: `apps/web/src/api/openapi.json` + `schema.d.ts` **đã chứa** mọi endpoint Social.
> - **Chưa có UI** (grep `friend`/`journal` trong `apps/web/src` → 0 file). Đây là phần mình sẽ build theo plan này.

## 0. Những gì đã chốt (input cho build)

- **Phạm vi:** build thật **toàn bộ Giai đoạn 1** (mã bạn, danh sách bạn, yêu cầu kết bạn, sổ chung, ghi/xóa mục chung, ảnh chung ≤2/mục) + **1 file preview HTML mock** (artifact, không cần backend).
- **Constraint kỹ thuật bắt buộc (CLAUDE.md / web-conventions):**
  - Mọi gọi API qua TanStack Query (`useQuery`/`useMutation`), key dạng `['social', ...]`.
  - Giới hạn (số ảnh, độ dài, rate) **chỉ đọc từ `shared/limits.json`** (frontend qua `@/lib/limits.ts`, dùng `tierLimits(tier)`), không hard-code.
  - `entry_date` là chuỗi `YYYY-MM-DD` theo múi giờ hồ sơ (`@/lib/date.ts`: `todayIn(tz)`, `addDays`, `isValidDate`). Không dùng `new Date().toISOString()`.
  - Ảnh tải lên bằng **presigned PUT trực tiếp lên kho** (không qua backend), reuse pattern `features/entry/uploadPhoto.ts`.
  - Thêm i18n namespace `social` cho cả `vi` và `en`; dùng `useT`.
  - Component ưu tiên shadcn/diary có sẵn; không tạo design mới. Không hex tự viết, dùng token (`bg-paper`,`bg-card`,`text-ink-soft`,`border-stroke`,`shadow-md`,`shadow-accent`,`animate-rise`).
  - Phải dùng được từ 360px; mobile dùng `BottomSheet`, desktop `Dialog`.
  - Có đủ 3 trạng thái: loading / error / empty cho mọi danh sách.
  - Đổi API backend thì chạy lại `npm run gen:api` + commit `openapi.json` & `schema.d.ts` (đã làm ở bước 0).
- **Cài đặt đã có sẵn** (`package.json`): `openapi-fetch`, `@tanstack/react-query`, `react-router@8`, `i18next`, `lucide-react`, `radix-ui`, `date-fns`/`date-fns-tz`, `browser-image-compression`, `heic-to`. Không cần cài thêm.

## 1. Backend API cần gọi (đã xác nhận endpoint + schema)

### Friendships (routers/friendships.py, prefix không có → route tuyệt đối)
| Method | Path | Body | Response | Ghi chú |
|---|---|---|---|---|
| GET | `/me/friend-code` | — | `FriendCodeOut {friend_code}` | mã của tôi |
| POST | `/me/friend-code/rotate` | — | `FriendCodeOut` | xoay, mã cũ chết ngay |
| GET | `/friends` | — | `FriendListOut {friends[], friends_max, journals_max, friends_count, journals_count}` | kèm trần theo tier |
| GET | `/friends/requests` | — | `FriendRequestListOut {incoming[], outgoing[]}` | mỗi item: `id,direction,display_name,avatar_url,status,created_at,expires_at` |
| POST | `/friends/requests` | `FriendRequestIn {code}` (min4 max16) | `FriendRequestOut` | gửi bằng mã bạn người khác; sai → 404 chung |
| POST | `/friends/requests/{id}/accept` | — | 204 | chỉ người được mời |
| POST | `/friends/requests/{id}/decline` | — | 204 | |
| DELETE | `/friends/{journal_id}` | — | 204 | kết thúc sổ chung (id là journal active của bạn đó) |

### Shared Journals (routers/shared_journals.py)
| Method | Path | Body | Response |
|---|---|---|---|
| GET | `/journals` | — | `JournalListOut {journals[], journals_max, journals_count}` |
| GET | `/journals/{journal_id}` | — | `JournalDetailOut` (JournalOut + `members[{display_name,avatar_url,role}]`) |
| GET | `/journals/{journal_id}/entries?cursor=` | — | `SharedEntryPageOut {entries[], next_cursor\|null}` (mới nhất trước) |
| PUT | `/journals/{journal_id}/entries/{day}` | `SharedEntryWrite {score 1..5, title?, content?, sub_icon?, flag_color?, updated_at?}` | `SharedEntryOut` (gửi `updated_at` để chống 409) |
| DELETE | `/journals/{journal_id}/entries/{day}` | — | 204 (xóa mềm mục của tôi) |
| POST | `/journals/{journal_id}/photos/upload-url?day=` | `SharedPhotoUploadIn {content_type}` | `SharedPhotoUploadOut {photo_id,upload_url,thumb_upload_url,headers,expires_in}` |
| POST | `/journals/{journal_id}/photos?day=` | `SharedPhotoConfirmIn {photo_id,content_type,width,height}` | `SharedEntryOut` |
| PATCH | `/journals/{journal_id}/photos/order?day=` | `SharedPhotoOrderIn {photo_ids[]}` | `SharedEntryOut` |
| DELETE | `/photos/{photo_id}` (route generic) | — | 204 (xóa ảnh, mine) |

Schema chi tiết đã xác nhận trong `schema.d.ts`:
- `SharedEntryOut {entry_date,score,title,content,sub_icon,flag_color,photos[SharedEntryPhotoOut],author_display_name,author_avatar_url,mine,created_at,updated_at}`
- `SharedEntryPhotoOut {id,position,width,height,url,thumb_url}`
- `JournalOut {id,status,mode,partner_display_name,partner_avatar_url,created_at,ended_at,warm_streak,synced_days,longest_warm_streak,my_today_entry}`

### Giới hạn (đọc từ `shared/limits.json`, KHÔNG hard-code)
- Giai đoạn 1: **mọi tier = 20 bạn / 10 sổ**. Ảnh chung tối đa 2/mục (nhóm `shared`). Độ dài title/content theo `shared`.
- Lấy về phía UI: `tierLimits(profile.account_tier)` (từ `@/lib/limits.ts`), hoặc dùng `friends_max/journals_max` mà backend đã trả trong `FriendListOut`/`JournalListOut` (phương án an toàn: **hiện "x/y" từ response** để không phải đọc tier).

## 2. Cấu trúc file sẽ tạo (theo cây Project_Structure.md)

```
apps/web/src/
├── locales/
│   ├── vi/social.ts          # (MỚI) bản dịch tiếng Việt — nguồn chuẩn
│   ├── en/social.ts          # (MỚI) bản dịch tiếng Anh (cùng shape)
│   ├── vi/index.ts          # (SỬA) import + thêm key `social`
│   └── en/index.ts          # (SỬA) import + thêm key `social`
├── features/social/
│   ├── social.ts            # (MỚI) type + hàm thuần + queryOptions (key khai báo 1 chỗ)
│   ├── useSocial.ts         # (MỚI) useFriends/useRequests/useJournals/useJournalDetail/useJournalEntries + mutations
│   ├── sharedPhotoUpload.ts # (MỚI) presigned flow cho ảnh chung (copy pattern uploadPhoto.ts)
│   ├── SocialPage.tsx       # (MỚI) trang gốc ghép các section
│   ├── SocialPage.test.tsx  # (MỚI) test empty/loading + 1 mutation happy path (mock api)
│   └── components/          # (MỚI, vì ≥6 component) tách:
│       ├── FriendCodeCard.tsx
│       ├── SendRequestForm.tsx
│       ├── RequestsPanel.tsx
│       ├── FriendsList.tsx
│       ├── JournalsList.tsx
│       ├── JournalDetail.tsx
│       ├── SharedEntryForm.tsx
│       ├── SharedEntryFeed.tsx
│       └── SharedPhotos.tsx
└── routes/
    └── SocialPage.tsx       # (MỚI) thin wrapper → import feature, lazy
```
> Quy ước feature **phẳng**; chỉ tách `components/` khi ≥6 component (đúng chuẩn). `routes/` chỉ ghép, không gọi API.

## 3. i18n namespace `social` (bước làm đầu, vì UI phụ thuộc)

- `vi/social.ts` nhóm: `title`, `friendCode` (code, copy, copied, rotate, rotateConfirm), `sendRequest` (label, submit, limit, notFound), `requests` (incoming, outgoing, accept, decline, empty), `friends` (header, count, empty, openJournal, ended, statusActive/Ended), `journals` (header, empty, warmStreak, syncedDays, longestWarm, todayEntry, members, view), `entry` (write, score, title, content, subIcon, flagColor, save, saveConflict409, delete, mine, theirs, empty), `photos` (add, uploading, full2, delete, error), `states` (loading, error, retry, emptyTitle, emptyBody).
- `en/social.ts` cùng khóa (giá trị EN).
- Đăng ký `social` vào `vi/index.ts` & `en/index.ts`. `i18next.d.ts`/`shape.ts` tự suy (cùng `share`), không sửa tay.
- Dùng `useT()` → `t('social:...')`.

## 4. API layer + hooks (`features/social`)

`social.ts` (thuần, dùng `@/api/client` + `@/api/schema`):
```ts
type Schemas = components['schemas']
export type FriendList = Schemas['FriendListOut']
export type FriendRequestList = Schemas['FriendRequestListOut']
export type JournalList = Schemas['JournalListOut']
export type JournalDetail = Schemas['JournalDetailOut']
export type SharedEntryPage = Schemas['SharedEntryPageOut']
export type SharedEntryWrite = Schemas['SharedEntryWrite']
```
Query keys (1 chỗ, `queryOptions`):
- `['social','friends']`, `['social','requests']`, `['social','journals']`,
  `['social','journal',id]`, `['social','entries',id,cursor]`, `['social','friend-code']`

`useSocial.ts`:
- `useFriends()`, `useFriendRequests()`, `useJournals()`, `useFriendCode()`,
  `useJournalDetail(id)`, `useJournalEntries(id)` (infinite theo `next_cursor`).
- Mutations (mỗi cái `scope` theo resource để serialize):
  - `useRotateFriendCode` → set `['social','friend-code']`
  - `useSendRequest(code)` → invalidate `requests`+`friends`
  - `useAccept(id)` / `useDecline(id)` → invalidate `requests`+`friends`+`journals`
  - `useEndJournal(journalId)` → invalidate `friends`+`journals`
  - `useSaveSharedEntry(journalId, day)` → `PUT /journals/{id}/entries/{day}`, gửi `updated_at` (xử lý 409 như entry); set entries cache
  - `useDeleteSharedEntry(journalId, day)` → invalidate entries
- Mỗi fn: `const {data,error,response} = await api.METHOD('...'); if(error) throw toApiError(response,error)`.

`sharedPhotoUpload.ts` (copy `uploadPhoto.ts`):
- `makeSharedUpload(journalId, day, onEntry)` → `POST /journals/{id}/photos/upload-url?day` (query `day` bắt buộc) → `putBlob(main)` + `putBlob(thumb)` → `POST /journals/{id}/photos?day` (confirm `SharedPhotoConfirmIn`).
- `reorderSharedPhotos(journalId, day, ids)` → `PATCH .../photos/order?day`.
- `deleteSharedPhoto(id)` → `DELETE /photos/{id}` (404 coi như xong).
- Max ảnh = `tierLimits().shared?.photos_per_entry_max ?? 2` — đọc từ limits (kèm fallback an toàn).

## 5. UI — `SocialPage` + components (gắn design system có sẵn)

Layout: 1 trang `/social` trong `AppShell`, sticky header + nội dung `max-w-[1120px]`. Sections:

1. **Mã bạn** (`FriendCodeCard`): hiện code (font chữ lớn), nút **Copy** (`navigator.clipboard`) + **Xoay mã** (AlertDialog confirm: "Mã cũ sẽ ngừng hoạt động"). Trạng thái đang tải.
2. **Kết bạn** (`SendRequestForm`): input mã bạn khác → `useSendRequest`; khi `friends_count === friends_max` (trần từ response) disable + hiện "Đã đạt giới hạn". Lỗi "không tìm thấy" (404) hiện message thân thiện.
3. **Yêu cầu** (`RequestsPanel`): 2 nhóm **Đến** (Accept/Decline) và **Đi** (đang chờ). Empty state.
4. **Bạn bè** (`FriendsList`): list friend (Avatar, tên, `journal_status`); nếu có `journal_id` → nút "Mở sổ chung" trỏ sang section sổ chung. Show "x/y bạn".
5. **Sổ chung** (`JournalsList`): list journal (partner tên+avatar, `warm_streak`, `synced_days`, ended badge); bấm mở detail. Show "x/y sổ".
6. **Chi tiết sổ** (`JournalDetail`): header thành viên (`members`) + 3 chuỗi; **form ghi mục** của tôi (`SharedEntryForm`: `ScorePicker` + title + content + `SubIconPicker` + `FlagPicker`, lưu bằng `useSaveSharedEntry` có autosave-lite + xử lý 409); **feed mục cả 2** (`SharedEntryFeed`: dùng `useJournalEntries` infinite, thẻ dùng `NotebookPage`/`EntryCard`, đánh dấu `mine`); **ảnh chung** (`SharedPhotos`: max 2, dùng `usePhotoUploads`+`sharedPhotoUpload`, `PhotoViewer`, reorder/xóa). Ended journal: ẩn form + chỉ đọc.
7. Trạng thái: loading skeleton (mẫu `PageStates`), error (`Alert`+retry), empty (CTA "Mời bạn bằng mã trên").

Responsive: ≥768px form/ảnh trong `Dialog`; <768px trong `BottomSheet`. `useNow()` để "hôm nay" tự sang ngày.

## 6. Route + điều hướng
- `routes/SocialPage.tsx` (thin) lazy import `features/social/SocialPage`.
- `routes/router.tsx`: thêm `{ path:'social', lazy: SocialPage }` vào nhóm `RequireAuth` (cùng tầng timeline).
- `components/layout/AppNav.tsx`: thêm item **Social** (icon `Users`) vào `ITEMS` desktop; mobile thành **tab thứ 5** (thay thế `pixels` nếu chật — quyết định: giữ 5 tab, nếu layout vỡ thì Social desktop-only).
- Cập nhật `prefetch.ts` (tùy chọn) để warm `/social` sau `/me`.

## 7. Preview artifact (mock, self-contained)
- 1 file HTML (VD: `apps/web/social-preview.html` hoặc `project-map/`): render bằng **mock data** (không gọi backend, không fake người thật): mã bạn, danh sách bạn (mock), yêu cầu (mock), 1 sổ chung (mock) với form + feed + ô ảnh placeholder.
- Dùng token màu Jotly (paper/ink/peach/lavender) + font Commissioner để giống app thật; mobile+desktop.
- Publish bằng tool **Artifact** để mở trong trình duyệt / Claude Desktop không cần server.

## 8. Cấu trúc project (CLAUDE.md: sửa cùng commit)
- `docs/Project_Structure.md`: thêm `features/social/` (mô tả các component), `locales/{vi,en}/social.ts`, `routes/SocialPage.tsx` (vào list route trong app), cập nhật `components/layout` nav. Thêm 1 dòng "Lịch sử thay đổi" (phiên bản 41).
- Nếu tạo `social-preview.html` ở vị trí mới → cập nhật cây + ADR ngắn nếu là cấp cao (thường chỉ cần 1 dòng).

## 9. Kiểm thử & CI (bắt buộc trước khi báo xong)
- `cd apps/web && npm run lint && npm run typecheck && npm test && npm run build`
- `SocialPage.test.tsx`: empty + loading + 1 mutation (accept request) happy path (mock `api`, dùng `@/test/withMe`).
- (Tùy) `e2e/social.spec.ts`: dev-login → `/social` (cần backend :8001).
- Đối chiếu cây `docs/Project_Structure.md` với thư mục thật.

## 10. Thứ tự thực thi (checklist)
1. i18n `social` (vi+en) + đăng ký index.
2. `features/social/social.ts` (type+keys) + `useSocial.ts` (hooks) + `sharedPhotoUpload.ts`.
3. Components (FriendCodeCard, SendRequestForm, RequestsPanel, FriendsList, JournalsList, JournalDetail, SharedEntryForm, SharedEntryFeed, SharedPhotos) + `SocialPage.tsx`.
4. `routes/SocialPage.tsx` + `router.tsx` + `AppNav.tsx` (+ `prefetch.ts` tùy chọn).
5. `SocialPage.test.tsx`.
6. Preview artifact (HTML mock) + publish.
7. `docs/Project_Structure.md` (1 dòng + cập nhật cây).
8. CI: lint/typecheck/test/build. Chạy thử web (backend terminal riêng).

## 11. Commit đề xuất (EN + VI, git conventions)
- `feat(web): add Social section (friend code, friends, shared journals, shared photos)`
- `feat(web): thêm mục Social (mã bạn, bạn bè, sổ chung, ảnh chung)`
- (nếu tách) `docs(web): sync Project_Structure with social feature` / `docs(web): đồng bộ cây dự án với tính năng Social`

## Không làm (để giai đoạn sau)
- Chế độ luân turn + chuỗi nâng cao (Giai đoạn 2), nhóm/tổ chức (Giai đoạn 3).
