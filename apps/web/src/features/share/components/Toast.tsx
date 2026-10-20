import { Check } from 'lucide-react'
import { createPortal } from 'react-dom'

/**
 * Thông báo nổi ở đáy màn hình ("Đã sao chép link"). Gắn vào body để nằm trên lớp phủ của hộp thoại.
 * Không có nút: tự ẩn sau vài giây (useCopyLink).
 */
export function Toast({ text }: { text: string | null }) {
  if (!text) return null
  return createPortal(
    <div
      role="status"
      className="fixed bottom-8 left-1/2 z-[60] flex -translate-x-1/2 animate-rise items-center gap-2.5 rounded-[14px] border-[1.5px] border-line bg-primary py-3 pr-[18px] pl-3.5 text-sm leading-[22px] font-semibold whitespace-nowrap text-primary-foreground shadow-[4px_4px_0_#F1BD90]"
    >
      <span className="inline-flex size-[22px] animate-stamp items-center justify-center rounded-full bg-[#F1BD90] text-[#272218]">
        <Check className="size-3.5" strokeWidth={3} aria-hidden="true" />
      </span>
      {text}
    </div>,
    document.body,
  )
}
