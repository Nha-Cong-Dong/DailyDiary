/**
 * Bộ máy tự động lưu (F-06), không phụ thuộc React để test bằng fake timers.
 * - Ghi nháp (`persist`, IndexedDB) sau `draftDelay` ngừng gõ; đồng bộ (`sync`, PUT lên máy chủ) sau `syncDelay`.
 * - Chỉ gửi khi khác bản đã đồng bộ gần nhất. Đang gửi mà người dùng gõ tiếp: gửi xong thì gửi bản mới.
 * - Lỗi tạm thời (mất mạng, 5xx, 429): thử lại sau 2, 4, 8… giây (tối đa 60 s); `retryNow()` khi có mạng lại.
 * - 409: dừng ở trạng thái `conflict` chờ người dùng chọn bản. Lỗi khác (422): dừng ở `error` kèm câu báo.
 * - `mode: 'draft'` (Sửa trang cũ): chỉ ghi nháp; lên máy chủ khi gọi `flush()` (nút "Lưu thay đổi").
 */
export type SaveStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: Date }
  | { kind: 'unsynced'; retryInMs: number | null }
  | { kind: 'error'; message: string }
  | { kind: 'conflict' }

export type FailureKind = { kind: 'retry' } | { kind: 'conflict' } | { kind: 'error'; message: string }

export type AutosaveOptions<T> = {
  mode?: 'auto' | 'draft'
  draftDelay?: number
  syncDelay?: number
  /** Bản đã có trên máy chủ lúc mở màn (null = chưa có gì để so). */
  initialSynced: T | null
  equals: (a: T, b: T) => boolean
  persist: (value: T) => Promise<void> | void
  sync: (value: T) => Promise<void>
  /** Bản vừa đồng bộ xong (vd. để xóa nháp); `stillUnsynced` = người dùng đã gõ thêm trong lúc gửi. */
  onSynced?: (value: T, stillUnsynced: boolean) => void
  classify: (error: unknown) => FailureKind
  onStatus: (status: SaveStatus) => void
  now?: () => Date
}

export const RETRY_BASE_MS = 2000
export const RETRY_MAX_MS = 60_000

export function retryDelay(attempt: number): number {
  return Math.min(RETRY_BASE_MS * 2 ** attempt, RETRY_MAX_MS)
}

export type Autosave<T> = ReturnType<typeof createAutosave<T>>

export function createAutosave<T>(opts: AutosaveOptions<T>) {
  const mode = opts.mode ?? 'auto'
  const draftDelay = opts.draftDelay ?? 1000
  const syncDelay = opts.syncDelay ?? 4000
  const now = opts.now ?? (() => new Date())

  let current: T | null = opts.initialSynced
  let synced: T | null = opts.initialSynced
  let draftDirty = false
  let draftTimer: ReturnType<typeof setTimeout> | undefined
  let syncTimer: ReturnType<typeof setTimeout> | undefined
  let retryTimer: ReturnType<typeof setTimeout> | undefined
  let attempt = 0
  let inFlight: Promise<void> | null = null
  let again = false
  let blocked = false // conflict/error: chờ người dùng, không tự gửi
  let disposed = false
  let status: SaveStatus = { kind: 'idle' }

  const setStatus = (s: SaveStatus) => {
    status = s
    if (!disposed) opts.onStatus(s)
  }
  const unsynced = () => current !== null && (synced === null || !opts.equals(current, synced))

  async function persistNow() {
    clearTimeout(draftTimer)
    if (!draftDirty || current === null) return
    draftDirty = false
    await opts.persist(current)
  }

  async function syncNow(): Promise<void> {
    clearTimeout(syncTimer)
    clearTimeout(retryTimer)
    if (inFlight) {
      again = true
      return inFlight
    }
    if (blocked || !unsynced() || current === null) return
    const value = current
    setStatus({ kind: 'saving' })
    inFlight = (async () => {
      try {
        await opts.sync(value)
        synced = value
        attempt = 0
        opts.onSynced?.(value, unsynced())
        setStatus({ kind: 'saved', at: now() })
      } catch (error) {
        const failure = opts.classify(error)
        if (failure.kind === 'retry') {
          const wait = retryDelay(attempt++)
          setStatus({ kind: 'unsynced', retryInMs: wait })
          retryTimer = setTimeout(() => void syncNow(), wait)
        } else {
          blocked = true
          setStatus(failure.kind === 'conflict' ? { kind: 'conflict' } : { kind: 'error', message: failure.message })
        }
      } finally {
        inFlight = null
      }
      if (again && !blocked) {
        again = false
        if (unsynced()) await syncNow()
      }
    })()
    return inFlight
  }

  return {
    /** Người dùng đổi một trường: hẹn ghi nháp và (chế độ auto) hẹn đồng bộ. */
    change(value: T) {
      if (disposed || (current !== null && opts.equals(value, current))) return
      current = value
      draftDirty = true
      clearTimeout(draftTimer)
      draftTimer = setTimeout(() => void persistNow(), draftDelay)
      if (mode === 'auto' && !blocked) {
        clearTimeout(syncTimer)
        syncTimer = setTimeout(() => void syncNow(), syncDelay)
      }
    },
    /** Lưu ngay: nút Lưu, rời màn, chuyển tab. */
    async flush() {
      await persistNow()
      blocked = false
      await syncNow()
    },
    /** Rời màn / chuyển tab: auto thì đồng bộ ngay, draft thì chỉ ghi nháp. */
    async leave() {
      await persistNow()
      if (mode === 'auto') await syncNow()
    },
    /** Có mạng lại, hoặc bấm "Thử lại". */
    retryNow() {
      if (status.kind !== 'unsynced' && status.kind !== 'error') return
      blocked = false
      attempt = 0
      void syncNow()
    },
    /** Đặt lại bản chuẩn (vd. chọn "Dùng bản vừa sửa" khi xung đột). */
    reset(value: T | null) {
      clearTimeout(draftTimer)
      clearTimeout(syncTimer)
      clearTimeout(retryTimer)
      current = value
      synced = value
      draftDirty = false
      blocked = false
      attempt = 0
      setStatus({ kind: 'idle' })
    },
    /** Mở màn gặp nháp dựa trên bản cũ hơn máy chủ: giữ nháp làm bản hiện tại, chờ người dùng chọn. */
    holdConflict(value: T) {
      current = value
      blocked = true
      setStatus({ kind: 'conflict' })
    },
    /** Sau khi người dùng chọn "Giữ bản của tôi": gửi lại bản đang có. */
    resume() {
      blocked = false
      void syncNow()
    },
    hasUnsynced: unsynced,
    status: () => status,
    /** Màn gắn (lại) bộ máy; React StrictMode gỡ rồi gắn lại effect ở dev nên phải bật lại được sau dispose. */
    attach() {
      disposed = false
    },
    dispose() {
      disposed = true
      clearTimeout(draftTimer)
      clearTimeout(syncTimer)
      clearTimeout(retryTimer)
    },
  }
}

// "Đã có mạng lại": số trang tự đồng bộ xong sau khi có mạng lại (thanh ngoại tuyến đọc).
type Listener = (count: number) => void
const listeners = new Set<Listener>()
let reconnectCount = 0

export function onReconnectSynced(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function noteReconnectSynced() {
  reconnectCount += 1
  listeners.forEach((l) => l(reconnectCount))
}

export function resetReconnectSynced() {
  reconnectCount = 0
}
