import { Check } from 'lucide-react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * Thông báo nổi dùng chung ("Đã sao chép link", "Đã lưu thay đổi"): một vị trí cho cả app, đáy giữa màn,
 * trên điện thoại nằm ngay trên thanh tab dưới. Gắn vào body để nổi trên lớp phủ của hộp thoại.
 * Không có nút; nơi gọi tự ẩn sau vài giây. Màn không có thanh tab (Sửa trang) hạ xuống bằng `className`.
 */
export function Toast({ children, className }: { children: ReactNode; className?: string }) {
  if (!children) return null
  return createPortal(
    <div
      role="status"
      className={cn(
        'fixed bottom-[calc(84px+env(safe-area-inset-bottom))] left-1/2 z-[60] flex max-w-[calc(100vw-32px)] -translate-x-1/2 animate-rise items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-primary py-3 pr-[18px] pl-3.5 text-sm leading-[22px] font-semibold text-primary-foreground shadow-[4px_4px_0_#F1BD90] md:bottom-8',
        className,
      )}
    >
      <span className="inline-flex size-[22px] shrink-0 animate-stamp items-center justify-center rounded-full bg-[#F1BD90] text-[#272218]">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
      {children}
    </div>,
    document.body,
  )
}
