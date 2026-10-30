import { Check } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

export type ToastAction = { label: string; onClick: () => void }

/** Thời gian trượt ra, khớp --dur-base: giữ nội dung cũ trên màn đủ lâu để rời đi theo đường đã vào. */
const LEAVE_MS = 220

/**
 * Thông báo nổi dùng chung ("Đã sao chép link", "Đã chuyển vào thùng rác · Hoàn tác"): một vị trí cho cả app, đáy giữa
 * màn, trên điện thoại nằm ngay trên thanh tab dưới. Gắn vào body để nổi trên lớp phủ của hộp thoại.
 * Nơi gọi tự ẩn sau vài giây bằng cách truyền `children` rỗng. Trượt lên từ đáy khi hiện và trượt xuống theo đúng đường
 * đó khi ẩn (transition, nên hiện lại giữa chừng vẫn mượt). `action`: một nút như Hoàn tác.
 * Màn không có thanh tab (Sửa trang) hạ xuống bằng `className`.
 */
export function Toast({ children, action, className }: { children: ReactNode; action?: ToastAction; className?: string }) {
  // Giữ nội dung gần nhất để còn thứ hiện trong lúc trượt ra sau khi nơi gọi đã xóa nó.
  const [shown, setShown] = useState<{ body: ReactNode; action?: ToastAction } | null>(
    children ? { body: children, action } : null,
  )
  if (children && (shown?.body !== children || shown.action !== action)) setShown({ body: children, action })
  const leaving = !children && shown !== null

  useEffect(() => {
    if (!leaving) return
    const timer = setTimeout(() => setShown(null), LEAVE_MS)
    return () => clearTimeout(timer)
  }, [leaving])

  if (!shown) return null
  return createPortal(
    <div
      role="status"
      className={cn(
        'fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 items-center gap-2.5 rounded-md border-[1.5px] border-line bg-primary py-3 pr-[18px] pl-3.5 text-sm leading-[22px] font-semibold text-primary-foreground shadow-accent transition-[translate,opacity] duration-(--dur-base) ease-out starting:translate-y-[calc(100%+24px)] starting:opacity-0 md:bottom-8',
        leaving && 'pointer-events-none translate-y-[calc(100%+24px)] opacity-0',
        className,
      )}
    >
      <span className="inline-flex size-[22px] shrink-0 items-center justify-center rounded-full bg-peach text-on-accent">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
      <span>{shown.body}</span>
      {shown.action ? (
        <button
          type="button"
          onClick={shown.action.onClick}
          className="link-underline ml-1.5 min-h-8 cursor-pointer font-bold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-peach"
        >
          {shown.action.label}
        </button>
      ) : null}
    </div>,
    document.body,
  )
}
