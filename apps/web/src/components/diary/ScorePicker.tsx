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

/**
 * Năm nút chấm điểm 1–5 (B11-Components · Bộ chấm điểm). Mục đang chọn nền lavender-soft, viền mực, bóng 2px; icon
 * đóng dấu một nhịp 220ms. Đặt trong <fieldset><legend> (hoặc role="group" + aria-label) để có nhãn nhóm.
 * Mỗi nút có `data-score`, để lib/flyTo tìm icon vừa chọn: `root.querySelector('[data-score="4"] svg')`.
 */
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
            data-score={score}
            onClick={() => onChange(score)}
            className={cn(
              'pick flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-md border-[1.5px] text-ink outline-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus',
              caption === 'number' ? 'h-[92px]' : caption === 'label' ? 'min-h-20 pt-3.5 pb-2.5' : 'h-[72px]',
              on
                ? 'border-stroke bg-lavender-soft shadow-sm'
                : 'border-line-soft bg-transparent pointer-fine:hover:border-stroke pointer-fine:hover:bg-card',
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
            {caption === 'number' ? <span className="text-label nums">{score}</span> : null}
            {caption === 'label' ? (
              <span aria-hidden="true" className="px-0.5 text-center text-[11px] leading-[14px] font-medium min-[400px]:text-label min-[400px]:font-medium">
                {label}
              </span>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}
