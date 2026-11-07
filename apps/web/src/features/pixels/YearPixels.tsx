import { ArrowRight, ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'
import { useState, type CSSProperties } from 'react'
import { Link } from 'react-router'
import { BottomSheet } from '@/components/diary/BottomSheet'
import { DayPeek } from '@/components/diary/DayPeek'
import { DayMorph } from '@/components/diary/DayMorph'
import { NotebookPage } from '@/components/diary/NotebookPage'
import { MoodMark } from '@/components/diary/MoodMark'
import { PixelLegend } from '@/components/diary/PixelCell'
import type { PixelFilter } from '@/components/diary/pixelFilter'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel, todayIn, useNow, type DateString } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { ColorByToggle, FlagLegend } from './ColorByFlag'
import { useColorBy } from './useColorBy'
import { useDayPreview, usePixels } from './usePixels'
import { YearEmpty } from './YearEmpty'
import { YearGrid } from './YearGrid'
import { decimal, yearStats } from './yearStats'

const panel = 'rounded-lg border-[1.5px] border-stroke bg-card p-6 shadow-md'
/** Tiêu đề nhỏ của thẻ ("Ngày đã chọn", "Phân bố điểm"): chữ giao diện, không loe chân như tiêu đề trang. */
const panelHeading = 'text-sm leading-[22px] font-semibold text-ink-soft [font-variation-settings:normal]'
const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}
const FILTER_NAME = (k: PixelFilter) => (typeof k === 'number' ? `điểm ${k}` : k === 'missing' ? 'chưa ghi' : 'chưa tới')
const delay = (s: number) => ({ animationDelay: `${s.toFixed(2)}s` }) as CSSProperties
/** Điện thoại (dưới 768 px, thiết kế B10): chạm một ô mở bảng xem nhanh thay vì khung "Ngày đã chọn". */
const isPhone = () => !(window.matchMedia?.('(min-width: 768px)').matches ?? true)

/** Khung xương khi đang tải: khối sunk phẳng theo bố cục màn (hệ 1.1, không dải sáng chạy ngang). */
function YearSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Đang tải Year in Pixels…</span>
      <div aria-hidden="true" className="flex items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <span className="skeleton h-8 w-48" />
          <span className="skeleton h-5 w-72 max-md:hidden" />
        </div>
        <span className="skeleton h-11 w-40" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <span key={i} className="skeleton h-[76px] rounded-[16px] md:h-[118px] md:rounded-[18px]" />
        ))}
      </div>
      <span aria-hidden="true" className="skeleton h-[520px] rounded-lg md:h-[440px]" />
    </div>
  )
}

/** Bảng trượt xem nhanh một ngày trên điện thoại. */
function DaySheet({ date, iconSetId, today, onClose }: { date: DateString | null; iconSetId: string; today: DateString; onClose: () => void }) {
  const { data: entry } = useDayPreview(date)
  return (
    <BottomSheet open={date !== null} onOpenChange={(o) => !o && onClose()} title={date ? longDateLabel(date) : ''}>
      {date ? (
        <DayPeek
          date={date}
          morphDate={date}
          entry={entry ?? null}
          iconSetId={iconSetId}
          state={date > today ? 'future' : date === today ? 'today' : 'past'}
          onNavigate={onClose}
        />
      ) : null}
    </BottomSheet>
  )
}

/**
 * Trang sổ của ngày đã chọn (B7-Year): lỗ đục, lề hồng, ruy băng cờ, vòng main icon 72px, tiêu đề `h3`, trích có dòng kẻ
 * vở. Khung là NotebookPage dùng chung; bên trong theo B7-Year (vòng icon 72px, tiêu đề h3).
 */
