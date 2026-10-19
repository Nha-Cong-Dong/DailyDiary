import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Score } from '@/lib/catalog'
import type { DayState } from './CalendarCell'
import type { PixelFilter } from './pixelFilter'

type PixelCellProps = {
  score: Score | null
  state: DayState
  /** Ví dụ "18/10 · điểm 4". */
  label: string
  className?: string
  style?: CSSProperties
}

const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1 border-score-1',
  2: 'bg-score-2 border-score-2',
  3: 'bg-score-3 border-score-3',
  4: 'bg-score-4 border-score-4',
  5: 'bg-score-5 border-score-5',
}

/** Một ô ngày trong Year in Pixels: màu theo điểm; "chưa ghi" là ô lõm; "chưa tới" chỉ có viền. */
export function PixelCell({ score, state, label, className, style }: PixelCellProps) {
  return (
    <div
      title={label}
      style={style}
      className={cn(
        'aspect-square rounded-[4px] border',
        score ? SCORE_BG[score] : state === 'future' ? 'border-border bg-transparent' : 'border-border bg-muted',
        className,
      )}
    />
  )
}

const LEGEND: { key: PixelFilter; label: string; aria: string; score: Score | null; state: DayState }[] = [
  { key: 1, label: '1', aria: 'Chỉ xem ngày điểm 1', score: 1, state: 'past' },
  { key: 2, label: '2', aria: 'Chỉ xem ngày điểm 2', score: 2, state: 'past' },
  { key: 3, label: '3', aria: 'Chỉ xem ngày điểm 3', score: 3, state: 'past' },
  { key: 4, label: '4', aria: 'Chỉ xem ngày điểm 4', score: 4, state: 'past' },
  { key: 5, label: '5', aria: 'Chỉ xem ngày điểm 5', score: 5, state: 'past' },
  { key: 'missing', label: 'Chưa ghi', aria: 'Chỉ xem ngày chưa ghi', score: null, state: 'past' },
  { key: 'future', label: 'Chưa tới', aria: 'Chỉ xem ngày chưa tới', score: null, state: 'future' },
]

type PixelLegendProps = {
  className?: string
  /** Nhóm đang lọc (bấm để giữ, bấm lại để bỏ). Có `onToggle` thì chú thích thành các nút lọc. */
  active?: PixelFilter | null
  onToggle?: (key: PixelFilter) => void
  /** Di chuột lên một mục để làm nổi tạm thời; `null` khi rời chuột. */
  onHighlight?: (key: PixelFilter | null) => void
}

/** Chú thích màu dưới lưới pixels; có thể dùng làm bộ lọc. */
export function PixelLegend({ className, active = null, onToggle, onHighlight }: PixelLegendProps) {
  return (
    <ul className={cn('flex flex-wrap items-center text-label', onToggle ? 'gap-1' : 'gap-3.5', className)}>
      {LEGEND.map((item) => {
        const swatch = (
          <PixelCell
            score={item.score}
            state={item.state}
            label={item.label}
            className="size-3.5 transition-transform duration-250 ease-[cubic-bezier(.3,1.6,.5,1)] group-hover/leg:[transform:scale(1.35)_rotate(-10deg)]"
          />
        )
        return (
          <li key={item.label}>
            {onToggle ? (
              <button
                type="button"
                aria-label={item.aria}
                aria-pressed={active === item.key}
                onClick={() => onToggle(item.key)}
                onMouseEnter={() => onHighlight?.(item.key)}
                onMouseLeave={() => onHighlight?.(null)}
                onFocus={() => onHighlight?.(item.key)}
                onBlur={() => onHighlight?.(null)}
                className={cn(
                  'group/leg inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-2.5 transition-transform hover:[transform:translateY(-2px)] active:[transform:scale(.95)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  active === item.key ? 'border-line' : 'border-transparent',
                )}
              >
                {swatch}
                {item.label}
              </button>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                {swatch}
                {item.label}
              </span>
            )}
          </li>
        )
      })}
    </ul>
  )
}
