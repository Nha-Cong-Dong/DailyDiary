import { Link, useNavigate } from 'react-router'
import { CalendarCell } from '@/components/diary/CalendarCell'
import type { Score } from '@/lib/catalog'
import { dayOfMonth, daysEndingAt, weekdayShort, type DateString } from '@/lib/date'

type RecentDaysProps = {
  today: DateString
  iconSetId: string
  /** Điểm và sub icon của hôm nay (đang chấm trên màn này). */
  todayScore: Score | null
  todaySub: string | null
}

/**
 * Dải "7 ngày qua". Chưa có API lịch (Bước 9) nên 6 ngày trước hiện "chưa ghi";
 * khi có dữ liệu thật thì truyền điểm từng ngày vào cùng chỗ này.
 */
export function RecentDays({ today, iconSetId, todayScore, todaySub }: RecentDaysProps) {
  const navigate = useNavigate()
  const days = daysEndingAt(today, 7)
  return (
    <section aria-labelledby="recent-days" className="flex flex-col gap-3.5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="recent-days" className="font-sans text-sm leading-[22px] font-semibold">
          7 ngày qua
        </h2>
        <Link to="/timeline" className="link-underline text-sm leading-[22px] font-medium">
          Xem dòng thời gian
        </Link>
      </div>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {days.map((date) => {
          const isToday = date === today
          const score = isToday ? todayScore : null
          const day = dayOfMonth(date)
          return (
            <CalendarCell
              key={date}
              day={day}
              weekday={weekdayShort(date)}
              score={score}
              subIcon={isToday ? todaySub : null}
              iconSetId={iconSetId}
              state={isToday ? 'today' : 'past'}
              label={`${day}/${Number(date.slice(5, 7))}${score ? ` · điểm ${score}` : ' · chưa ghi'}`}
              className={isToday ? 'shadow-[2px_2px_0_var(--ink-shadow)]' : undefined}
              onClick={() => navigate(`/day/${date}`)}
            />
          )
        })}
      </div>
    </section>
  )
}
