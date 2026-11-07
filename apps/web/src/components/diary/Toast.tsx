import { Check } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

type ToastProps = {
  children: ReactNode
  /**
   * Hiện/ẩn có chuyển động ra (trượt xuống theo đường cũ, 220ms). Bỏ trống = luôn hiện; nơi gọi tự gỡ component
   * (không có chuyển động ra).
   */
  open?: boolean
  /** Nút trong thông báo, vd. { label: 'Hoàn tác', onClick: restore }. */
  action?: { label: string; onClick: () => void }
  /** Icon trong vòng đào bên trái; mặc định dấu tích. `null` = không icon. */
  icon?: ReactNode
  className?: string
}

const EXIT_MS = 200

/**
 * Thông báo nổi dùng chung (B11-Components · Toast): nền mực, chữ giấy, bóng đào; một vị trí cho cả app, đáy giữa
 * màn, trên điện thoại nằm ngay trên thanh tab dưới. Trượt lên khi hiện, trượt xuống khi ẩn. Gắn vào body để nổi
 * trên lớp phủ của hộp thoại. Nơi gọi tự ẩn (thường 6 giây khi có Hoàn tác, 2,4 giây khi chỉ báo kết quả).
 * Màn không có thanh tab (Sửa trang) hạ xuống bằng `className` (vd. `bottom-8`).
 */
export function Toast({ children, open = true, action, icon, className }: ToastProps) {
  const visible = open && Boolean(children)
  // Giữ nội dung cuối trong lúc trượt ra.
  const [shown, setShown] = useState<ReactNode>(visible ? children : null)
  if (visible && shown !== children) setShown(children)
  const leaving = !visible && shown != null

  useEffect(() => {
    if (!leaving) return
    const id = window.setTimeout(() => setShown(null), EXIT_MS)
    return () => window.clearTimeout(id)
  }, [leaving])

  if (shown == null) return null
  return createPortal(
    <div
      role="status"
      aria-hidden={leaving || undefined}
      className={cn(
        'fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-md border-[1.5px] border-stroke bg-primary py-3 pr-[18px] pl-3.5 text-sm leading-[22px] font-semibold text-on-primary shadow-accent md:bottom-8',
        leaving ? 'pointer-events-none animate-[jot-toast_200ms_var(--ease-out)_reverse_both] motion-reduce:animate-[jot-fade-out_200ms_ease_both]' : 'animate-toast',
        className,
      )}
    >
      {icon === null ? null : (
        <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-peach text-on-accent">
          {icon ?? <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />}
        </span>
      )}
      <span className="min-w-0">{shown}</span>
      {action ? (
        <button
          type="button"
          onClick={action.onClick}
          disabled={leaving}
          className="ml-1.5 min-h-8 shrink-0 cursor-pointer font-bold underline decoration-[1.5px] underline-offset-4 transition-[text-underline-offset,opacity] duration-(--dur-fast) pointer-fine:hover:underline-offset-[6px] active:opacity-60 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-peach"
        >
          {action.label}
        </button>
      ) : null}
    </div>,
    document.body,
  )
}
