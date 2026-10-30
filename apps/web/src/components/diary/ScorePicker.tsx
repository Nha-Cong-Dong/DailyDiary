import { cn } from '@/lib/utils'
import { SCORES, scoreLabel, type Score } from '@/lib/catalog'
import { ScoreIcon } from './ScoreIcon'

type ScorePickerProps = {
  iconSetId: string
  value: Score | null
  onChange: (score: Score) => void
  /** Chữ dưới icon: số điểm (form đầy đủ), tên mức (màn Hôm nay) hoặc không có (landing, thông báo). */
  caption?: 'number' | 'label' | 'none'
  /** Class cho icon, ví dụ đổi cỡ theo màn hình (mặc định 40 px). */
  iconClassName?: string
  /** Class cho từng nút, ví dụ chiều cao riêng trên điện thoại. */
  itemClassName?: string
  className?: string
}

/** Năm nút chấm điểm 1–5. Đặt trong <fieldset><legend> để có nhãn nhóm. */
export function ScorePicker({
  iconSetId,
  value,
  onChange,
  caption = 'number',
  iconClassName,
  itemClassName,
  className,
}: ScorePickerProps) {
  return (
    <div className={cn('grid grid-cols-5 gap-2 sm:gap-3', className)}>
      {SCORES.map((score) => {
        const on = value === score
        const label = scoreLabel(iconSetId, score)
        return (
          <button
            key={score}
            type="button"
            aria-label={`Điểm ${score}, ${label}`}
            aria-pressed={on}
            onClick={() => onChange(score)}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] text-foreground transition-[transform,box-shadow,background-color] duration-200 ease-out outline-none hover:-translate-y-0.5 active:[transform:translate(2px,2px)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
              caption === 'number' ? 'h-[92px]' : caption === 'label' ? 'min-h-20 py-2.5 sm:pt-3.5' : 'h-[72px]',
              on
                ? 'border-line bg-secondary shadow-ink-sm'
                : 'border-border bg-transparent hover:border-line hover:bg-card',
              itemClassName,
            )}
          >
            {/* Icon vừa chọn "đóng dấu" một nhịp; key đổi để animation chạy lại mỗi lần chọn. */}
            <ScoreIcon
              key={on ? 'on' : 'off'}
              iconSetId={iconSetId}
              score={score}
              size={40}
              className={cn(on && 'animate-stamp', iconClassName)}
            />
            {caption === 'number' ? <span className="text-[13px] leading-[18px] font-semibold">{score}</span> : null}
            {caption === 'label' ? (
              <span aria-hidden="true" className="px-0.5 text-center text-[11px] leading-[14px] font-medium sm:text-[13px] sm:leading-[18px]">
                {label}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
