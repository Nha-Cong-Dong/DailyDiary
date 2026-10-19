import { cn } from '@/lib/utils'
import { SCORES, scoreLabel, type Score } from '@/lib/catalog'
import { ScoreIcon } from './ScoreIcon'

type ScorePickerProps = {
  iconSetId: string
  value: Score | null
  onChange: (score: Score) => void
  /** Hiện số điểm dưới icon (màn viết nhật ký); tắt ở bản rút gọn (landing, thông báo). */
  showNumber?: boolean
  className?: string
}

/** Năm nút chấm điểm 1–5. Đặt trong <fieldset><legend> để có nhãn nhóm. */
export function ScorePicker({ iconSetId, value, onChange, showNumber = true, className }: ScorePickerProps) {
  return (
    <div className={cn('grid grid-cols-5 gap-2 sm:gap-3', className)}>
      {SCORES.map((score) => {
        const on = value === score
        return (
          <button
            key={score}
            type="button"
            aria-label={`Điểm ${score}, ${scoreLabel(iconSetId, score)}`}
            aria-pressed={on}
            onClick={() => onChange(score)}
            className={cn(
              'flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] text-foreground transition-[transform,box-shadow,background-color] duration-150 outline-none hover:[&_svg]:animate-wiggle active:[transform:translate(2px,2px)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
              showNumber ? 'h-[92px]' : 'h-[72px]',
              on
                ? 'border-line bg-secondary shadow-ink-sm'
                : 'border-border bg-transparent hover:border-line hover:bg-card',
            )}
          >
            {/* Icon vừa chọn "đóng dấu" một nhịp; key đổi để animation chạy lại mỗi lần chọn. */}
            <ScoreIcon key={on ? 'on' : 'off'} iconSetId={iconSetId} score={score} size={40} className={on ? 'animate-stamp' : undefined} />
            {showNumber ? <span className="text-[13px] leading-[18px] font-semibold">{score}</span> : null}
          </button>
        )
      })}
    </div>
  )
}
