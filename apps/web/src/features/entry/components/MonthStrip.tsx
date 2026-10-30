import { useLayoutEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarCell } from '@/components/diary/CalendarCell'
import type { Score } from '@/lib/catalog'
import { daysInMonth, weekdayShort, type DateString } from '@/lib/date'
import type { RecentDaysData } from '../useRecentDays'

type MonthStripProps = {
  today: DateString
  iconSetId: string
  /** Điểm và sub icon của hôm nay (đang chấm trên màn này). */
  todayScore: Score | null
  todaySub: string | null
  /** Các ngày đã ghi trong tháng và tóm tắt tháng (useRecentDays); chưa có thì các ngày hiện "chưa ghi". */
  recent?: RecentDaysData
}

/** Số ô chưa tới vẫn thấy được bên phải ô hôm nay sau khi cuộn sẵn. */
const AHEAD = 2

/**
 * Dải tháng dưới bộ chấm điểm (DESIGN.md mục 8): cả tháng của hôm nay trên một hàng cuộn ngang, cuộn sẵn tới hôm nay.
 * Ngày đã ghi mở trang ngày; ngày đã qua mà chưa ghi mở Ghi bù; ngày chưa tới không bấm được. Tóm tắt tháng chỉ đếm,
 * không khen chê, không chuỗi ngày.
 */
export function MonthStrip({ today, iconSetId, todayScore, todaySub, recent }: MonthStripProps) {
  const navigate = useNavigate()
  const strip = useRef<HTMLDivElement>(null)
  const todayCell = useRef<HTMLDivElement>(null)
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const todayNum = Number(today.slice(8, 10))
  const length = daysInMonth(year, month)
  const recorded = (recent?.monthRecorded ?? 0) + (todayScore ? 1 : 0)
  const sum = (recent?.monthScoreSum ?? 0) + (todayScore ?? 0)
  const average = recorded ? (sum / recorded).toFixed(1).replace('.', ',') : null

  // Cuộn ngang (không cuộn trang) để ô hôm nay nằm gần mép phải, còn thấy vài ngày sắp tới.
  useLayoutEffect(() => {
    const box = strip.current
    const cell = todayCell.current
    if (!box || !cell) return
    const step = cell.offsetWidth + 8
    box.scrollLeft = cell.offsetLeft - box.offsetLeft - box.clientWidth + cell.offsetWidth + AHEAD * step
  }, [today])

  return (
    <section aria-labelledby="month-strip" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="month-strip" className="font-sans text-sm leading-[22px] font-semibold">
          Tháng {month}
        </h2>
        {recent ? (
          <p className="text-label font-medium text-muted-foreground">
            Đã ghi {recorded}/{todayNum} ngày{average ? ` · trung bình ${average}` : ''}
          </p>
        ) : null}
      </div>
      <div
        ref={strip}
        role="list"
        aria-label={`Các ngày trong tháng ${month}`}
        // `relative`: nhãn sr-only (định vị tuyệt đối) của các ô bị cuộn khuất vẫn nằm trong vùng cuộn, không làm trang giãn ngang.
        className="relative -mx-1 flex snap-x snap-proximity gap-2 overflow-x-auto px-1 pt-1 pb-3 [scrollbar-width:thin]"
      >
        {Array.from({ length }, (_, i) => {
          const day = i + 1
          const date = `${today.slice(0, 8)}${String(day).padStart(2, '0')}`
          const isToday = day === todayNum
          const future = day > todayNum
          const past = recent?.days[date]
          const score = isToday ? todayScore : (past?.score ?? null)
          const label = `${day}/${month}${isToday ? ' · hôm nay' : ''}${
            future ? '' : score ? ` · điểm ${score}` : isToday ? ' · chưa chấm' : ' · chưa ghi, chạm để ghi bù'
          }`
          return (
            <div key={date} role="listitem" ref={isToday ? todayCell : undefined} className="w-12 shrink-0 snap-end">
              <CalendarCell
                day={day}
                weekday={weekdayShort(date)}
                score={score}
                subIcon={isToday ? todaySub : (past?.sub_icon ?? null)}
                iconSetId={iconSetId}
                state={isToday ? 'today' : future ? 'future' : 'past'}
                label={label}
                className="w-full"
                onClick={
                  future
                    ? undefined
                    : () => navigate(score || isToday ? `/day/${date}` : `/day/${date}/backfill`)
                }
              />
            </div>
          )
        })}
      </div>
      <Link to="/timeline" className="link-underline self-start text-sm leading-[22px] font-medium">
        Xem dòng thời gian
      </Link>
    </section>
  )
}
