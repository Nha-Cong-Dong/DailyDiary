import { CalendarCell } from '@/components/diary/CalendarCell'
import type { Score } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { DEMO_ICON_SET, DEMO_TODAY, OCTOBER, WEEKDAYS } from './demoData'

/** Một tháng để vẽ: mặc định là tháng 10/2026 mẫu; trang chủ đã đăng nhập truyền tháng hiện tại của người dùng. */
export type PreviewMonth = {
  year: number
  /** 1–12 */
  month: number
  /** Ngày hôm nay trong tháng (ngày sau đó là "chưa tới"). */
  today: number
  days: Record<number, { score: Score; sub?: string | null }>
  iconSetId: string
}

const DEMO_MONTH: PreviewMonth = { year: 2026, month: 10, today: DEMO_TODAY, days: OCTOBER, iconSetId: DEMO_ICON_SET }

type MonthPreviewProps = {
  className?: string
  month?: PreviewMonth
  /**
   * `hero` (mặc định): thẻ nghiêng trong hero, "dán" xuống trang khi vào, icon các ngày lần lượt hiện ra, thẳng lại khi
   * di chuột. `still`: thẻ đứng yên, dùng trong cảnh cuộn (chuyển động do cảnh lo).
   */
  variant?: 'hero' | 'still'
  /** Ô hôm nay tạm để trống: icon của thẻ ngày sắp bay vào (chuỗi mở đầu trang chủ). */
  todayPending?: boolean
}

/** Lịch tháng thu nhỏ trên trang chủ. */
export function MonthPreview({ className, month = DEMO_MONTH, variant = 'hero', todayPending = false }: MonthPreviewProps) {
  const { year, month: m, today, days, iconSetId } = month
  const hero = variant === 'hero'
  const recorded = Object.keys(days).length
  const length = new Date(Date.UTC(year, m, 0)).getUTCDate()
  // Số ô trống đầu tuần (tuần bắt đầu từ thứ Hai).
  const leadingBlanks = (new Date(Date.UTC(year, m - 1, 1)).getUTCDay() + 6) % 7
  return (
    <div
      data-month-preview=""
      data-ui=""
      className={cn('rounded-[20px] border-[1.5px] border-line bg-card p-4 shadow-ink', hero && 'tilt animate-paste', className)}
      style={hero ? { animationDelay: '.15s' } : undefined}
    >
      <div className="mb-2.5 flex items-baseline justify-between">
        <span className="font-heading text-base leading-6 font-semibold">
          Tháng {m}, {year}
        </span>
        <span className="text-label text-muted-foreground">
          {recorded}/{today} ngày
        </span>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-label font-semibold text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: leadingBlanks }, (_, i) => (
          <span key={`blank-${i}`} />
        ))}
        {Array.from({ length }, (_, i) => {
          const day = i + 1
          const state = day === today ? 'today' : day < today ? 'past' : 'future'
          const entry = state === 'today' && todayPending ? undefined : days[day]
          return (
            <CalendarCell
              key={day}
              day={day}
              size="sm"
              iconSetId={iconSetId}
              score={entry?.score ?? null}
              subIcon={entry?.sub}
              state={state}
              label={`${day}/${m}${entry ? `, điểm ${entry.score}` : state === 'past' ? ', chưa ghi' : ''}`}
              className={cn(
                hero &&
                  'transition-transform duration-(--dur-fast) ease-out hover:[transform:translateY(-2px)_scale(1.04)] active:[transform:scale(.97)]',
                state === 'today' && 'shadow-none',
              )}
              // Icon từng ngày lần lượt hiện ra sau khi thẻ lịch dán xuống (chỉ trong hero).
              iconClassName={hero ? 'animate-pop' : undefined}
              iconStyle={hero ? { animationDelay: `${(0.4 + day * 0.02).toFixed(2)}s` } : undefined}
            />
          )
        })}
      </div>
    </div>
  )
}
