import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import type { components } from '@/api/schema'
import { ME_KEY, type Me } from '@/lib/profile'

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
 * xóa mềm và khôi phục. Ảnh: xóa (DELETE /photos/{id}) và sắp xếp lại. Chia sẻ: chưa có link nào.
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