function DayPage({
  date,
  morph = true,
  iconSetId,
  score,
  subIcon,
  flagColor,
  title,
  excerpt,
}: {
  date: DateString
  /** Tắt chuyển cảnh nối khi bảng xem nhanh (điện thoại) đang giữ ngày này. */
  morph?: boolean
  iconSetId: string
  score: Score
  subIcon: string | null
  flagColor: string | null
  title: string | null
  excerpt: string | null
}) {
  const dark = useDarkMode()
  const label = scoreLabel(iconSetId, score)
  return (
    <NotebookPage
      as="article"
      size="card"
      flag={flagColor ? flagHex(flagColor, dark) : null}
      className="flex items-start gap-[18px] py-[18px] pr-5 pl-[60px] shadow-sm"
    >
      <DayMorph date={date} disabled={!morph}>
        <span
          role="img"
          aria-label={`Điểm ${score}, ${label}`}
          className="flex size-[72px] shrink-0 items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper"
        >
          <MoodMark iconSetId={iconSetId} score={score} subIcon={subIcon} size={52} />
        </span>
      </DayMorph>
      <div className="flex min-w-0 flex-col gap-1">
        <p className="text-label font-normal text-ink-soft">
          {longDateLabel(date)} · Điểm {score} · {label}
        </p>
        <h3 className={cn('text-xl leading-7 font-bold', !title && 'text-ink-soft')}>{title || 'Chỉ chấm điểm'}</h3>
        {excerpt ? <p className="ruled line-clamp-3 bg-[position:0_-3px] text-body leading-7">{excerpt}</p> : null}
      </div>
    </NotebookPage>
  )
}

