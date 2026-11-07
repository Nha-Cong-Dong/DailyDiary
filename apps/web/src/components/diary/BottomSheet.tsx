import type { ReactNode } from 'react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/utils'

type BottomSheetProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Tiêu đề. Ở chế độ `bare` thì hộp tự vẽ tiêu đề bằng `SheetTitle`, prop này bỏ qua. */
  title?: ReactNode
  /** Mô tả; mặc định chỉ cho trình đọc màn hình, `showDescription` để hiện dưới tiêu đề. */
  description?: ReactNode
  showDescription?: boolean
  children: ReactNode
  className?: string
  /**
   * `sheet` (mặc định): luôn là bảng trượt từ đáy (xem nhanh một ngày, bộ lọc).
   * `responsive`: hộp thoại giữa màn từ 768 px, bảng trượt dưới 768 px (xác nhận, Chia sẻ, Hồ sơ; thiết kế B10).
   */
  layout?: 'sheet' | 'responsive'
  /** `alertdialog`: xác nhận phá hủy, chạm ra ngoài không đóng (Esc và nút Giữ lại vẫn đóng). */
  role?: 'dialog' | 'alertdialog'
  /** Bóng đỏ cho hộp thoại phá hủy trên máy tính (như AlertDialog). */
  danger?: boolean
  /** Hộp tự dựng phần đầu và bố cục (vd. Chia sẻ): chỉ giữ khung, tay nắm, lớp phủ, hiệu ứng. */
  bare?: boolean
}

const overlay =
  'fixed inset-0 z-50 bg-[rgb(20_17_13/0.55)] data-open:animate-scrim data-closed:animate-fade-out'

/** Khung bảng trượt: tràn ngang, bám đáy, bo góc trên, chừa vùng an toàn của điện thoại. */
const sheet =
  'fixed inset-x-0 bottom-0 z-50 flex max-h-[86dvh] flex-col gap-4 overflow-y-auto rounded-t-lg border-[1.5px] border-b-0 border-stroke bg-card px-4 pt-2 pb-[max(24px,env(safe-area-inset-bottom))] text-ink shadow-lg outline-none data-open:animate-sheet-in data-closed:animate-sheet-out'

/** Từ 768 px: hộp thoại giữa màn, rộng 440 px mặc định (đổi bằng `className`, vd. `md:max-w-[980px]`). */
const centred =
  'md:inset-x-auto md:top-1/2 md:bottom-auto md:left-1/2 md:max-h-[calc(100dvh-2rem)] md:w-full md:max-w-[min(440px,calc(100%-2rem))] md:-translate-x-1/2 md:-translate-y-1/2 md:gap-3.5 md:rounded-lg md:border-b-[1.5px] md:bg-card md:p-7 md:data-open:animate-dialog md:data-closed:animate-fade-out'

const grabber = 'h-1 w-10 shrink-0 self-center rounded-full bg-line-soft'

export const SheetTitle = DialogPrimitive.Title
export const SheetDescription = DialogPrimitive.Description
export const SheetClose = DialogPrimitive.Close

/**
 * Bảng trượt dùng chung cho cả app (một tay nắm, một lề đáy, một hiệu ứng). Dựa trên Dialog của Radix nên có khóa focus,
 * Esc để đóng; hộp `dialog` đóng khi chạm nền, hộp `alertdialog` thì không.
 */
export function BottomSheet({
  open,
  onOpenChange,
  title,
  description,
  showDescription = false,
  children,
  className,
  layout = 'sheet',
  role = 'dialog',
  danger = false,
  bare = false,
}: BottomSheetProps) {
  const responsive = layout === 'responsive'
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className={overlay} />
        <DialogPrimitive.Content
          role={role}
          {...(description ? {} : { 'aria-describedby': undefined })}
          onPointerDownOutside={role === 'alertdialog' ? (e) => e.preventDefault() : undefined}
          onInteractOutside={role === 'alertdialog' ? (e) => e.preventDefault() : undefined}
          className={cn(
            sheet,
            responsive && centred,
            responsive && (danger ? 'md:shadow-danger-lg' : 'md:shadow-lg'),
            className,
          )}
        >
          <span aria-hidden="true" className={cn(grabber, responsive && 'md:hidden', bare && 'mt-2')} />
          {bare ? null : (
            <div className="flex flex-col gap-1.5 md:gap-2">
              <DialogPrimitive.Title className="text-heading text-ink">
                {title}
              </DialogPrimitive.Title>
              {description ? (
                <DialogPrimitive.Description
                  className={showDescription ? 'text-body text-ink-soft' : 'sr-only'}
                >
                  {description}
                </DialogPrimitive.Description>
              ) : null}
            </div>
          )}
          {children}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}

/**
 * Hàng nút cuối hộp: điện thoại xếp dọc, cao 48 px, nút chính ở trên; máy tính nằm ngang bên phải.
 * Truyền nút theo thứ tự trên điện thoại; `reverseOnDesktop` đảo lại trên máy tính (nút giữ nguyên ở trái, nút chính ở phải).
 */
export function SheetActions({ children, reverseOnDesktop = false }: { children: ReactNode; reverseOnDesktop?: boolean }) {
  return (
    <div
      className={cn(
        'mt-1 flex flex-col gap-2.5 md:mt-2 md:flex-row md:justify-end',
        reverseOnDesktop && 'md:flex-row-reverse md:justify-start',
        '[&>*]:h-12 [&>*]:w-full md:[&>*]:h-11 md:[&>*]:w-auto',
      )}
    >
      {children}
    </div>
  )
}
