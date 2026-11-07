import { Check } from 'lucide-react'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { iconSets, SCORES } from '@/lib/catalog'
import { cn } from '@/lib/utils'

type IconSetPickerProps = {
  value: string
  onChange: (iconSetId: string) => void
  /** Nhãn nhóm cho trình đọc màn hình (id của phần tử làm nhãn). */
  labelledBy?: string
  className?: string
}

/**
 * Lưới 6 bộ main icon (tên bộ lấy từ shared/icons.json); dùng ở bước 2 lần đầu và trong Hồ sơ (canvas .j-opt / .j-set).
 * Bộ đang chọn: nền sunk, viền mực, bóng 2 px và dấu ✓ đóng vào góc. Bộ khác: viền mảnh, di chuột (chỉ chuột) viền mực.
 * Ấn: dịch 2 px như ấn tờ giấy xuống trang.
 */
export function IconSetPicker({ value, onChange, labelledBy, className }: IconSetPickerProps) {
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : 'Bộ icon'}
      aria-labelledby={labelledBy}
      className={cn('grid grid-cols-[repeat(auto-fill,minmax(min(190px,100%),1fr))] gap-3.5', className)}
    >
      {iconSets.map((set) => {
        const on = set.id === value
        return (
          <button
            key={set.id}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(set.id)}
            className={cn(
              'relative flex cursor-pointer select-none flex-col items-center gap-2.5 rounded-[16px] border-[1.5px] px-2 pt-4 pb-3.5 text-ink transition-[transform,box-shadow,background-color,border-color] duration-(--dur-fast) ease-out active:translate-x-0.5 active:translate-y-0.5 active:shadow-none active:duration-(--dur-press) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus motion-reduce:active:translate-none',
              on ? 'border-stroke bg-sunk shadow-sm' : 'border-line-soft bg-card pointer-fine:hover:border-stroke',
            )}
          >
            <span className="flex gap-0.5">
              {SCORES.map((s) => (
                <ScoreIcon key={s} iconSetId={set.id} score={s} size={26} />
              ))}
            </span>
            <span className="text-sm leading-5 font-semibold">{set.name}</span>
            {on ? (
              <span
                aria-hidden="true"
                className="absolute -top-[9px] -right-[9px] flex size-6 animate-pop items-center justify-center rounded-full bg-primary text-on-primary"
              >
                <Check className="size-3.5" strokeWidth={3} />
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
