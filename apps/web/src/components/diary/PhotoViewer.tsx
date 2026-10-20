import { ChevronLeft, ChevronRight, Image, X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PHOTO_TINTS } from './photoTints'

export type PhotoItem = { id: string; label: string }

// Ảnh thật có ở Bước 7 (link xem có thời hạn). Trước đó ô ảnh là khung giữ chỗ cùng tông màu nhẹ.

/** Ô ảnh thu nhỏ 4:3 trong trang ngày; bấm để mở trình xem. */
export function PhotoTile({ photo, index, total, onOpen }: { photo: PhotoItem; index: number; total: number; onOpen: () => void }) {
  return (
    <button
      type="button"
      aria-label={`Mở ảnh ${index + 1} trên ${total}`}
      onClick={onOpen}
      className={cn(
        'flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-[14px] border-[1.5px] border-line text-[#6A6255] transition-transform duration-200 ease-[cubic-bezier(.3,1.4,.5,1)] hover:[transform:rotate(-1.5deg)_translateY(-3px)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
        PHOTO_TINTS[index % PHOTO_TINTS.length],
      )}
    >
      <Image className="size-6" aria-hidden="true" />
      <span className="text-xs">{photo.label}</span>
    </button>
  )
}

type PhotoViewerProps = {
  photos: PhotoItem[]
  /** Ảnh đang mở, null khi đóng. */
  index: number | null
  onIndexChange: (index: number | null) => void
}

/** Trình xem ảnh toàn màn hình: phím ←/→ chuyển ảnh, Esc đóng, giữ focus trong hộp thoại (Radix Dialog). */
export function PhotoViewer({ photos, index, onIndexChange }: PhotoViewerProps) {
  const total = photos.length
  const open = index !== null && total > 0
  const go = (step: number) => onIndexChange(((index ?? 0) + step + total) % total)
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(o) => !o && onIndexChange(null)}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-[rgb(20_17_13/0.88)] data-open:animate-in data-open:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onKeyDown={(e) => {
            if (e.key === 'ArrowRight') go(1)
            if (e.key === 'ArrowLeft') go(-1)
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 p-6 text-[#FEF7EC] outline-none"
        >
          <DialogPrimitive.Title className="sr-only">Xem ảnh</DialogPrimitive.Title>
          <div className="flex w-full max-w-[880px] items-center justify-between gap-3">
            <span className="text-sm tabular-nums" aria-live="polite">
              {open ? `${index + 1} / ${total}` : ''}
            </span>
            <DialogPrimitive.Close asChild>
              <Button variant="outline" size="icon" aria-label="Đóng" className="border-[#BDB4A5] text-[#FEF7EC] hover:bg-white/10">
                <X aria-hidden="true" />
              </Button>
            </DialogPrimitive.Close>
          </div>
          {/* Điện thoại: ảnh rộng hết khung, hai nút chuyển ảnh nằm dưới. Từ 640 px: nút hai bên ảnh. */}
          <div className="grid w-full max-w-[880px] grid-cols-2 items-center gap-3 sm:grid-cols-[auto_minmax(0,1fr)_auto]">
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Ảnh trước"
              onClick={() => go(-1)}
              className="row-start-2 justify-self-start rounded-full border-[#BDB4A5] text-[#FEF7EC] hover:bg-white/10 sm:col-start-1 sm:row-start-1"
            >
              <ChevronLeft aria-hidden="true" />
            </Button>
            {open ? (
              <div
                key={index}
                className={cn(
                  'col-span-2 row-start-1 flex aspect-[4/3] min-w-0 animate-rise flex-col items-center justify-center gap-2 rounded-[18px] border-[1.5px] border-[#FEF7EC] text-[#6A6255] sm:col-span-1 sm:col-start-2',
                  PHOTO_TINTS[index % PHOTO_TINTS.length],
                )}
              >
                <Image className="size-10" aria-hidden="true" />
                <span className="text-sm">{photos[index].label}</span>
              </div>
            ) : null}
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Ảnh sau"
              onClick={() => go(1)}
              className="row-start-2 justify-self-end rounded-full border-[#BDB4A5] text-[#FEF7EC] hover:bg-white/10 sm:col-start-3 sm:row-start-1"
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
