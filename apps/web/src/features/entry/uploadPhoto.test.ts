import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntry } from '@/test/withMe'
import { makeUploadPhoto } from './uploadPhoto'

vi.mock('@/lib/image', () => ({
  preparePhoto: vi.fn(async () => ({
    main: new Blob([new Uint8Array(900)], { type: 'image/webp' }),
    thumb: new Blob([new Uint8Array(100)], { type: 'image/webp' }),
    type: 'image/webp',
    width: 1920,
    height: 1440,
  })),
}))

const DAY = '2026-10-16'
const puts: { url: string; headers: Record<string, string>; size: number }[] = []

/** XHR giả: PUT lên kho thành công, báo tiến độ một lần. */
class FakeXhr {
  upload: { onprogress: ((e: { lengthComputable: boolean; loaded: number; total: number }) => void) | null } = { onprogress: null }
  onload: (() => void) | null = null
  onerror: (() => void) | null = null
  onabort: (() => void) | null = null
  status = 0
  private url = ''
  private headers: Record<string, string> = {}
  open(_method: string, url: string) {
    this.url = url
  }
  setRequestHeader(k: string, v: string) {
    this.headers[k] = v
  }
  abort() {
    this.onabort?.()
  }
  send(body: Blob) {
    puts.push({ url: this.url, headers: this.headers, size: body.size })
    this.upload.onprogress?.({ lengthComputable: true, loaded: body.size, total: body.size })
    this.status = 200
    queueMicrotask(() => this.onload?.())
  }
}

let apiCalls: { path: string; body: unknown; cookie: RequestCredentials }[] = []

beforeEach(() => {
  puts.length = 0
  apiCalls = []
  vi.stubGlobal('XMLHttpRequest', FakeXhr)
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const request = input as Request
    const path = new URL(request.url).pathname
    const body = await request.clone().json()
    apiCalls.push({ path, body, cookie: request.credentials })
    const json = (data: unknown) => new Response(JSON.stringify(data), { status: 200, headers: { 'Content-Type': 'application/json' } })
    if (path.endsWith('/upload-url')) {
      return json({
        photo_id: 'ph1',
        upload_url: 'http://kho.test/main?sig',
        thumb_upload_url: 'http://kho.test/thumb?sig',
        headers: { 'Content-Type': 'image/webp' },
        expires_in: 300,
      })
    }
    return json(
      makeEntry(DAY, {
        photos: [{ id: 'ph1', position: 0, width: 1920, height: 1440, url: 'http://kho.test/main?view', thumb_url: 'http://kho.test/thumb?view' }],
      }),
    )
  })
})
afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('makeUploadPhoto', () => {
  it('nén → xin URL → PUT ảnh chính và ảnh thu nhỏ lên kho → xác nhận, trả ảnh kèm link xem', async () => {
    const progress: number[] = []
    const onEntry = vi.fn()
    const upload = makeUploadPhoto(DAY, onEntry)
    const photo = await upload(new File(['x'], 'a.heic'), (r) => progress.push(r), new AbortController().signal)

    expect(apiCalls.map((c) => c.path)).toEqual([`/entries/${DAY}/photos/upload-url`, `/entries/${DAY}/photos`])
    expect(apiCalls[0]!.body).toEqual({ content_type: 'image/webp' })
    expect(apiCalls[1]!.body).toEqual({ photo_id: 'ph1', content_type: 'image/webp', width: 1920, height: 1440 })
    expect(puts).toEqual([
      { url: 'http://kho.test/main?sig', headers: { 'Content-Type': 'image/webp' }, size: 900 },
      { url: 'http://kho.test/thumb?sig', headers: { 'Content-Type': 'image/webp' }, size: 100 },
    ])
    expect(photo).toMatchObject({ id: 'ph1', thumbUrl: 'http://kho.test/thumb?view', url: 'http://kho.test/main?view' })
    expect(onEntry).toHaveBeenCalledOnce()
    expect(progress.at(-1)).toBe(1)
    expect(progress).toEqual([...progress].sort((a, b) => a - b)) // tiến độ chỉ tăng
  })

  it('hủy trước khi tải lên thì không gọi API', async () => {
    const controller = new AbortController()
    controller.abort()
    await expect(makeUploadPhoto(DAY)(new File(['x'], 'a.jpg'), () => {}, controller.signal)).rejects.toThrow()
    expect(apiCalls).toEqual([])
  })
})
