import { flushSync } from 'react-dom'

/**
 * Icon bay từ chỗ này sang chỗ kia khi trạng thái đổi (DESIGN.md mục 6, chuyển cảnh nối B1): cho thấy hai chỗ trên
 * một trang là cùng một dữ liệu. Ví dụ: lần chấm điểm đầu trong ngày, icon vừa chọn bay vào ô hôm nay của dải tháng;
 * ở trang chủ, icon của thẻ ngày bay vào ô hôm nay của lịch.
 *
 * Dùng View Transitions của trình duyệt: đặt tên cho phần tử nguồn (`from`), áp `update` trong lúc trình duyệt chụp
 * ảnh, rồi đặt cùng tên cho phần tử đích (`to`, tìm sau khi cập nhật). Trình duyệt không hỗ trợ hoặc người dùng chọn
 * giảm chuyển động thì chỉ cập nhật. Thời lượng, đường cong: nhóm `fly` trong styles/motion.css.
 */
export function flyTo({ from, to, update }: { from: string; to: string; update: () => void }) {
  const source = document.querySelector<HTMLElement>(from)
  const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  if (!source || reduce || typeof document.startViewTransition !== 'function') {
    update()
    return
  }
  let target: HTMLElement | null = null
  source.style.viewTransitionName = 'fly'
  const transition = document.startViewTransition(() => {
    source.style.viewTransitionName = ''
    flushSync(update)
    target = document.querySelector<HTMLElement>(to)
    if (target) target.style.viewTransitionName = 'fly'
  })
  void transition.finished.finally(() => {
    if (target) target.style.viewTransitionName = ''
  })
}
