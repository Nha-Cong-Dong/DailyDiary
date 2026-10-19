import { ArrowRight, ChevronLeft, ChevronRight } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { PixelLegend } from '@/components/diary/PixelCell'
import type { PixelFilter } from '@/components/diary/pixelFilter'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel, todayIn, useNow, type DateString } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { useDayPreview, usePixels } from './usePixels'
import { YearGrid } from './YearGrid'
import { decimal, yearStats } from './yearStats'

const panel = 'rounded-[22px] border-[1.5px] border-line bg-card p-6 shadow-ink'
const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}
const FILTER_NAME = (k: PixelFilter) => (typeof k === 'number' ? `điểm ${k}` : k === 'missing' ? 'chưa ghi' : 'chưa tới')
const delay = (s: number) => ({ animationDelay: `${s.toFixed(2)}s` }) as CSSProperties

function SelectedDay({ date, iconSetId, today }: { date: DateString | null; iconSetId: string; today: DateString }) {
  const { data: entry, isPending } = useDayPreview(date)
  return (
    <section aria-labelledby="sel-h" className={cn(panel, 'flex animate-rise flex-col gap-4')} style={delay(0.2)}>
      <h2 id="sel-h" className="font-sans text-sm leading-[22px] font-semibold text-muted-foreground">
        Ngày đã chọn
      </h2>
      <div aria-live="polite" className="flex flex-col gap-4">
        {!date ? (
          <p className="rounded-[14px] border-[1.5px] border-dashed border-border p-5 text-[15px] leading-6 text-muted-foreground">
            Chọn một ô trên bảng để xem lại ngày đó.
          </p>
        ) : isPending ? (
          <p className="text-muted-foreground">Đang mở…</p>
        ) : entry ? (
          <>
            <div className="flex items-start gap-[22px]">
              <span className="flex size-[72px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-background">
                <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={entry.sub_icon} size={52} />
              </span>
              <div className="flex min-w-0 flex-col gap-1">
                <p className="text-[13px] leading-5 text-muted-foreground">
                  {longDateLabel(date)} · Điểm {entry.score} · {scoreLabel(iconSetId, entry.score)}
                </p>
                <h3 className="text-xl leading-7 font-bold">{entry.title ?? 'Chỉ chấm điểm'}</h3>
                {entry.content ? <p className="line-clamp-2 text-[15px] leading-6 text-muted-foreground">{entry.content}</p> : null}
              </div>
            </div>
            <Link
              to={`/day/${date}`}
              className="lift inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] border-[1.5px] border-line bg-card pr-3 pl-4 text-sm font-semibold shadow-ink-sm focus-visible:outline-3 focus-visible:outline-ring"
            >
              Mở trang ngày <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </>
        ) : (
          <div className="flex flex-col gap-1 rounded-[14px] border-[1.5px] border-dashed border-border bg-muted p-5">
            <p className="text-[13px] leading-5 text-muted-foreground">{longDateLabel(date)}</p>
            <p className="text-[15px] leading-6 font-medium">{date > today ? 'Ngày này chưa tới.' : 'Ngày này chưa được ghi.'}</p>
          </div>
        )}
      </div>
    </section>
  )
}

