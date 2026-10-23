import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import type { components } from '@/api/schema'
import { ME_KEY, type Me } from '@/lib/profile'
import { matches } from '@/lib/text'

type EntryOut = components['schemas']['EntryOut']

/** Hồ sơ mẫu cho test (đúng dạng MeOut của API). */
export function makeMe(overrides: Partial<Me> = {}): Me {
  return {
    email: 'an@example.com',
    display_name: 'Minh An',
    avatar_url: null,
    timezone: 'Asia/Ho_Chi_Minh',
    icon_set_id: 'sprout',
    account_tier: 'beta',
    joined_at: '2025-09-01T00:00:00Z',
    onboarded: true,
    custom_flag_colors: [],
    ...overrides,
  }
}

/** Trang mẫu đúng dạng EntryOut của API. */
export function makeEntry(entry_date: string, overrides: Partial<EntryOut> = {}): EntryOut {
  return {
    entry_date,
    score: 4,
    title: null,
    content: null,
    sub_icon: null,
    flag_color: null,
    keywords: [],
    photos: [],
    created_at: `${entry_date}T14:04:00.000Z`,
    updated_at: `${entry_date}T14:04:00.000Z`,
    ...overrides,
  }
}

/**
 * Giả lập API: GET /me trả `me`, PATCH /me gộp body vào `me`, POST /auth/logout trả 204.
 * Nhật ký (`entries`, theo ngày) làm giống backend: 404 khi chưa có, 409 khi `updated_at` lệch hoặc tạo trùng,
 * xóa mềm và khôi phục. Tháng (GET /entries?month): tóm tắt mới nhất trước; lịch (GET /calendar/{y}/{m}), Year in Pixels (GET /pixels/{year}),
 * tìm kiếm (GET /search, GET /keywords/top). Ảnh: xóa và sắp xếp lại.
 * Chia sẻ: chưa có link nào.
 * Trả về danh sách request đã gửi để test kiểm tra.
 */
