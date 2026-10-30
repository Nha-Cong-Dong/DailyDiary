import { CalendarCell } from '@/components/diary/CalendarCell'
import { scoreLabel } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { monthLabel, type MonthTimeline } from './monthTimeline'

const DOWS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN']

type MonthCalendarProps = {
  data: MonthTimeline
  iconSetId: string
  today: number | null
  selected: number | null
  onSelect: (day: number) => void
}

/** Lịch tháng bên cạnh danh sách: main icon + sub icon từng ngày; bấm một ngày để cuộn tới trang đó. */
export function MonthCalendar({ data, iconSetId, today, selected, onSelect }: MonthCalendarProps) {
  const [y, m] = data.month.split('-').map(Number)
  // Tuần bắt đầu từ thứ Hai.
  const lead = (new Date(Date.UTC(y, m - 1, 1)).getUTCDay() + 6) % 7
  const tail = (7 - ((lead + data.days.length) % 7)) % 7
  return (
    <div
      className="flex animate-rise flex-col gap-2.5 rounded-[18px] border-(length:--stroke-width) border-line bg-card p-3 md:gap-3 md:rounded-[20px] md:p-[18px]"
      style={{ animationDelay: '.15s' }}
    >
      <div className="flex items-baseline justify-between max-md:hidden">
        <span className="font-heading text-reading leading-6 font-semibold">{monthLabel(data.month)}</span>
        <span className="text-label leading-[18px] text-muted-foreground tabular-nums">
          {data.recorded}/{data.countable} ngày
        </span>
      </div>
      <div className="grid grid-cols-7 gap-[3px] md:gap-1">
        {DOWS.map((w) => (
          <span key={w} aria-hidden="true" className="text-center text-[11px] leading-[14px] font-semibold text-muted-foreground">
            {w}
          </span>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <span key={`l${i}`} aria-hidden="true" />
        ))}
        {data.days.map((d) => {
          if (d.kind === 'future' || d.kind === 'pre') {
            return (
              <span
                key={d.day}
                aria-hidden="true"
                // Không đặt chiều cao: hàng toàn ngày chưa tới thu gọn, hàng lẫn với ngày đã qua tự giãn theo ô bên cạnh.
                className="flex min-h-7 justify-center pt-1 text-[11px] leading-3 text-faint tabular-nums"
              >
                {d.day}
              </span>
            )
          }
          const isToday = d.day === today
          const label = `${d.day} tháng ${m}${isToday ? ', hôm nay' : ''}${
            d.entry ? `, điểm ${d.entry.score}, ${scoreLabel(iconSetId, d.entry.score)}` : isToday ? ', chưa ghi' : ', không ghi'
          }`
          return (
            <CalendarCell
              key={d.day}
              day={d.day}
              score={d.entry?.score ?? null}
              subIcon={d.entry?.sub_icon}
              iconSetId={iconSetId}
              state={isToday ? 'today' : 'past'}
              label={label}
              numberPosition="top"
              onClick={() => onSelect(d.day)}
              className={cn(
                'min-h-[54px] pt-1 transition-transform duration-200 ease-out hover:[transform:translateY(-2px)_scale(1.04)] active:[transform:scale(.97)] md:min-h-[60px]',
                selected === d.day && 'shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--line)]',
                d.kind === 'open' && 'ring-[3px] ring-peach',
              )}
              iconClassName="animate-pop"
              iconStyle={{
                animationDelay: `${(0.2 + (lead + d.day) * 0.014).toFixed(3)}s`,
              }}
            />
          )
        })}
        {Array.from({ length: tail }, (_, i) => (
          <span key={`t${i}`} aria-hidden="true" />
        ))}
      </div>
      <p className="text-label leading-[18px] text-muted-foreground md:hidden">Chạm một ngày để xem nhanh.</p>
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 text-label leading-[18px] text-muted-foreground max-md:hidden">
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-full border-(length:--stroke-width) border-dashed border-muted-foreground" />
          Không ghi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-[4px] border-2 border-line" />
          Hôm nay
        </span>
        <span>Bấm một ngày để đến trang đó</span>
      </div>
    </div>
  )
}
