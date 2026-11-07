import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AWAKE_FOR_MS,
  isServerAwake,
  resetServerWake,
  trackedFetch,
  useServerWaking,
  WAKE_AFTER_MS,
  wakeServer,
} from './serverWake'

beforeEach(() => {
  vi.useFakeTimers()
  resetServerWake(false)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

/** Promise bên ngoài tự quyết lúc trả lời, để mô phỏng máy chủ chậm. */
function deferred() {
  let resolve!: (r: Response) => void
  const promise = new Promise<Response>((r) => (resolve = r))
  return { promise, resolve }
}

describe('Theo dõi request chậm (máy chủ đang thức dậy)', () => {
  it('request nhanh không bật cờ', async () => {
    const { result } = renderHook(() => useServerWaking())
    await trackedFetch(() => Promise.resolve(new Response('ok')))
    expect(result.current).toBe(false)
  })

  it('request chạy quá WAKE_AFTER_MS thì bật cờ, xong thì tắt', async () => {
    const { result } = renderHook(() => useServerWaking())
    const d = deferred()
    const pending = trackedFetch(() => d.promise)
    expect(result.current).toBe(false)
    await act(() => vi.advanceTimersByTimeAsync(WAKE_AFTER_MS + 1))
    expect(result.current).toBe(true)
    await act(async () => {
      d.resolve(new Response('ok'))
      await pending
    })
    expect(result.current).toBe(false)
  })

  it('request lỗi mạng cũng tắt cờ', async () => {
    const { result } = renderHook(() => useServerWaking())
    const pending = trackedFetch(() => new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('x')), WAKE_AFTER_MS + 500)))
    pending.catch(() => {})
    await act(() => vi.advanceTimersByTimeAsync(WAKE_AFTER_MS + 100))
    expect(result.current).toBe(true)
    await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current).toBe(false)
  })
})

describe('Máy chủ còn thức không', () => {
  it('chưa có phản hồi nào: chưa thức', () => {
    expect(isServerAwake()).toBe(false)
  })

  it('phản hồi 200 hoặc 401 tính là đã thức, hết AWAKE_FOR_MS thì không', async () => {
    await trackedFetch(() => Promise.resolve(new Response('{}', { status: 401 })))
    expect(isServerAwake()).toBe(true)
    vi.advanceTimersByTime(AWAKE_FOR_MS + 1)
    expect(isServerAwake()).toBe(false)
  })

  it('502 lúc máy chủ đang khởi động không tính là đã thức', async () => {
    await trackedFetch(() => Promise.resolve(new Response('', { status: 502 })))
    expect(isServerAwake()).toBe(false)
  })
})

describe('wakeServer', () => {
  it('thử lại tới khi /health trả 200', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response('', { status: 502 }))
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new Response('{"status":"ok"}', { status: 200 }))
    const done = wakeServer('https://api.example/health')
    await vi.advanceTimersByTimeAsync(5000)
    await expect(done).resolves.toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(3)
    expect(isServerAwake()).toBe(true)
  })

  it('bị hủy thì dừng, trả false', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('', { status: 503 }))
    const ctrl = new AbortController()
    const done = wakeServer('https://api.example/health', ctrl.signal)
    await vi.advanceTimersByTimeAsync(100)
    ctrl.abort()
    await vi.advanceTimersByTimeAsync(3000)
    await expect(done).resolves.toBe(false)
  })
})