function SelectedDay({
  date,
  iconSetId,
  today,
  morph = true,
}: {
  date: DateString | null
  iconSetId: string
  today: DateString
  morph?: boolean
}) {
  const { data: entry, isPending } = useDayPreview(date)
  return (
    <section aria-labelledby="sel-h" className={cn(panel, 'flex animate-rise flex-col gap-4')} style={delay(0.2)}>
      <h2 id="sel-h" className={panelHeading}>
        Ngày đã chọn
      </h2>
      <div aria-live="polite" className="flex flex-col gap-4">
        {!date ? (
          <p className="rounded-md border-[1.5px] border-dashed border-line-soft p-5 text-body text-ink-soft">
            Chọn một ô trên bảng để xem lại ngày đó.
          </p>
        ) : isPending ? (
          <span aria-hidden="true" className="skeleton h-[132px] rounded-[18px]" />
        ) : entry ? (
          <>
            <DayPage
              date={date}
              morph={morph}
              iconSetId={iconSetId}
              score={entry.score}
              subIcon={entry.sub_icon}
              flagColor={entry.flag_color}
              title={entry.title}
              excerpt={entry.content}
            />
            <Button asChild variant="secondary" size="sm" className="h-10 self-start pr-3 pl-4">
              <Link to={`/day/${date}`}>
                Mở trang ngày <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </Button>
          </>
        ) : (
          <div className="flex flex-col gap-1 rounded-md border-[1.5px] border-dashed border-line-soft bg-sunk p-5">
            <p className="text-label font-normal text-ink-soft">{longDateLabel(date)}</p>
            <p className="text-body font-medium">{date > today ? 'Ngày này chưa tới.' : 'Ngày này chưa được ghi.'}</p>
            {date <= today ? (
              <Button asChild variant="outline" size="sm" className="mt-2 self-start text-label">
                <Link to={date === today ? '/today' : `/day/${date}/backfill`}>
                  {date === today ? null : <RotateCcw className="size-3.5" strokeWidth={2.4} aria-hidden="true" />}
                  {date === today ? 'Viết trang hôm nay' : 'Ghi bù ngày này'}
                </Link>
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </section>
  )
}

/** Trang Year in Pixels cả năm (thiết kế B7 máy tính, B10 điện thoại; hệ 1.1). */
export function YearPixels() {
  const { timeZone, iconSetId } = useProfile()
  const now = useNow()
  const today = todayIn(timeZone, now)
  const [year, setYear] = useState(() => Number(today.slice(0, 4)))
  const [selected, setSelected] = useState<DateString | null>(today)
  const [filter, setFilter] = useState<PixelFilter | null>(null)
  const [highlight, setHighlight] = useState<PixelFilter | null>(null)
  const [sheet, setSheet] = useState<DateString | null>(null)
  const [colorBy, setColorBy] = useColorBy()
  const byFlag = colorBy === 'flag'
  const { data, isPending, isError } = usePixels(year, today)

  if (isPending) return <YearSkeleton />
  if (isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>Không tải được dữ liệu cả năm. Thử tải lại trang.</AlertDescription>
      </Alert>
    )

  // Chuỗi ngày lấy từ backend (ghi bù không nối chuỗi); các số khác tính từ lưới.
  const s = { ...yearStats(year, data.days, today, data.joined), longestStreak: data.longestStreak, currentStreak: data.currentStreak }
  // Người dùng mới, chưa chấm điểm ngày nào: màn trống B9.
  if (data.years.length === 0 && year === Number(today.slice(0, 4)))
    return <YearEmpty year={year} grid={s.grid} today={today} iconSetId={iconSetId} />
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
    setSheet(null)
  }

  function changeColorBy(next: typeof colorBy) {
    // Bộ lọc theo điểm chỉ có ở chế độ tô theo điểm.
    setFilter(null)
    setHighlight(null)
    setColorBy(next)
  }

  function pick(date: DateString) {
    setSelected(date)
    if (isPhone()) setSheet(date)
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
  const filterText = filter === null ? '' : `Đang xem ${FILTER_NAME(filter)} · ${filterCount} ngày`

  return (
    <div className="flex flex-col gap-6">
      <div className="flex animate-rise flex-wrap items-center justify-between gap-2 md:items-end md:gap-4">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title">Year in Pixels</h1>
          <p className="text-body text-ink-soft max-md:hidden">
            {joinedThisYear
              ? `Bạn bắt đầu dùng Jotly từ ${Number(data.joined.slice(8))}/${Number(data.joined.slice(5, 7))}/${year}.`
              : 'Mỗi ô là một ngày, mỗi màu là một mức điểm.'}
          </p>
        </div>
        <div role="group" aria-label="Chọn năm" className="inline-flex items-center gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className="rounded-[12px]"
            aria-label={prevYear ? `Năm trước, ${prevYear}` : 'Không có năm trước'}
            disabled={prevYear === null}
            onClick={() => prevYear && changeYear(prevYear)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="nums min-w-[52px] text-center text-lg leading-6 font-bold [font-variation-settings:'FLAR'_60] md:min-w-[72px] md:text-[22px] md:leading-[30px]">
            {year}
          </span>
          <Button
            variant="outline"
            size="icon"
            className="rounded-[12px]"
            aria-label={nextYear ? `Năm sau, ${nextYear}` : 'Không có năm sau'}
            disabled={nextYear === null}
            onClick={() => nextYear && changeYear(nextYear)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2.5 md:gap-4 lg:grid-cols-4">
        {stats.map((st, i) => (
          <div
            key={st.label}
            className="flex animate-rise flex-col rounded-[16px] border-[1.5px] border-stroke bg-card px-3 py-2.5 shadow-sm md:gap-1 md:rounded-[18px] md:px-5 md:py-[18px]"
            style={delay(0.04 + i * 0.05)}
          >
            <dt className="text-label font-normal text-ink-soft">{st.label}</dt>
            <dd className="nums inline-flex items-center gap-1.5 text-xl leading-7 font-bold whitespace-nowrap [font-variation-settings:'FLAR'_60] md:gap-2.5 md:text-[22px] md:leading-9 lg:text-[28px]">
              {st.swatch ? <span aria-hidden="true" className={cn('size-3.5 shrink-0 rounded-[4px] border border-stroke', SCORE_BG[st.swatch])} /> : null}
              {st.value}
            </dd>
            <dd className="text-label font-normal text-ink-soft">{st.sub}</dd>
          </div>
        ))}
      </dl>

      <ColorByToggle value={colorBy} onChange={changeColorBy} className="-mb-2 self-start md:-mb-4" />

      {/* Điện thoại: chú thích lọc là hàng chip cuộn ngang trên bảng. */}
      <div className={cn('flex flex-col gap-2 md:hidden', byFlag && 'hidden')}>
        <PixelLegend
          className="-mx-4 scroll-quiet flex-nowrap overflow-x-auto pl-4 after:block after:w-3 after:shrink-0 after:content-[''] [&_button]:h-9 [&_button]:touch-manipulation [&_button]:border-line-soft [&_button]:whitespace-nowrap [&_button]:select-none [&_button[aria-pressed=true]]:border-stroke"
          active={filter}
          onToggle={(k) => setFilter((f) => (f === k ? null : k))}
          hide={pastYear ? ['future'] : []}
        />
        {filter !== null ? (
          <p role="status" className="flex animate-fade items-center justify-between gap-2 text-label font-normal text-ink-soft">
            {filterText}
            <button type="button" onClick={() => setFilter(null)} className="link-underline min-h-11 cursor-pointer px-1 font-semibold text-ink">
              Bỏ lọc
            </button>
          </p>
        ) : null}
      </div>

      <section
        aria-label="Bảng điểm cả năm"
        className={cn(panel, 'flex animate-rise flex-col gap-[18px] rounded-[18px] p-3 shadow-sm md:rounded-lg md:p-6 md:shadow-md')}
        style={delay(0.1)}
      >
        <YearGrid
          grid={s.grid}
          monthAverages={s.monthAverages}
          today={today}
          selected={selected}
          onSelect={pick}
          focus={byFlag ? null : (highlight ?? filter)}
          colorBy={colorBy}
          flags={data.flags}
        />
        {byFlag ? <FlagLegend flags={data.flags} written={s.recorded} className="border-t-[1.5px] border-dashed border-line-soft pt-3.5" /> : null}
        <div className={cn('flex flex-wrap items-center justify-between gap-3 border-t-[1.5px] border-dashed border-line-soft pt-3.5 max-md:hidden', byFlag && 'hidden')}>
          <PixelLegend
            active={filter}
            onToggle={(k) => setFilter((f) => (f === k ? null : k))}
            onHighlight={setHighlight}
            hide={pastYear ? ['future'] : []}
          />
          {filter !== null ? (
            <div className="inline-flex items-center gap-2.5 text-label font-normal text-ink-soft">
              <span aria-live="polite">{filterText}</span>
              <Button variant="outline" size="sm" onClick={() => setFilter(null)}>
                Bỏ lọc
              </Button>
            </div>
          ) : null}
        </div>
      </section>

      <p className="-mt-2 text-label font-normal text-ink-soft md:hidden">
        Mỗi cột là một tháng, mỗi hàng là một ngày. Chạm một ô để xem nhanh.
      </p>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(360px,100%),1fr))] items-start gap-6 max-md:hidden">
        <SelectedDay date={selected} iconSetId={iconSetId} today={today} morph={sheet !== selected} />
        <section aria-labelledby="dist-h" className={cn(panel, 'flex animate-rise flex-col gap-4')} style={delay(0.26)}>
          <h2 id="dist-h" className={panelHeading}>
            Phân bố điểm · {year}
          </h2>
          <ul className="flex flex-col gap-3">
            {([5, 4, 3, 2, 1] as Score[]).map((k) => (
              <li key={k} className="grid grid-cols-[96px_minmax(0,1fr)_36px] items-center gap-3">
                <span className="text-label font-medium">
                  {k} · {scoreLabel(iconSetId, k)}
                </span>
                <span aria-hidden="true" className="h-3.5 overflow-hidden rounded-full border-[1.5px] border-stroke bg-sunk">
                  <span
                    className={cn('block h-full origin-left animate-paint border-r-[1.5px] border-stroke', SCORE_BG[k])}
                    style={{ width: `${Math.round((counts[k - 1] / maxCount) * 100)}%` }}
                  />
                </span>
                <span className="nums text-right text-label">{counts[k - 1]}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <DaySheet date={sheet} iconSetId={iconSetId} today={today} onClose={() => setSheet(null)} />
    </div>
  )
}
