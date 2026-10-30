import { flushSync } from 'react-dom'

/**
 * Chuyển cảnh nối ở màn Hôm nay (DESIGN.md mục 6, B1): lần chấm điểm đầu tiên trong ngày, icon vừa chọn trong bộ chấm
 * điểm bay vào ô hôm nay của dải tháng, cho thấy hai chỗ là cùng một dữ liệu. Dùng View Transitions của trình duyệt:
 * đặt tên cho icon nguồn, áp cập nhật trong lúc trình duyệt chụp ảnh, rồi đặt cùng tên cho icon đích. Trình duyệt không
 * hỗ trợ hoặc người dùng chọn giảm chuyển động thì cập nhật ngay. Thời lượng, đường cong: `today-mood` trong motion.css.
 */
export function flyToToday(score: number, update: () => void) {
  const source = document.querySelector<HTMLElement>(`[data-score-option="${score}"] svg`)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!source || reduce || typeof document.startViewTransition !== 'function') {
    update()
    return
  }
  let target: HTMLElement | null = null
  source.style.viewTransitionName = 'today-mood'
  const transition = document.startViewTransition(() => {
    source.style.viewTransitionName = ''
    flushSync(update)
    target = document.querySelector<HTMLElement>('[data-today-cell] [data-cell-icon]')
    if (target) target.style.viewTransitionName = 'today-mood'
  })
  void transition.finished.finally(() => {
    if (target) target.style.viewTransitionName = ''
  })
}
