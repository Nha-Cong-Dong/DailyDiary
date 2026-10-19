import { CalendarCell } from '@/components/diary/CalendarCell'
import { cn } from '@/lib/utils'
import { DEMO_ICON_SET, DEMO_TODAY, OCTOBER, WEEKDAYS } from './demoData'

// 1/10/2026 là thứ Năm: 3 ô trống đầu tuần (T2–T4).
const LEADING_BLANKS = 3

/** Lịch tháng 10 thu nhỏ trong hero. Thẻ rơi xuống khi vào trang, thẳng lại khi di chuột. */
export function MonthPreview({ className }: { className?: string }) {
  const recorded = Object.keys(OCTOBER).length
  return (
    <div
      className={cn('tilt animate-drop-right rounded-[20px] border-[1.5px] border-line bg-card p-4 shadow-ink', className)}
      style={{ animationDelay: '.15s' }}
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-heading text-base leading-6 font-semibold">Tháng 10, 2026</span>
        <span className="text-xs leading-[18px] text-muted-foreground">
          {recorded}/{DEMO_TODAY} ngày
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-label font-semibold text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: LEADING_BLANKS }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length: 31 }, (_, i) => {
          const day = i + 1
          const entry = OCTOBER[day]
          const state = day === DEMO_TODAY ? 'today' : day < DEMO_TODAY ? 'past' : 'future'
          return (
            <CalendarCell
              key={day}
              day={day}
              size="sm"
              iconSetId={DEMO_ICON_SET}
              score={entry?.score ?? null}
              subIcon={entry?.sub}
              state={state}
              label={`${day}/10${entry ? `, điểm ${entry.score}` : state === 'past' ? ', chưa ghi' : ''}`}
              className={cn(
                'transition-transform duration-200 ease-[cubic-bezier(.3,1.5,.5,1)] hover:[transform:translateY(-3px)_scale(1.14)] active:[transform:scale(.94)]',
                state === 'today' && 'shadow-none',
              )}
              // Icon từng ngày lần lượt bật ra sau khi thẻ lịch rơi xuống.
              iconClassName="animate-pop"
              iconStyle={{ animationDelay: `${(0.65 + day * 0.035).toFixed(2)}s` }}
            />
          )
        })}
      </div>
    </div>
  )
}
