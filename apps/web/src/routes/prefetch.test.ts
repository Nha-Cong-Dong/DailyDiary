import { QueryClient } from '@tanstack/react-query'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { todayIn } from '@/lib/date'
import { makeMe } from '@/test/withMe'
import { prefetchRoute } from './prefetch'

// Tải trước theo route (Bước 14, LCP): gọi đúng API của màn ngay khi có /me, lưu dưới đúng key của hook.
function stubApi(signedIn = true) {
  const me = makeMe({ timezone: 'America/Los_Angeles' })
  const paths: string[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = new URL(input instanceof Request ? input.url : String(input))
    paths.push(url.pathname + url.search)
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    if (url.pathname === '/me') return signedIn ? json(me) : json({ error: { code: 'AUTH_REQUIRED', message: '' } }, 401)
    return json({ error: { code: 'NOT_FOUND', message: '' } }, 404)
  })
  return { me, paths }
}

const client = () => new QueryClient({ defaultOptions: { queries: { retry: false } } })
const settle = () => vi.waitFor(() => expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(1))

afterEach(() => vi.restoreAllMocks())

describe('prefetchRoute', () => {
  it('/today: trang hôm nay theo múi giờ hồ sơ (không theo máy) và lịch tháng cho dải 7 ngày', async () => {
    const { me, paths } = stubApi()
    const c = client()
    prefetchRoute(c, 'today', new URL('http://x/today'), {})
    await settle()
    const today = todayIn(me.timezone)
    await vi.waitFor(() => expect(paths).toContain(`/entries/${today}`))
    expect(paths.some((p) => p.startsWith(`/calendar/${Number(today.slice(0, 4))}/`))).toBe(true)
    expect(c.getQueryState(['entries', today])).toBeDefined()
  })

  it('/timeline?m=2026-09: lấy đúng tháng trên URL', async () => {
    const { paths } = stubApi()
    prefetchRoute(client(), 'timeline', new URL('http://x/timeline?m=2026-09'), {})
    await vi.waitFor(() => expect(paths).toEqual(expect.arrayContaining(['/entries?month=2026-09', '/calendar/2026/9'])))
  })

  it('/day/:date dùng ngày trên đường dẫn', async () => {
    const { paths } = stubApi()
    prefetchRoute(client(), 'day', new URL('http://x/day/2026-10-01'), { date: '2026-10-01' })
    await vi.waitFor(() => expect(paths).toContain('/entries/2026-10-01'))
  })

  it('chưa đăng nhập (/me 401): không gọi thêm gì', async () => {
    const { paths } = stubApi(false)
    prefetchRoute(client(), 'pixels', new URL('http://x/pixels'), {})
    await vi.waitFor(() => expect(paths).toEqual(['/me']))
    await new Promise((r) => setTimeout(r, 20))
    expect(paths).toEqual(['/me'])
  })
})
