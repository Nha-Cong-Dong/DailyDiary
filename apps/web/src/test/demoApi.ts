import { vi } from 'vitest'
import type { components } from '@/api/schema'
import { demoGetShare, demoListShares, demoPublicShare, demoRevokeShare, demoSaveShare } from '@/features/share/demoShares'
import { demoEntry } from '@/lib/demo'
import type { Me } from '@/lib/profile'

type EntryOut = components['schemas']['EntryOut']

/**
 * Giả lập API cho test màn Chia sẻ: nhật ký đọc từ dữ liệu mẫu (lib/demo.ts), link chia sẻ từ kho mẫu
 * (features/share/demoShares.ts) — cùng dạng dữ liệu với API thật (schema.d.ts).
 */
export function mockDemoApi(me: Me | null = null) {
  const calls: { method: string; path: string; body: unknown }[] = []
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input instanceof Request ? input : new Request(String(input))
    const path = new URL(request.url).pathname
    const body = request.method === 'GET' ? undefined : await request.clone().json().catch(() => undefined)
    calls.push({ method: request.method, path, body })
    const json = (data: unknown, status = 200) =>
      new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
    const notFound = () => json({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } }, 404)

    if (path === '/me') return me ? json(me) : json({ error: { code: 'AUTH_REQUIRED', message: '' } }, 401)
    if (path === '/shares') return json(demoListShares())
    const pub = path.match(/^\/public\/shares\/([^/]+)$/)
    if (pub) {
      const view = demoPublicShare(pub[1])
      return view ? json(view) : notFound()
    }
    const share = path.match(/^\/entries\/(\d{4}-\d{2}-\d{2})\/share$/)
    if (share) {
      const day = share[1]
      if (request.method === 'GET') return json(demoGetShare(day))
      if (request.method === 'PUT') return json(demoSaveShare(day, body as never))
      if (request.method === 'DELETE') {
        if (!demoGetShare(day)) return notFound()
        demoRevokeShare(day)
        return new Response(null, { status: 204 })
      }
    }
    const one = path.match(/^\/entries\/(\d{4}-\d{2}-\d{2})$/)
    if (one && request.method === 'GET') {
      const e = demoEntry(one[1])
      if (!e) return notFound()
      const out: EntryOut = {
        ...e,
        photos: e.photos.map((p, i) => ({ id: p.id, position: i, width: 1920, height: 1440 })),
      }
      return json(out)
    }
    return notFound()
  })
  return calls
}