export function mockApi(me: Me, entries: Record<string, EntryOut> = {}) {
  const deleted: Record<string, EntryOut> = {}
  let tick = 0
  const calls: { method: string; path: string; body: unknown; csrf: string | null }[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input instanceof Request ? input : new Request(String(input))
    const path = new URL(request.url).pathname
    const body = request.method === 'GET' ? undefined : await request.clone().json().catch(() => undefined)
    calls.push({ method: request.method, path, body, csrf: request.headers.get('X-CSRF-Token') })
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (path === '/me' && request.method === 'GET') return json(me)
    if (path === '/me' && request.method === 'PATCH') {
      const patch = body as Record<string, unknown>
      Object.assign(me, patch, patch.onboarded ? { onboarded: true } : {})
      return json(me)
    }
    if (path === '/auth/logout') return new Response(null, { status: 204 })
    if (path === '/search' && request.method === 'GET') {
      // Bản gọn của backend: khớp chuỗi con (lib/text, cùng quy tắc có dấu/không dấu), lọc điểm, có ảnh; một trang.
      const params = new URL(request.url).searchParams
      const q = params.get('q') ?? ''
      const scores = params.getAll('score').map(Number)
      const hit = Object.values(entries)
        .filter((e) => [e.title ?? '', e.content ?? '', ...e.keywords].some((t) => matches(t, q)))
        .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
      const results = hit
        .filter((e) => (!scores.length || scores.includes(e.score)) && (params.get('has_photo') !== 'true' || e.photos.length))
        .map(({ content, photos, updated_at: _u, created_at: _c, ...e }) => ({ ...e, excerpt: content, photo_count: photos.length }))
      return json({ results, matched: hit.length, total: results.length, next_cursor: null })
    }
    if (path === '/keywords/top') {
      const count = new Map<string, number>()
      for (const e of Object.values(entries)) for (const k of e.keywords) count.set(k, (count.get(k) ?? 0) + 1)
      const keywords = [...count.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'vi')).slice(0, 6).map(([k]) => k)
      return json({ keywords })
    }
    const pixels = path.match(/^\/pixels\/(\d{4})$/)
    if (pixels && request.method === 'GET') {
      const year = Number(pixels[1])
      const first = Date.UTC(year, 0, 1)
      const length = (Date.UTC(year + 1, 0, 1) - first) / 86_400_000
      const scores = Array<string>(length).fill('0')
      const flags: Record<number, string> = {}
      for (const e of Object.values(entries)) {
        if (!e.entry_date.startsWith(`${year}-`)) continue
        const i = (Date.parse(`${e.entry_date}T00:00:00Z`) - first) / 86_400_000
        scores[i] = String(e.score)
        if (e.flag_color) flags[i] = e.flag_color
      }
      const years = [...new Set(Object.values(entries).map((e) => Number(e.entry_date.slice(0, 4))))].sort()
      return json({ year, years, scores: scores.join(''), flags, backfilled: [], stats: { longest_streak: 0, current_streak: 0 } })
    }
    const calendar = path.match(/^\/calendar\/(\d{4})\/(\d{1,2})$/)
    if (calendar && request.method === 'GET') {
      // Bản gọn của backend: chuỗi chỉ đếm ngày liên tiếp (không xét ghi bù), hiện tại tính tới hôm nay/hôm qua.
      const month = `${calendar[1]}-${calendar[2].padStart(2, '0')}`
      const all = Object.values(entries).map((e) => e.entry_date)
      const days = Object.values(entries)
        .filter((e) => e.entry_date.startsWith(`${month}-`))
        .sort((a, b) => a.entry_date.localeCompare(b.entry_date))
        .map((e) => ({ entry_date: e.entry_date, score: e.score, sub_icon: e.sub_icon, flag_color: e.flag_color, photo_count: e.photos.length, backfilled: false }))
      const shift = (d: string, n: number) => new Date(Date.parse(`${d}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10)
      const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.timezone }).format(new Date())
      let at = all.includes(today) ? today : shift(today, -1)
      let current = 0
      while (all.includes(at)) [current, at] = [current + 1, shift(at, -1)]
      let longest = 0
      for (const d of days) {
        let run = 1
        while (days.some((x) => x.entry_date === shift(d.entry_date, -run))) run++
        longest = Math.max(longest, run)
      }
      const scores = days.map((d) => d.score)
      return json({
        month,
        days,
        stats: {
          recorded: days.length,
          average: scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : null,
          distribution: [1, 2, 3, 4, 5].map((n) => scores.filter((x) => x === n).length),
          photos: days.reduce((a, d) => a + d.photo_count, 0),
          photo_days: days.filter((d) => d.photo_count).length,
          longest_streak: longest,
          current_streak: current,
        },
      })
    }
    if (path === '/entries' && request.method === 'GET') {
      const month = new URL(request.url).searchParams.get('month') ?? ''
      const rows = Object.values(entries)
        .filter((e) => e.entry_date.startsWith(`${month}-`))
        .sort((a, b) => b.entry_date.localeCompare(a.entry_date))
        .map(({ content, photos, ...e }) => ({ ...e, excerpt: content?.slice(0, 300) ?? null, photo_count: photos.length }))
      return json({ month, entries: rows })
    }
    const notFound = () => json({ error: { code: 'ENTRY_NOT_FOUND', message: 'Ngày này chưa có nhật ký' } }, 404)
    const share = path.match(/^\/entries\/(\d{4}-\d{2}-\d{2})\/share$/)
    if (share && request.method === 'GET') return json(null)
    if (path === '/shares') return json([])
    const photo = path.match(/^\/photos\/([^/]+)$/)
    if (photo && request.method === 'DELETE') {
      const owner = Object.values(entries).find((e) => e.photos.some((p) => p.id === photo[1]))
      if (!owner) return json({ error: { code: 'PHOTO_NOT_FOUND', message: 'Không tìm thấy ảnh' } }, 404)
      owner.photos = owner.photos.filter((p) => p.id !== photo[1]).map((p, i) => ({ ...p, position: i }))
      return new Response(null, { status: 204 })
    }
    const order = path.match(/^\/entries\/(\d{4}-\d{2}-\d{2})\/photos\/order$/)
    if (order && request.method === 'PATCH') {
      const current = entries[order[1]]
      if (!current) return notFound()
      const ids = (body as { photo_ids: string[] }).photo_ids
      const byId = new Map(current.photos.map((p) => [p.id, p]))
      if (ids.length !== byId.size || ids.some((id) => !byId.has(id))) {
        return json({ error: { code: 'PHOTO_ORDER_INVALID', message: 'Danh sách ảnh không khớp với trang' } }, 422)
      }
      current.photos = ids.map((id, i) => ({ ...byId.get(id)!, position: i }))
      return json(current)
    }
    const restore = path.match(/^\/entries\/(\d{4}-\d{2}-\d{2})\/restore$/)
    if (restore) {
      const day = restore[1]
      if (!deleted[day]) return notFound()
      entries[day] = deleted[day]
      delete deleted[day]
      return json(entries[day])
    }
    const one = path.match(/^\/entries\/(\d{4}-\d{2}-\d{2})$/)
    if (one) {
      const day = one[1]
      const current = entries[day]
      if (request.method === 'GET') return current ? json(current) : notFound()
      if (request.method === 'DELETE') {
        if (!current) return notFound()
        deleted[day] = current
        delete entries[day]
        const at = new Date().toISOString()
        return json({ entry_date: day, deleted_at: at, restore_until: new Date(Date.now() + 30 * 86_400_000).toISOString() })
      }
      if (request.method === 'PUT') {
        const { updated_at: known, ...fields } = body as Partial<EntryOut> & { updated_at?: string }
        const conflict = () => json({ error: { code: 'ENTRY_CONFLICT', message: 'Trang này vừa được sửa ở nơi khác' } }, 409)
        if (known ? !current : false) return notFound()
        if (known ? current.updated_at !== known : Boolean(current)) return conflict()
        const now = new Date(Date.now() + ++tick).toISOString()
        delete deleted[day]
        entries[day] = {
          ...makeEntry(day),
          ...(current ?? { created_at: now }),
          ...fields,
          photos: current?.photos ?? [],
          updated_at: now,
        } as EntryOut
        return json(entries[day])
      }
    }
    return json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } }, 404)
  })
  return calls
}

/** Render các route với QueryClient đã có sẵn /me (như sau khi đăng nhập). */
export function renderWithMe(
  routes: RouteObject[],
  entry: string | { pathname: string; state?: unknown },
  me: Me | null = makeMe(),
) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  if (me) client.setQueryData(ME_KEY, me)
  const router = createMemoryRouter(routes, { initialEntries: [entry] })
  const view = render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return { ...view, client, router }
}
