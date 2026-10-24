import { useEffect, useRef } from 'react'

/**
 * Phân tích sự kiện bằng Umami (Bước 13, đặc tả 4.7): không cookie, không gửi nội dung nhật ký.
 *
 * - Chỉ 7 sự kiện của đặc tả; props chỉ là boolean hoặc vài giá trị liệt kê sẵn (không chuỗi tự do, không từ khóa,
 *   không ngày cụ thể). Tên hay props sai → bỏ cả sự kiện.
 * - Thiếu VITE_UMAMI_SRC hoặc VITE_UMAMI_WEBSITE_ID → không nạp script, mọi hàm không làm gì.
 * - Tắt pageview tự động của Umami (`data-auto-track="false"`): tự gửi pageview khi đổi route (`startPageviews`)
 *   với đường dẫn đã làm sạch — bỏ query/hash, `/s/<token>` → `/s/:token`, ngày `YYYY-MM-DD` → `:date`.
 *   `data-before-send` làm sạch thêm một lần mọi payload (kể cả do script tự gửi) và chặn sự kiện lạ.
 */

export const EVENTS = [
  'login',
  'entry_created',
  'entry_updated',
  'photo_uploaded',
  'calendar_viewed',
  'pixels_viewed',
  'search_used',
] as const
export type EventName = (typeof EVENTS)[number]

export const RESULT_BUCKETS = ['0', '1-5', '6-20', '21+'] as const
export type ResultBucket = (typeof RESULT_BUCKETS)[number]

export type EventProps = {
  login: undefined
  entry_created: undefined
  entry_updated: undefined
  photo_uploaded: undefined
  calendar_viewed: { current_month: boolean }
  pixels_viewed: { current_year: boolean }
  search_used: { filtered: boolean; results: ResultBucket }
}

type Rule = 'boolean' | readonly string[]
const RULES: Record<EventName, Record<string, Rule>> = {
  login: {},
  entry_created: {},
  entry_updated: {},
  photo_uploaded: {},
  calendar_viewed: { current_month: 'boolean' },
  pixels_viewed: { current_year: 'boolean' },
  search_used: { filtered: 'boolean', results: RESULT_BUCKETS },
}

/** Tên có trong đặc tả và mọi prop đúng khóa, đúng kiểu (thiếu prop thì được, thừa hay sai kiểu thì không). */
export function isValidEvent(name: unknown, props?: unknown): name is EventName {
  if (typeof name !== 'string' || !(EVENTS as readonly string[]).includes(name)) return false
  if (props === undefined || props === null) return true
  if (typeof props !== 'object' || Array.isArray(props)) return false
  const rules = RULES[name as EventName]
  return Object.entries(props).every(([key, value]) => {
    if (!Object.hasOwn(rules, key)) return false
    const rule = rules[key]
    return rule === 'boolean' ? typeof value === 'boolean' : typeof value === 'string' && rule.includes(value)
  })
}

/** Số kết quả tìm kiếm theo khoảng (không gửi số chính xác). */
export function resultBucket(n: number): ResultBucket {
  if (n <= 0) return '0'
  if (n <= 5) return '1-5'
  if (n <= 20) return '6-20'
  return '21+'
}

// ---------- Làm sạch URL (dùng chung với lib/sentry.ts) ----------

const TOKEN_PATH = /^(\/s\/|\/public\/shares\/)[^/]+/
const DATE_SEGMENT = /(^|\/)\d{4}-\d{2}-\d{2}(?=\/|$)/g
const BASE = 'http://jotly.invalid'

/** Che token chia sẻ: `/s/<token>` → `/s/:token`, `/public/shares/<token>` → `/public/shares/:token`. */
export function redactPath(path: string): string {
  return path.replace(TOKEN_PATH, '$1:token')
}

/** Bỏ query và hash, che token. URL tuyệt đối giữ origin; URL tương đối chỉ còn đường dẫn. */
export function cleanUrl(url: string): string {
  try {
    const absolute = /^[a-z][a-z\d+.-]*:\/\//i.test(url)
    const u = new URL(url, BASE)
    const path = redactPath(u.pathname)
    return absolute ? `${u.origin}${path}` : path
  } catch {
    return ''
  }
}

