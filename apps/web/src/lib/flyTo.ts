import { DUR, EASE_MOVE, prefersReducedMotion } from './motion'

type FlyOptions = {
  /** Tỉ lệ khi tới đích (canvas: 0.8). */
  scale?: number
  duration?: number
}

/**
 * "Chấm điểm, icon bay vào ô hôm nay" (canvas B11-Motion): chép phần tử `from` (thường là svg icon vừa chọn trong
 * ScorePicker, tìm bằng `[data-score="n"] svg`) thành một lớp nổi, bay tới tâm `to` (ô hôm nay) trong 320ms
 * ease-move rồi gỡ. Chỉ chạy ở lần chấm đầu trong ngày; nơi gọi tự quyết. Giảm chuyển động hoặc thiếu phần tử thì
 * xong ngay (Promise trả về resolve), giao diện vẫn đổi bình thường.
 */
export function flyTo(from: Element | null, to: Element | null, { scale = 0.8, duration = DUR.morph }: FlyOptions = {}) {
  if (!from || !to || prefersReducedMotion() || typeof document === 'undefined') return Promise.resolve()
  const a = from.getBoundingClientRect()
  const b = to.getBoundingClientRect()
  if (!a.width || !b.width || typeof HTMLElement.prototype.animate !== 'function') return Promise.resolve()

  const ghost = from.cloneNode(true) as HTMLElement
  Object.assign(ghost.style, {
    position: 'fixed',
    left: `${a.left}px`,
    top: `${a.top}px`,
    width: `${a.width}px`,
    height: `${a.height}px`,
    margin: '0',
    pointerEvents: 'none',
    zIndex: '70',
    transformOrigin: 'center',
  })
  ghost.setAttribute('aria-hidden', 'true')
  document.body.appendChild(ghost)

  const dx = b.left + b.width / 2 - (a.left + a.width / 2)
  const dy = b.top + b.height / 2 - (a.top + a.height / 2)
  const animation = ghost.animate(
    [{ transform: 'none' }, { transform: `translate(${dx}px, ${dy}px) scale(${scale})` }],
    { duration, easing: EASE_MOVE, fill: 'forwards' },
  )
  return animation.finished.catch(() => undefined).finally(() => ghost.remove())
}
