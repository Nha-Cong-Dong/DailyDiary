import { flushSync } from 'react-dom'

/**
 * Tiện ích chuyển động dùng chung (hệ thiết kế 1.1, canvas B11-Motion). Giá trị lấy từ token trong index.css.
 */
export const EASE_OUT = 'cubic-bezier(0.23, 1, 0.32, 1)'
export const EASE_DRAWER = 'cubic-bezier(0.32, 0.72, 0, 1)'
export const EASE_MOVE = 'cubic-bezier(0.77, 0, 0.175, 1)'
export const DUR = { press: 100, fast: 160, base: 220, sheetIn: 280, sheetOut: 200, morph: 320 } as const

/** Người dùng bật giảm chuyển động (đọc lại mỗi lần gọi, để đổi cài đặt có hiệu lực ngay). */
export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches)
}

type DocumentWithVT = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

/**
 * Chạy một thay đổi trạng thái KHÔNG phải điều hướng (vd. đổi chỗ vật trong cùng màn) qua View Transitions của trình
 * duyệt; trình duyệt không hỗ trợ thì đổi ngay. Điều hướng giữa các trang thì dùng <DayMorph> (React tự lo).
 * `update` chạy đồng bộ trong flushSync để ảnh "sau" chụp đúng DOM mới.
 */
export function withViewTransition(update: () => void): Promise<void> {
  const doc = document as DocumentWithVT
  if (!doc.startViewTransition) {
    update()
    return Promise.resolve()
  }
  return doc.startViewTransition(() => flushSync(update)).finished.catch(() => undefined)
}
