import * as Sentry from '@sentry/react'
import type { Breadcrumb, BrowserOptions, ErrorEvent, Exception } from '@sentry/react'
import { cleanUrl } from './analytics'

/**
 * Sentry cho web (Bước 13, đặc tả 4.1 "Công cụ bắt lỗi": lọc nội dung nhật ký khỏi dữ liệu gửi về).
 * Để trống VITE_SENTRY_DSN thì không khởi tạo. Không bật Session Replay, không bật tracing.
 *
 * SDK v11 bỏ `sendDefaultPii`, thay bằng `dataCollection` (mặc định THU THẬP header, cookie, query, body) →
 * tắt từng mục. Sau đó `beforeSend`/`beforeBreadcrumb` lọc thêm theo danh sách cho phép:
 * - URL (trang, fetch/xhr, điều hướng, file trong stack): bỏ query và hash (`/search?q=<từ khóa>`), che `/s/<token>`.
 * - Request: bỏ body, query, cookie; header chỉ giữ User-Agent (bỏ Referer: có thể mang token / query).
 * - Breadcrumb: bỏ `ui.click`/`ui.input` (chữ của phần tử có thể là tiêu đề nhật ký), `console` và mọi loại khác;
 *   chỉ giữ điều hướng (from/to đã làm sạch) và fetch/xhr (method, đường dẫn đã làm sạch, mã trạng thái).
 * - Thông điệp lỗi: GIỮ (stack đã rút gọn nên thiếu thông điệp thì khó sửa lỗi) nhưng làm sạch URL, che token, thay
 *   đoạn trong ngoặc kép (vd. `"Hôm nay mì"... is not valid JSON` của JSON.parse) và cắt còn 200 ký tự.
 * - `user` chỉ giữ `id`; bỏ `extra`; `contexts` chỉ giữ vài nhóm kỹ thuật.
 */