/** Đường dẫn gửi lên Umami: như `cleanUrl` nhưng chỉ còn đường dẫn và ngày cụ thể thành `:date`. */
export function pageviewPath(url: string): string {
  try {
    return redactPath(new URL(url, BASE).pathname).replace(DATE_SEGMENT, '$1:date')
  } catch {
    return '/'
  }
}

/** Referrer: cùng trang → đường dẫn đã làm sạch; trang ngoài → chỉ origin (không đường dẫn, không query). */
export function cleanReferrer(referrer: string): string {
  if (!referrer) return ''
  try {
    const u = new URL(referrer)
    return u.origin === window.location.origin ? pageviewPath(u.pathname) : u.origin
  } catch {
    return ''
  }
}

// ---------- Umami ----------

const TITLE = 'Jotly'
const BEFORE_SEND = '__jotlyUmamiBeforeSend'
const QUEUE_MAX = 30
/** Thuộc tính payload được giữ (theo tài liệu tracker Umami); `id`, `tag` và mọi thứ khác bị bỏ. */
const PAYLOAD_KEYS = ['website', 'hostname', 'language', 'screen', 'url', 'referrer', 'title', 'name', 'data'] as const

type Payload = Record<string, unknown>
type Umami = { track: (payload: (props: Payload) => Payload) => unknown }
type UmamiWindow = Window & { umami?: Umami; [BEFORE_SEND]?: (type: string, payload: unknown) => unknown }

const win = () => window as UmamiWindow
let queue: ((u: Umami) => void)[] = []
let lastPath: string | null = null

function config(): { src: string; websiteId: string } | null {
  const src: unknown = import.meta.env.VITE_UMAMI_SRC
  const websiteId: unknown = import.meta.env.VITE_UMAMI_WEBSITE_ID
  if (typeof src !== 'string' || typeof websiteId !== 'string' || !src.trim() || !websiteId.trim()) return null
  return { src: src.trim(), websiteId: websiteId.trim() }
}

export const analyticsEnabled = () => config() !== null

/**
 * Lớp lọc cuối trước khi script Umami gửi (`data-before-send`): làm sạch url/referrer/title, bỏ thuộc tính lạ;
 * sự kiện ngoài danh sách, props sai, `identify` → hủy (trả `false`).
 */
export function sanitizePayload(type: string, payload: unknown): Payload | false {
  if (type !== 'event' || typeof payload !== 'object' || payload === null) return false
  const p = payload as Payload
  if (p.name !== undefined && !isValidEvent(p.name, p.data)) return false
  if (p.name === undefined && p.data !== undefined) return false
  const out: Payload = {}
  for (const key of PAYLOAD_KEYS) if (p[key] !== undefined) out[key] = p[key]
  out.title = TITLE
  out.url = typeof p.url === 'string' ? pageviewPath(p.url) : '/'
  out.referrer = typeof p.referrer === 'string' ? cleanReferrer(p.referrer) : ''
  return out
}

function send(job: (u: Umami) => void) {
  const umami = win().umami
  if (umami) job(umami)
  else if (queue.length < QUEUE_MAX) queue.push(job)
}

function flush() {
  const umami = win().umami
  if (!umami) return
  const jobs = queue
  queue = []
  jobs.forEach((job) => job(umami))
}

/** Nạp script Umami một lần (gọi ở main.tsx). Thiếu cấu hình thì không làm gì. */
export function initAnalytics(): void {
  const cfg = config()
  if (!cfg || document.querySelector('script[data-jotly-analytics]')) return
  win()[BEFORE_SEND] = sanitizePayload
  const s = document.createElement('script')
  s.defer = true
  s.src = cfg.src
  s.dataset.jotlyAnalytics = ''
  s.dataset.websiteId = cfg.websiteId
  s.dataset.autoTrack = 'false'
  s.dataset.excludeSearch = 'true'
  s.dataset.excludeHash = 'true'
  s.dataset.doNotTrack = 'true'
  s.dataset.beforeSend = BEFORE_SEND
  s.addEventListener('load', flush)
  document.head.appendChild(s)
}

