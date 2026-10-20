import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router'
import { vi } from 'vitest'
import { ME_KEY, type Me } from '@/lib/profile'

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
    ...overrides,
  }
}

/**
 * Giả lập API: GET /me trả `me`, PATCH /me gộp body vào `me`, POST /auth/logout trả 204.
 * Trả về danh sách request đã gửi để test kiểm tra.
 */
export function mockApi(me: Me) {
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