const FILTERED = '[đã lọc]'
const MAX_MESSAGE = 200
const SAFE_CONTEXTS = ['trace', 'os', 'browser', 'device', 'culture', 'react', 'runtime']
const URL_IN_TEXT = /\bhttps?:\/\/[^\s"'<>)]+/gi
const PATH_TOKEN_IN_TEXT = /(\/s\/|\/public\/shares\/)[^\s/"'<>?#)]+/g
const QUOTED = /"[^"]*"/g

/** Làm sạch thông điệp lỗi tự do. */
export function scrubMessage(text: string): string {
  const cleaned = text
    .replace(URL_IN_TEXT, (url) => cleanUrl(url))
    .replace(PATH_TOKEN_IN_TEXT, '$1:token')
    .replace(QUOTED, `"${FILTERED}"`)
  return cleaned.length > MAX_MESSAGE ? `${cleaned.slice(0, MAX_MESSAGE)}…` : cleaned
}

const MECHANISM_KEYS = ['type', 'handled', 'synthetic', 'source', 'exception_id', 'parent_id', 'is_exception_group'] as const

function pick<T extends object, K extends keyof T>(obj: T, keys: readonly K[]): Pick<T, K> {
  return Object.fromEntries(keys.filter((k) => obj[k] !== undefined).map((k) => [k, obj[k]])) as Pick<T, K>
}

const str = (v: unknown) => (typeof v === 'string' ? v : undefined)
/** Chỉ làm sạch chuỗi trông như URL/đường dẫn; tên như `<anonymous>` hay `app.routers` giữ nguyên. */
const cleanIfUrl = (v: string) => (/^[a-z][a-z\d+.-]*:\/\/|^\//i.test(v) ? cleanUrl(v) || FILTERED : v)

/** beforeBreadcrumb: chỉ giữ điều hướng và fetch/xhr, đã bỏ query/hash và che token. */
export function scrubBreadcrumb(crumb: Breadcrumb): Breadcrumb | null {
  const { category, data } = crumb
  const base: Breadcrumb = { type: crumb.type, category, level: crumb.level, timestamp: crumb.timestamp }
  if (category === 'navigation') {
    const from = str(data?.from)
    const to = str(data?.to)
    return { ...base, data: { ...(from !== undefined && { from: cleanUrl(from) }), ...(to !== undefined && { to: cleanUrl(to) }) } }
  }
  if (category === 'fetch' || category === 'xhr') {
    const url = str(data?.url)
    return {
      ...base,
      data: {
        ...(str(data?.method) && { method: data?.method }),
        ...(url !== undefined && { url: cleanUrl(url) }),
        ...(typeof data?.status_code === 'number' && { status_code: data.status_code }),
      },
    }
  }
  return null
}

function scrubException(value: Exception): Exception {
  const frames = value.stacktrace?.frames?.map((f) => {
    const { vars: _vars, ...frame } = f
    return {
      ...frame,
      ...(frame.filename !== undefined && { filename: cleanIfUrl(frame.filename) }),
      ...(frame.abs_path !== undefined && { abs_path: cleanIfUrl(frame.abs_path) }),
    }
  })
  return {
    type: value.type,
    ...(value.value !== undefined && { value: scrubMessage(value.value) }),
    ...(value.module !== undefined && { module: value.module }),
    // mechanism: bỏ `data` (tự do); giữ các khóa nối lỗi gốc ↔ cause (linkedErrors).
    ...(value.mechanism !== undefined && { mechanism: pick(value.mechanism, MECHANISM_KEYS) }),
    ...(frames && { stacktrace: { ...value.stacktrace, frames } }),
  }
}

/** beforeSend: bỏ mọi thứ có thể chứa nội dung nhật ký, từ khóa, token chia sẻ hay dữ liệu cá nhân. */
export function scrubEvent<E extends ErrorEvent>(event: E): E {
  const out: E = { ...event }
  if (event.request) {
    const ua = event.request.headers?.['User-Agent']
    out.request = {
      ...(event.request.url !== undefined && { url: cleanUrl(event.request.url) }),
      ...(event.request.method !== undefined && { method: event.request.method }),
      ...(ua !== undefined && { headers: { 'User-Agent': ua } }),
    }
  }
  if (event.transaction !== undefined) out.transaction = cleanIfUrl(event.transaction)
  if (event.message !== undefined) out.message = scrubMessage(event.message)
  if (event.exception?.values) out.exception = { values: event.exception.values.map(scrubException) }
  if (event.breadcrumbs) {
    out.breadcrumbs = event.breadcrumbs.map(scrubBreadcrumb).filter((b): b is Breadcrumb => b !== null)
  }
  const userId = event.user?.id
  if (userId !== undefined && userId !== null && userId !== '') out.user = { id: String(userId) }
  else delete out.user
  delete out.extra
  if (event.contexts) {
    out.contexts = Object.fromEntries(Object.entries(event.contexts).filter(([k]) => SAFE_CONTEXTS.includes(k)))
  }
  return out
}

let enabled = false

/** Khởi tạo Sentry nếu có VITE_SENTRY_DSN (gọi một lần ở main.tsx). `testTransport` chỉ dùng trong test. */
export function initSentry(testTransport?: BrowserOptions['transport']): boolean {
  const dsn: unknown = import.meta.env.VITE_SENTRY_DSN
  if (typeof dsn !== 'string' || !dsn.trim()) return false
  enabled = true
  Sentry.init({
    dsn: dsn.trim(),
    environment: import.meta.env.MODE,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      graphQL: { document: false, variables: false },
      genAI: { inputs: false, outputs: false },
      databaseQueryData: false,
      queues: false,
      stackFrameVariables: false,
    },
    // Không thu breadcrumb console (Console), click/gõ phím (dom) và sự kiện Sentry trước đó (sentry: chứa thông
    // điệp lỗi) ngay từ đầu; beforeBreadcrumb vẫn lọc thêm một lớp.
    integrations: (defaults) => [
      ...defaults.filter((i) => i.name !== 'Console' && i.name !== 'Breadcrumbs'),
      Sentry.breadcrumbsIntegration({ dom: false, sentry: false }),
    ],
    beforeBreadcrumb: (crumb) => scrubBreadcrumb(crumb),
    beforeSend: (event) => scrubEvent(event),
    ...(testTransport && { transport: testTransport }),
  })
  return true
}

/**
 * Tùy chọn cho `createRoot`: lỗi render bị error boundary của router bắt (màn ErrorPage) không tới `window.onerror`,
 * nên báo qua `onCaughtError`/`onUncaughtError` của React 19. Sentry tắt → `{}` (React giữ cách mặc định).
 */
export function rootErrorOptions() {
  if (!enabled) return {}
  const report = Sentry.reactErrorHandler((error: unknown) => console.error(error))
  return { onCaughtError: report, onUncaughtError: report }
}
