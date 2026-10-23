import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createAutosave, retryDelay, type FailureKind, type SaveStatus } from './autosave'

type V = { text: string }

function setup({
  mode = 'auto',
  fail = [],
  initial = null,
}: { mode?: 'auto' | 'draft'; fail?: FailureKind[]; initial?: V | null } = {}) {
  const persisted: V[] = []
  const synced: V[] = []
  const statuses: SaveStatus[] = []
  const failures = [...fail]
  const engine = createAutosave<V>({
    mode,
    initialSynced: initial,
    equals: (a, b) => a.text === b.text,
    persist: (v) => {
      persisted.push(v)
    },
    sync: async (v) => {
      const f = failures.shift()
      if (f) throw f
      synced.push(v)
    },
    classify: (e) => e as FailureKind,
    onStatus: (s) => statuses.push(s),
  })
  return { engine, persisted, synced, statuses, last: () => statuses.at(-1) }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createAutosave', () => {
  it('ghi nháp sau 1 s ngừng gõ, đồng bộ sau 4 s, chỉ bản cuối', async () => {
    const { engine, persisted, synced, last } = setup()
    engine.change({ text: 'a' })
    await vi.advanceTimersByTimeAsync(500)
    engine.change({ text: 'ab' })
    await vi.advanceTimersByTimeAsync(999)
    expect(persisted).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(persisted).toEqual([{ text: 'ab' }])
    await vi.advanceTimersByTimeAsync(2999)
    expect(synced).toEqual([])
    await vi.advanceTimersByTimeAsync(1)
    expect(synced).toEqual([{ text: 'ab' }])
    expect(last()?.kind).toBe('saved')
  })

  it('không gửi khi không có gì khác bản đã đồng bộ', async () => {
    const { engine, synced, persisted } = setup({ initial: { text: 'x' } })
    engine.change({ text: 'x' })
    await vi.advanceTimersByTimeAsync(5000)
    await engine.flush()
    expect(synced).toEqual([])
    expect(persisted).toEqual([])
  })

  it('flush lưu ngay, không chờ hẹn giờ', async () => {
    const { engine, synced } = setup()
    engine.change({ text: 'ngay' })
    await engine.flush()
    expect(synced).toEqual([{ text: 'ngay' }])
  })

  it('lỗi tạm thời thử lại sau 2, 4, 8 giây rồi lưu được', async () => {
    const retry: FailureKind = { kind: 'retry' }
    const { engine, synced, last } = setup({ fail: [retry, retry, retry] })
    engine.change({ text: 'mất mạng' })
    await engine.flush()
    expect(last()).toEqual({ kind: 'unsynced', retryInMs: 2000 })
    await vi.advanceTimersByTimeAsync(2000)
    expect(last()).toEqual({ kind: 'unsynced', retryInMs: 4000 })
    await vi.advanceTimersByTimeAsync(4000)
    expect(last()).toEqual({ kind: 'unsynced', retryInMs: 8000 })
    await vi.advanceTimersByTimeAsync(8000)
    expect(synced).toEqual([{ text: 'mất mạng' }])
    expect(last()?.kind).toBe('saved')
  })

  it('thời gian chờ tăng gấp đôi, tối đa 60 s', () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(retryDelay)).toEqual([2000, 4000, 8000, 16000, 32000, 60000, 60000])
  })

  it('có mạng lại (retryNow) thì thử ngay, không chờ hết hẹn', async () => {
    const { engine, synced } = setup({ fail: [{ kind: 'retry' }] })
    engine.change({ text: 'x' })
    await engine.flush()
    engine.retryNow()
    await vi.advanceTimersByTimeAsync(0)
    expect(synced).toEqual([{ text: 'x' }])
  })

  it('409 dừng ở conflict, không tự gửi lại khi gõ tiếp', async () => {
    const { engine, synced, last } = setup({ fail: [{ kind: 'conflict' }] })
    engine.change({ text: 'a' })
    await engine.flush()
    expect(last()).toEqual({ kind: 'conflict' })
    engine.change({ text: 'ab' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(synced).toEqual([])
    engine.resume()
    await vi.advanceTimersByTimeAsync(0)
    expect(synced).toEqual([{ text: 'ab' }])
  })

  it('422 dừng ở error kèm câu báo, không thử lại', async () => {
    const { engine, synced, last } = setup({ fail: [{ kind: 'error', message: 'Tiêu đề tối đa 100 ký tự' }] })
    engine.change({ text: 'quá dài' })
    await engine.flush()
    expect(last()).toEqual({ kind: 'error', message: 'Tiêu đề tối đa 100 ký tự' })
    await vi.advanceTimersByTimeAsync(120_000)
    expect(synced).toEqual([])
  })

  it('gõ tiếp trong lúc đang gửi: gửi xong thì gửi bản mới', async () => {
    let release!: () => void
    const synced: string[] = []
    const engine = createAutosave<V>({
      initialSynced: null,
      equals: (a, b) => a.text === b.text,
      persist: () => {},
      sync: (v) =>
        new Promise<void>((resolve) => {
          synced.push(v.text)
          release = resolve
        }),
      classify: () => ({ kind: 'retry' }),
      onStatus: () => {},
    })
    engine.change({ text: 'a' })
    const first = engine.flush()
    await vi.advanceTimersByTimeAsync(0) // 'a' đang gửi
    engine.change({ text: 'ab' })
    void engine.flush()
    await vi.advanceTimersByTimeAsync(0)
    release() // 'a' xong → tự gửi 'ab'
    await vi.advanceTimersByTimeAsync(0)
    release()
    await first
    expect(synced).toEqual(['a', 'ab'])
  })

  it('chế độ draft chỉ ghi nháp; lên máy chủ khi flush', async () => {
    const { engine, persisted, synced } = setup({ mode: 'draft' })
    engine.change({ text: 'sửa trang cũ' })
    await vi.advanceTimersByTimeAsync(10_000)
    expect(persisted).toEqual([{ text: 'sửa trang cũ' }])
    expect(synced).toEqual([])
    await engine.flush()
    expect(synced).toEqual([{ text: 'sửa trang cũ' }])
  })

  it('leave (chuyển tab, rời màn) đồng bộ ngay ở chế độ auto', async () => {
    const { engine, synced, persisted } = setup()
    engine.change({ text: 'rời màn' })
    await engine.leave()
    expect(persisted).toEqual([{ text: 'rời màn' }])
    expect(synced).toEqual([{ text: 'rời màn' }])
    expect(engine.hasUnsynced()).toBe(false)
  })
})

describe('gỡ rồi gắn lại (React StrictMode)', () => {
  it('sau dispose, attach thì nhận thay đổi và lưu tiếp', async () => {
    const { engine, synced } = setup()
    engine.dispose()
    engine.attach()
    engine.change({ text: 'sau khi gắn lại' })
    await engine.flush()
    expect(synced).toEqual([{ text: 'sau khi gắn lại' }])
  })
})