/** Trang Year in Pixels cả năm (thiết kế B7). */
export function YearPixels() {
  const { timeZone, iconSetId } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const [year, setYear] = useState(() => Number(today.slice(0, 4)))
  const [selected, setSelected] = useState<DateString | null>(today)
  const [filter, setFilter] = useState<PixelFilter | null>(null)
  const [highlight, setHighlight] = useState<PixelFilter | null>(null)
  const { data, isPending, isError } = usePixels(year)

  if (isPending) return <p role="status" className="text-muted-foreground">Đang tải Year in Pixels…</p>
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>Không tải được dữ liệu cả năm. Thử tải lại trang.</AlertDescription>
      </Alert>
    )

  const s = yearStats(year, data.days, today, data.joined)
  const years = data.years.includes(year) ? data.years : [...data.years, year].sort()
  const at = years.indexOf(year)
  const prevYear = at > 0 ? years[at - 1] : null
  const nextYear = at < years.length - 1 ? years[at + 1] : null
  const pastYear = `${year}-12-31` < today
  const joinedThisYear = data.joined.startsWith(`${year}-`)
  const avgLevel = s.average ? (Math.max(1, Math.round(s.average)) as Score) : null
  const best = s.bestMonth
  const counts = s.distribution
  const maxCount = Math.max(1, ...counts)
  const filterCount = filter === null ? 0 : s.grid.flat().filter((c) =>
    filter === 'missing' ? c.kind === 'missing' : filter === 'future' ? c.kind === 'future' : c.score === filter,
  ).length

  function changeYear(y: number) {
    setYear(y)
    setFilter(null)
    setHighlight(null)
    setSelected(y === Number(today.slice(0, 4)) ? today : null)
  }

  const stats: { label: string; value: string; sub: string; swatch?: Score }[] = [
    {
      label: 'Ngày đã ghi',
      value: String(s.recorded),
      sub: joinedThisYear ? `trên ${s.pastDays} ngày, từ ${Number(data.joined.slice(8))}/${Number(data.joined.slice(5, 7))}` : `trên ${s.pastDays} ngày đã qua`,
    },
    { label: 'Chuỗi dài nhất', value: `${s.longestStreak} ngày`, sub: pastYear ? `Năm ${year}` : `Chuỗi hiện tại: ${s.currentStreak} ngày` },
    {
      label: 'Điểm trung bình',
      value: s.average === null ? '–' : decimal(s.average),
      sub: avgLevel ? `Gần mức ${scoreLabel(iconSetId, avgLevel)}` : 'Chưa có điểm',
      swatch: avgLevel ?? undefined,
    },
    {
      label: 'Tháng tươi nhất',
      value: best === null ? '–' : `Tháng ${best + 1}`,
      sub: best === null ? '' : `Trung bình ${decimal(s.monthAverages[best]!)}`,
      swatch: best === null ? undefined : (Math.round(s.monthAverages[best]!) as Score),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <div className="flex animate-rise flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Year in Pixels</h1>
          <p className="text-[15px] leading-6 text-muted-foreground">
            {joinedThisYear
              ? `Bạn bắt đầu dùng Jotly từ ${Number(data.joined.slice(8))}/${Number(data.joined.slice(5, 7))}/${year}.`
              : 'Mỗi ô là một ngày, mỗi màu là một mức điểm.'}
          </p>
        </div>
        <div role="group" aria-label="Chọn năm" className="inline-flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-[12px] disabled:border-dashed disabled:border-border"
            aria-label={prevYear ? `Năm trước, ${prevYear}` : 'Không có năm trước'}
            disabled={prevYear === null}
            onClick={() => prevYear && changeYear(prevYear)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="min-w-[72px] text-center font-heading text-title-3 font-bold tabular-nums">
            {year}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="size-10 rounded-[12px] disabled:border-dashed disabled:border-border"
            aria-label={nextYear ? `Năm sau, ${nextYear}` : 'Không có năm sau'}
            disabled={nextYear === null}
            onClick={() => nextYear && changeYear(nextYear)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        {stats.map((st, i) => (
          <div
            key={st.label}
            className="flex animate-rise flex-col gap-1 rounded-[18px] border-[1.5px] border-line bg-card px-5 py-[18px] shadow-ink-sm"
            style={delay(0.04 + i * 0.05)}
          >
            <dt className="text-[13px] leading-5 text-muted-foreground">{st.label}</dt>
            <dd className="inline-flex items-center gap-2.5 font-heading text-[22px] leading-9 font-bold whitespace-nowrap tabular-nums lg:text-[28px]">
              {st.swatch ? <span aria-hidden="true" className={cn('size-3.5 shrink-0 rounded-[4px] border border-line', SCORE_BG[st.swatch])} /> : null}
              {st.value}
            </dd>
            <dd className="text-[13px] leading-5 text-muted-foreground">{st.sub}</dd>
          </div>
        ))}
      </dl>

      <section aria-label="Bảng điểm cả năm" className={cn(panel, 'flex animate-rise flex-col gap-[18px] p-4 sm:p-6')} style={delay(0.1)}>
        <YearGrid
          grid={s.grid}
          monthAverages={s.monthAverages}
          today={today}
          selected={selected}
          onSelect={setSelected}
          focus={highlight ?? filter}
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-border pt-3.5">
          <PixelLegend
            active={filter}
            onToggle={(k) => setFilter((f) => (f === k ? null : k))}
            onHighlight={setHighlight}
            hide={pastYear ? ['future'] : []}
          />
          {filter !== null ? (
            <div className="inline-flex items-center gap-2.5 text-[13px] leading-5 text-muted-foreground">
              <span aria-live="polite">
                Đang xem {FILTER_NAME(filter)} · {filterCount} ngày
              </span>
              <Button variant="outline" size="sm" className="h-[34px]" onClick={() => setFilter(null)}>
                Bỏ lọc
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] gap-6">
        <SelectedDay date={selected} iconSetId={iconSetId} today={today} />
        <section aria-labelledby="dist-h" className={cn(panel, 'flex animate-rise flex-col gap-4')} style={delay(0.26)}>
          <h2 id="dist-h" className="font-sans text-sm leading-[22px] font-semibold text-muted-foreground">
            Phân bố điểm · {year}
          </h2>
          <ul className="flex flex-col gap-3">
            {([5, 4, 3, 2, 1] as Score[]).map((k) => (
              <li key={k} className="grid grid-cols-[96px_minmax(0,1fr)_36px] items-center gap-3">
                <span className="text-[13px] leading-5 font-medium">
                  {k} · {scoreLabel(iconSetId, k)}
                </span>
                <span aria-hidden="true" className="h-3.5 overflow-hidden rounded-full border-[1.5px] border-line bg-muted">
                  <span
                    className={cn('block h-full origin-left animate-paint border-r-[1.5px] border-line', SCORE_BG[k])}
                    style={{ width: `${Math.round((counts[k - 1] / maxCount) * 100)}%` }}
                  />
                </span>
                <span className="text-right text-[13px] leading-5 font-semibold tabular-nums">{counts[k - 1]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  )
}
