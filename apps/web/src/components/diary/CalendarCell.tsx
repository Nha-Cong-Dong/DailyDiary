import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { Score } from '@/lib/catalog'
import { DayMorph } from './DayMorph'
import { MoodMark } from './MoodMark'

export type DayState = 'past' | 'today' | 'future'

type CalendarCellProps = {
  day: number
  /** Nhãn thứ (T2…CN) khi ô đứng riêng, không nằm dưới hàng tiêu đề. */
  weekday?: string
  score: Score | null
  iconSetId: string
  subIcon?: string | null
  state: DayState
  size?: 'sm' | 'md'
  /** Nhãn đầy đủ cho trình đọc màn hình, ví dụ "18/10, điểm 4". */
  label: string
  onClick?: () => void
  className?: string
  /** Class/style cho vùng icon (ví dụ icon lần lượt hiện ra trên landing). */
  iconClassName?: string
  iconStyle?: CSSProperties
  /** Vị trí số ngày: 'bottom' (mặc định, landing, dải tháng) hoặc 'top' (lịch tháng ở Dòng thời gian, thiết kế B8/B10). */
  numberPosition?: 'top' | 'bottom'
  /** Ngày "YYYY-MM-DD" để icon nối sang vòng icon ở trang ngày khi chuyển trang (DayMorph). Chỉ dùng khi màn không
   * có phần tử nào khác mang icon của cùng ngày. */
  morphDate?: string
}

/** Một ô ngày trong lịch tháng: main icon + sub icon, hoặc vòng nét đứt nếu ngày đã qua mà chưa ghi. */
export function CalendarCell({
  day,
  weekday,
  score,
  iconSetId,
  subIcon,
  state,
  size = 'md',
  label,
  onClick,
  className,
  iconClassName,
  iconStyle,
  numberPosition = 'bottom',
  morphDate,
}: CalendarCellProps) {
  const icon = size === 'md' ? 32 : 24
  const classes = cn(
    'flex flex-col items-center justify-between rounded-sm border-(length:--stroke-width) text-foreground',
    size === 'md' ? 'min-h-[76px] px-0 pt-1.5 pb-1' : 'h-12 pt-1 pb-0.5',
    weekday && 'gap-1.5 py-2.5',
    // Hôm nay: màu đào của "bây giờ" (DESIGN.md mục 2); chữ trên đào luôn là on-accent ở cả hai chế độ.
    state === 'today' && 'border-line bg-peach text-on-accent shadow-ink-sm',
    state === 'past' && 'border-border',
    state === 'future' && 'border-transparent',
    onClick && 'cursor-pointer hover:border-line focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
    className,
  )
  const number = (
    <span
      className={cn(
        'tabular-nums',
        size === 'md' ? 'text-label leading-[18px]' : 'text-label leading-3',
        state === 'today' ? 'font-bold' : 'font-medium',
        state === 'future' ? 'text-faint' : state === 'today' ? 'text-on-accent' : 'text-foreground',
      )}
    >
      {day}
    </span>
  )
  const content = (
    <>
      {weekday ? (
        <span className={cn('text-label font-semibold', state === 'today' ? 'text-on-accent' : 'text-muted-foreground')}>
          {weekday}
        </span>
      ) : null}
      {numberPosition === 'top' ? number : null}
      <span
        data-cell-icon=""
        className={cn('flex items-center justify-center', iconClassName)}
        style={{ width: icon, height: icon, ...iconStyle }}
      >
        {score && morphDate ? (
          <DayMorph date={morphDate}>
            <span className="inline-flex">
              <MoodMark iconSetId={iconSetId} score={score} subIcon={subIcon} size={icon} variant="plain" />
            </span>
          </DayMorph>
        ) : score ? (
          <MoodMark iconSetId={iconSetId} score={score} subIcon={subIcon} size={icon} variant="plain" />
        ) : state === 'future' ? null : (
          <span
            aria-hidden="true"
            className={cn(
              'rounded-full border-(length:--stroke-width) border-dashed',
              state === 'today' ? 'border-on-accent' : 'border-muted-foreground',
            )}
            style={{ width: icon * 0.8, height: icon * 0.8 }}
          />
        )}
      </span>
      {numberPosition === 'bottom' ? number : null}
    </>
  )
  if (onClick) {
    return (
      <button type="button" aria-label={label} onClick={onClick} data-state={state} className={classes}>
        {content}
      </button>
    )
  }
  return (
    <div title={label} data-state={state} className={classes}>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="contents">
        {content}
      </span>
    </div>
  )
}