/**
 * Gửi một sự kiện. Trả `true` nếu đã gửi hoặc xếp hàng chờ script nạp xong; `false` nếu sai tên/props
 * hoặc chưa cấu hình. Không bao giờ ném lỗi.
 */
export function track<N extends EventName>(name: N, ...args: EventProps[N] extends undefined ? [] : [EventProps[N]]): boolean {
  const props = args[0] as Payload | undefined
  if (!isValidEvent(name, props) || !config()) return false
  send((u) => u.track((base) => ({ ...base, url: lastPath ?? pageviewPath(window.location.pathname), title: TITLE, name, data: props })))
  return true
}

/** Pageview với đường dẫn đã làm sạch; cùng đường dẫn sạch liên tiếp (vd. chỉ đổi ?m=) chỉ tính một lần. */
export function trackPageview(pathname: string): boolean {
  if (!config()) return false
  const url = pageviewPath(pathname)
  if (url === lastPath) return false
  const referrer = lastPath ?? cleanReferrer(document.referrer)
  lastPath = url
  send((u) => u.track((base) => ({ ...base, url, referrer, title: TITLE })))
  return true
}

type RouterLike = {
  state: { location: { pathname: string } }
  subscribe(fn: (state: { location: { pathname: string } }) => void): () => void
}

/** Pageview đầu tiên và mỗi lần đổi route (router của React Router, gọi ở main.tsx). */
export function startPageviews(router: RouterLike): () => void {
  if (!config()) return () => {}
  trackPageview(router.state.location.pathname)
  return router.subscribe((state) => trackPageview(state.location.pathname))
}

// ---------- Cách đếm từng sự kiện ----------

const LOGIN_KEY = 'jotly.analytics.login'

/**
 * `login`: lần đầu /me thành công trong một phiên của tab (sessionStorage) — gồm đăng nhập mới và mở lại app khi
 * phiên còn hạn. Tải lại trang hay chuyển màn không đếm lại; /me trả 401 (đăng xuất, hết phiên) thì xóa dấu
 * (`forgetLogin`) để lần đăng nhập sau trong cùng tab được đếm.
 */
export function trackLoginOnce(): void {
  if (!config()) return
  try {
    if (sessionStorage.getItem(LOGIN_KEY)) return
    sessionStorage.setItem(LOGIN_KEY, '1')
  } catch {
    // sessionStorage bị chặn: vẫn đếm (có thể trùng khi tải lại trang).
  }
  track('login')
}

export function forgetLogin(): void {
  try {
    sessionStorage.removeItem(LOGIN_KEY)
  } catch {
    // bỏ qua
  }
}

const lastSent = new Map<string, number>()

/**
 * Gửi tối đa một lần mỗi `ms` cho cùng `key` (key chỉ nằm trong bộ nhớ, không gửi đi).
 * Dùng cho `entry_updated`: tự động lưu gọi PUT vài giây một lần khi đang gõ.
 */
export function trackThrottled<N extends EventName>(
  key: string,
  ms: number,
  name: N,
  ...args: EventProps[N] extends undefined ? [] : [EventProps[N]]
): boolean {
  const now = Date.now()
  const last = lastSent.get(`${name}:${key}`)
  if (last !== undefined && now - last < ms) return false
  const sent = track(name, ...args)
  if (sent) lastSent.set(`${name}:${key}`, now)
  return sent
}

/**
 * Sự kiện "đã xem" (calendar_viewed, pixels_viewed): gửi khi `key` (tháng/năm đang xem, đã tải xong) đổi;
 * `null` = chưa có dữ liệu. Mỗi lần mở màn, mỗi tháng/năm tính một lần; key không gửi đi, chỉ gửi `current`
 * (đang xem tháng/năm hiện tại hay không).
 */
export function useTrackView(name: 'calendar_viewed' | 'pixels_viewed', key: string | null, current: boolean) {
  const last = useRef<string | null>(null)
  useEffect(() => {
    if (key === null || last.current === key) return
    last.current = key
    if (name === 'calendar_viewed') track(name, { current_month: current })
    else track(name, { current_year: current })
  }, [name, key, current])
}

/** Chỉ cho test: xóa trạng thái trong bộ nhớ. */
export function resetAnalyticsForTest() {
  queue = []
  lastPath = null
  lastSent.clear()
}
