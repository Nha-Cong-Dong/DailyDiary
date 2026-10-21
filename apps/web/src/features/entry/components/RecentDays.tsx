import { Link, useNavigate } from 'react-router'
import { CalendarCell } from '@/components/diary/CalendarCell'
import type { Score } from '@/lib/catalog'
import { dayOfMonth, daysEndingAt, weekdayShort, type DateString } from '@/lib/date'
import type { RecentDaysData } from '../useRecentDays'

type RecentDaysProps = {
  today: DateString
  iconSetId: string
  /** Điểm và sub icon của hôm nay (đang chấm trên màn này). */
  todayScore: Score | null
  todaySub: string | null
  /** 6 ngày trước và tóm tắt tháng (useRecentDays); chưa có thì các ngày hiện "chưa ghi". */
  recent?: RecentDaysData
}

/** Dải "7 ngày qua" và một dòng tóm tắt tháng, cùng số liệu với Dòng thời gian. */
export function RecentDays({ today, iconSetId, todayScore, todaySub, recent }: RecentDaysProps) {
  const navigate = useNavigate()
  const days = daysEndingAt(today, 7)
  const recorded = (recent?.monthRecorded ?? 0) + (todayScore ? 1 : 0)
  const sum = (recent?.monthScoreSum ?? 0) + (todayScore ?? 0)
  const average = recorded ? (sum / recorded).toFixed(1).replace('.', ',') : null
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
          const past = recent?.days[date]
          const score = isToday ? todayScore : (past?.score ?? null)
          const day = dayOfMonth(date)
          return (
            <CalendarCell
              key={date}
              day={day}
              weekday={weekdayShort(date)}
              score={score}
              subIcon={isToday ? todaySub : (past?.sub_icon ?? null)}
              iconSetId={iconSetId}
              state={isToday ? 'today' : 'past'}
              label={`${day}/${Number(date.slice(5, 7))}${score ? ` · điểm ${score}` : ' · chưa ghi'}`}
              className={isToday ? 'shadow-[2px_2px_0_var(--ink-shadow)]' : undefined}
              onClick={() => navigate(`/day/${date}`)}
            />
          )
        })}
      </div>
      {recent ? (
        <p className="text-[13px] leading-5 text-muted-foreground tabular-nums">
          Tháng {Number(today.slice(5, 7))}: đã ghi {recorded}/{dayOfMonth(today)} ngày
          {average ? ` · trung bình ${average}` : ''}
        </p>
      ) : null}
    </section>
  )
}
