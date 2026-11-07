import { useSyncExternalStore } from 'react'

/**
 * Máy chủ API ở gói miễn phí (vd. Render) ngủ khi vắng người và mất 30–60 giây để thức dậy. Module này nhận ra
 * "request chậm bất thường" để báo "Đang đánh thức máy chủ…", và nhớ lần cuối máy chủ trả lời để màn đăng nhập
 * biết có nên chờ trước khi chuyển sang Google.
 *
 * Không import từ api/client (client dùng `trackedFetch` ở đây) nên không vòng phụ thuộc.
 */

/** Request chưa xong sau chừng này thì coi là máy chủ đang thức dậy. */
export const WAKE_AFTER_MS = 4000
/** Máy chủ trả lời trong khoảng này thì coi là còn thức (Render ngủ sau 15 phút, chừa dư). */
export const AWAKE_FOR_MS = 10 * 60 * 1000
/** Chờ máy chủ thức tối đa chừng này, hết hạn thì cứ để trình duyệt thử. */
export const WAKE_GIVE_UP_MS = 90_000

let slowCount = 0
let lastOkAt = 0
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Gọi `run` và theo dõi: chưa xong sau WAKE_AFTER_MS thì bật cờ "đang thức dậy" cho tới khi xong. */
export async function trackedFetch(run: () => Promise<Response>): Promise<Response> {
  let slow = false
  const timer = setTimeout(() => {
    slow = true
    slowCount++
    emit()
  }, WAKE_AFTER_MS)
  try {
    const response = await run()
    // 502/503 lúc máy chủ đang khởi động không tính là đã thức.
    if (response.status < 500) lastOkAt = Date.now()
    return response
  } finally {
    clearTimeout(timer)
    if (slow) {
      slowCount--
      emit()
    }
  }
}

/** Máy chủ vừa trả lời gần đây, nên chắc chắn đang thức. */
export function isServerAwake(): boolean {
  return Date.now() - lastOkAt < AWAKE_FOR_MS
}

/** Dùng cho test: đặt lại trạng thái. */
export function resetServerWake(awake = false) {
  slowCount = 0
  lastOkAt = awake ? Date.now() : 0
  emit()
}

/**
 * Gọi `url` (thường là /health) cho tới khi máy chủ trả lời được, thử lại mỗi 2 giây. Trả true khi máy chủ đã thức,
 * false khi hết WAKE_GIVE_UP_MS hoặc bị hủy bằng `signal`.
 */
export async function wakeServer(url: string, signal?: AbortSignal): Promise<boolean> {
  const deadline = Date.now() + WAKE_GIVE_UP_MS
  while (!signal?.aborted && Date.now() < deadline) {
    try {
      const res = await trackedFetch(() => fetch(url, { signal, cache: 'no-store' }))
      if (res.ok) return true
    } catch {
      // Chưa nối được (máy chủ đang khởi động): chờ rồi thử lại.
    }
    await new Promise((resolve) => setTimeout(resolve, 2000))
  }
  return false
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  return () => {
    listeners.delete(onChange)
  }
}

/** `true` khi có request chạy quá WAKE_AFTER_MS mà chưa xong. */
export function useServerWaking(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => slowCount > 0,
    () => false,
  )
}
