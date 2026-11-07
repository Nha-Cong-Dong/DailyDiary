import { useLayoutEffect, useRef, type RefObject } from 'react'
import { Link, useNavigate } from 'react-router'
import { CalendarCell } from '@/components/diary/CalendarCell'
import { DayMorph } from '@/components/diary/DayMorph'
import type { Score } from '@/lib/catalog'
import { daysInMonth, weekdayShort, type DateString } from '@/lib/date'
import type { RecentDaysData } from '../useRecentDays'

type MonthStripProps = {
  today: DateString
  iconSetId: string
  /** Điểm và sub icon của hôm nay (đang chấm trên màn này). */
  todayScore: Score | null
  todaySub: string | null
  /** Các ngày đã ghi trong tháng và tóm tắt (useRecentDays); chưa có thì các ngày hiện "chưa ghi". */
  recent?: RecentDaysData
  /** Ô hôm nay, để icon vừa chấm bay vào (lib/flyTo). */
  todayCellRef?: RefObject<HTMLDivElement | null>
}

/**
 * Dải tháng (B6 · Hôm nay): mọi ngày của tháng hiện tại, cuộn ngang. Hôm nay nền đào; ngày đã ghi mở trang ngày; ngày
 * bỏ trống có vòng nét đứt, chạm để ghi bù; ngày chưa tới không bấm được. Mở màn thì cuộn để hôm nay và hai ngày sau
 * nằm ở mép phải. Tiêu đề kèm tóm tắt "Đã ghi 15/18 ngày · trung bình 3,6".
 */
export function MonthStrip({ today, iconSetId, todayScore, todaySub, recent, todayCellRef }: MonthStripProps) {
  const navigate = useNavigate()
  const strip = useRef<HTMLDivElement>(null)
  const year = Number(today.slice(0, 4))
  const month = Number(today.slice(5, 7))
  const todayNum = Number(today.slice(8, 10))
  const prefix = today.slice(0, 8)
  const days = Array.from({ length: daysInMonth(year, month) }, (_, i) => `${prefix}${String(i + 1).padStart(2, '0')}`)
  const recorded = (recent?.monthRecorded ?? 0) + (todayScore ? 1 : 0)
  const sum = (recent?.monthScoreSum ?? 0) + (todayScore ?? 0)
  const average = recorded ? (sum / recorded).toFixed(1).replace('.', ',') : null

  // Cuộn một lần lúc mở (không animation: đây là vị trí ban đầu, không phải chuyển động).
  useLayoutEffect(() => {
    const el = strip.current
    const cell = el?.querySelector<HTMLElement>('[data-today="1"]')
    if (!el || !cell) return
    el.scrollLeft = cell.offsetLeft + cell.offsetWidth + 2 * (cell.offsetWidth + 8) - el.clientWidth
  }, [today])

  return (
    <section aria-labelledby="month-strip" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 id="month-strip" className="text-sm leading-[22px] font-semibold">
          Tháng {month}
        </h2>
        {recent ? (
          <p className="text-[13px] leading-[18px] font-medium text-ink-soft nums">
            Đã ghi {recorded}/{todayNum} ngày{average ? ` · trung bình ${average}` : ''}
          </p>
        ) : null}
      </div>
      <div
        ref={strip}
        role="list"
        aria-label={`Các ngày trong tháng ${month}`}
        className="scroll-strip relative -mx-1 flex snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain px-1 pt-1 pb-3"
      >
        {days.map((date) => {
          const day = Number(date.slice(8, 10))
          const isToday = date === today
          const future = date > today
          const past = recent?.days[date]
          const score = isToday ? todayScore : (past?.score ?? null)
          const sub = isToday ? todaySub : (past?.sub_icon ?? null)
          const label =
            `${day}/${month}` +
            (isToday ? ' · hôm nay' : '') +
            (future ? '' : score ? ` · điểm ${score}` : isToday ? ' · chưa chấm' : ' · chưa ghi, chạm để ghi bù')
          const cell = (
            <CalendarCell
              day={day}
              weekday={weekdayShort(date)}
              score={future ? null : score}
              subIcon={future ? null : sub}
              iconSetId={iconSetId}
              state={isToday ? 'today' : future ? 'future' : 'past'}
              label={label}
              onClick={
                future ? undefined : () => navigate(score || isToday ? `/day/${date}` : `/day/${date}/backfill`)
              }
              className="w-full"
            />
          )
          return (
            <div
              key={date}
              role="listitem"
              data-today={isToday ? '1' : '0'}
              ref={isToday ? todayCellRef : undefined}
              className="w-12 flex-none snap-end"
            >
              {isToday ? <DayMorph date={date}>{cell}</DayMorph> : cell}
            </div>
          )
        })}
      </div>
      <Link
        to="/timeline"
        className="link-underline inline-flex min-h-11 items-center self-start text-sm leading-[22px] font-medium"
      >
        Xem dòng thời gian
      </Link>
    </section>
  )
}
