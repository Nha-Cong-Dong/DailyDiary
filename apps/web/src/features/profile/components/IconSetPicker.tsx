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

/** Lưới 6 bộ main icon (tên bộ lấy từ shared/icons.json); dùng ở bước 2 lần đầu và trong Hồ sơ. */
export function IconSetPicker({ value, onChange, labelledBy, className }: IconSetPickerProps) {
  return (
    <div
      role="group"
      aria-label={labelledBy ? undefined : 'Bộ icon'}
      aria-labelledby={labelledBy}
      className={cn('grid grid-cols-1 gap-3.5 min-[420px]:grid-cols-2 sm:grid-cols-3', className)}
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
              'group/set relative flex cursor-pointer flex-col items-center gap-2.5 rounded-[16px] border-(length:--stroke-width) px-2 pt-4 pb-3.5 text-foreground transition-[transform,box-shadow,background-color] duration-150 active:[transform:translate(2px,2px)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
              on ? 'border-line bg-muted shadow-ink-sm' : 'border-border bg-card hover:border-line',
            )}
          >
            <span className="flex gap-0.5">
              {SCORES.map((s) => (
                <span key={s}>
                  <ScoreIcon iconSetId={set.id} score={s} size={26} />
                </span>
              ))}
            </span>
            <span className="text-sm leading-5 font-semibold">{set.name}</span>
            {on ? (
              <span
                aria-hidden="true"
                className="absolute -top-[9px] -right-[9px] flex size-6 animate-pop items-center justify-center rounded-full bg-primary text-primary-foreground"
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
