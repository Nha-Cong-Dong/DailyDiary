import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { Link, useSearchParams } from 'react-router'
import { BottomSheet } from '@/components/diary/BottomSheet'
import { DayPeek } from '@/components/diary/DayPeek'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { scoreLabel, type Score } from '@/lib/catalog'
import { timeIn, todayIn, useNow } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { MonthCalendar } from './MonthCalendar'
import { MonthRhythm, MonthRhythmCompact } from './MonthRhythm'
import {
  addMonths,
  buildMonth,
  cutAfterEntries,
  decimal,
  isMonth,
  monthBounds,
  monthLabel,
  monthOf,
  nearestScore,
  weekdayDate,
  type MonthString,
} from './monthTimeline'
import { TimelineEmpty } from './TimelineEmpty'
import { TimelineList } from './TimelineList'
import { useCalendar } from './useCalendar'
import { useMonth } from './useMonth'
import { useQuickScore } from './useQuickScore'

/** Số trang hiện trước khi bấm "Xem thêm". */
const LIMIT = 7
const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}
const delay = (s: number) => ({ animationDelay: `${s.toFixed(2)}s` }) as CSSProperties
/** Điện thoại (dưới 768 px, thiết kế B10): bấm một ngày mở bảng xem nhanh thay vì cuộn tới trang. */
const isPhone = () => !(window.matchMedia?.('(min-width: 768px)').matches ?? true)
const VIEWS = [
  { value: 'list', label: 'Danh sách' },
  { value: 'cal', label: 'Lịch' },
] as const

/** Dòng thời gian theo tháng (thiết kế B8): thống kê, nhịp tháng, danh sách trang, lịch và từ khóa trong tháng. */
export function Timeline() {
  const { timeZone, iconSetId } = useProfile()
  const today = todayIn(timeZone, useNow())
  const [params, setParams] = useSearchParams()
  // Tháng nằm trên URL (?m=2026-09) để quay lại từ trang một ngày vẫn đúng tháng; không chứa nội dung nhật ký.
  const asked = params.get('m')
  const wanted = isMonth(asked) ? asked : monthOf(today)
  const { data, isPending, isError } = useMonth(wanted, today)
  const calendar = useCalendar(wanted)
  const [selected, setSelected] = useState<number | null>(null)
  const [flash, setFlash] = useState<number | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [view, setView] = useState<'list' | 'cal'>('list')
  const [peek, setPeek] = useState<number | null>(null)
  const [justScored, setJustScored] = useState(false)
  const quick = useQuickScore()
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (isPending || calendar.isPending) return <TimelineSkeleton />
  if (isError || calendar.isError)
    return (
      <Alert variant="destructive">
        <AlertDescription>Không tải được dòng thời gian. Thử tải lại trang.</AlertDescription>
      </Alert>
    )

  const { min, max } = monthBounds(data.joined, today)
  // Khi đang tải tháng mới, giữ nguyên tháng cũ trên màn (placeholderData) thay vì nháy sang tháng rỗng.
  const month = data.month < min ? min : data.month > max ? max : data.month
  const built = buildMonth(month, data.month === month ? data.entries : [], today, data.joined)
  // Chuỗi ngày lấy từ backend: chuỗi hiện tại vắt qua tháng, trang ghi bù không nối chuỗi (F-02).
  const server = calendar.data.month === month ? calendar.data.stats : null
  const t = server ? { ...built, longestStreak: server.longest_streak, currentStreak: server.current_streak } : built
  const current = month === monthOf(today)
  const todayNum = current ? Number(today.slice(8)) : null

  // Người dùng mới (chưa có trang nào, đang ở tháng bắt đầu dùng): màn trống B9.
  if (current && month === min && t.recorded === 0 && todayNum !== null) return <TimelineEmpty data={t} today={todayNum} />

  const { cut, hidden } = cutAfterEntries(t.items, LIMIT)
  const prev = month > min ? addMonths(month, -1) : null
  const next = month < max ? addMonths(month, 1) : null
  const monthNum = Number(month.slice(5))

  function go(m: MonthString) {
    setPeek(null)
    setSelected(null)
    setFlash(null)
    setExpanded(false)
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (m === monthOf(today)) n.delete('m')
      else n.set('m', m)
      return n
    })
  }

  function select(day: number) {
    if (isPhone()) {
      setPeek(day)
      return
    }
    const at = t.anchorOf.get(day)
    if (at === undefined) return
    const anchor = t.items[at].day
    setSelected(day)
    if (at >= cut) setExpanded(true)
    setFlash(day)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setFlash(null), 1600)
    requestAnimationFrame(() => {
      const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
      document.getElementById(`d-${anchor}`)?.scrollIntoView?.({
        behavior: reduce ? 'auto' : 'smooth',
        block: 'start',
      })
    })
  }

  const avgLevel = t.average === null ? null : nearestScore(t.average)
  // Hôm nay chưa ghi (thiết kế B8 · hôm nay chưa viết): không tính là ngày trống, nhắc viết để nối chuỗi.
  const pending = current && t.days.some((d) => d.kind === 'open')
  const stats: { label: string; short: string; value: string; sub: string; phoneSub: string; swatch?: Score }[] = [
    {
      label: 'Ngày đã ghi',
      short: 'Ngày đã ghi',
      value: `${t.recorded}/${t.countable}`,
      sub: pending
        ? `Hôm nay chưa ghi${t.missed ? ` · ${t.missed} ngày trống` : ''}`
        : t.missed
          ? `${t.missed} ngày bỏ trống`
          : 'Không bỏ ngày nào',
      phoneSub: pending ? 'Hôm nay chưa ghi' : t.missed ? `${t.missed} ngày trống` : 'Không bỏ ngày nào',
    },
    {
      label: 'Điểm trung bình',
      short: 'Điểm TB',
      value: t.average === null ? '–' : decimal(t.average),
      sub: avgLevel ? `Gần mức ${scoreLabel(iconSetId, avgLevel)}` : 'Chưa có điểm',
      phoneSub: avgLevel ? `Gần mức ${scoreLabel(iconSetId, avgLevel)}` : 'Chưa có điểm',
      swatch: avgLevel ?? undefined,
    },
    current && t.currentStreak > 0
      ? {
          label: 'Chuỗi hiện tại',
          short: 'Chuỗi hiện tại',
          value: `${t.currentStreak} ngày`,
          sub: pending ? `Viết hôm nay để lên ${t.currentStreak + 1} ngày` : `Dài nhất tháng: ${t.longestStreak} ngày`,
          phoneSub: pending ? `Viết hôm nay để lên ${t.currentStreak + 1}` : `Dài nhất: ${t.longestStreak} ngày`,
        }
      : current
        ? // Chuỗi đang là 0: lấy chuỗi dài nhất làm số chính, không nhấn vào điều chưa làm.
          {
            label: 'Chuỗi dài nhất',
            short: 'Chuỗi dài nhất',
            value: `${t.longestStreak} ngày`,
            sub: pending ? 'Viết hôm nay để bắt đầu chuỗi mới' : 'Chuỗi hiện tại chưa bắt đầu',
            phoneSub: pending ? 'Viết hôm nay để bắt đầu' : 'Chưa có chuỗi mới',
          }
        : {
            label: 'Chuỗi dài nhất',
            short: 'Chuỗi dài nhất',
            value: `${t.longestStreak} ngày`,
            sub: 'Liền mạch trong tháng',
            phoneSub: 'Liền mạch trong tháng',
          },
    {
      label: 'Ảnh',
      short: 'Ảnh',
      value: String(t.photos),
      sub: `trong ${t.photoDays} ngày`,
      phoneSub: 'trong tháng',
    },
    {
      label: 'Sub icon hay dùng',
      short: 'Sub icon hay dùng',
      value: t.topSubIcon?.icon ?? '–',
      sub: t.topSubIcon ? `${t.topSubIcon.count} lần` : 'Chưa dùng',
      phoneSub: '',
    },
  ]
  const peekDay = peek === null ? null : (t.days[peek - 1] ?? null)

  // Canvas vẽ 40px; nâng lên 44px cho đủ vùng chạm. Tắt: viền nét đứt (Button outline).
  const navButton = 'rounded-[12px]'

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-2 md:hidden">
        <h1 aria-live="polite" className="text-title nums">
          {monthLabel(month)}
        </h1>
        <div role="group" aria-label="Chọn tháng" className="flex gap-1.5">
          <Button
            variant="outline"
            size="icon"
            className={navButton}
            aria-label={prev ? `Tháng trước, ${monthLabel(prev)}` : 'Không có tháng trước'}
            disabled={!prev}
            onClick={() => prev && go(prev)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className={navButton}
            aria-label={next ? `Tháng sau, ${monthLabel(next)}` : 'Không có tháng sau'}
            disabled={!next}
            onClick={() => next && go(next)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex animate-rise flex-wrap items-end justify-between gap-4 max-md:hidden">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title">Dòng thời gian</h1>
          <p className="text-body text-ink-soft">Mỗi trang là một ngày, mới nhất ở trên.</p>
        </div>
        <div role="group" aria-label="Chọn tháng" className="inline-flex flex-wrap items-center gap-1.5">
          {!current ? (
            <Button variant="outline" className="mr-1.5 rounded-[12px] px-3.5" onClick={() => go(max)}>
              Về tháng này
            </Button>
          ) : null}
          <Button
            variant="outline"
            size="icon"
            className={navButton}
            aria-label={prev ? `Tháng trước, ${monthLabel(prev)}` : 'Không có tháng trước'}
            disabled={!prev}
            onClick={() => prev && go(prev)}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <span aria-live="polite" className="min-w-[156px] text-center font-heading text-xl leading-7 font-bold nums">
            {monthLabel(month)}
          </span>
          <Button
            variant="outline"
            size="icon"
            className={navButton}
            aria-label={next ? `Tháng sau, ${monthLabel(next)}` : 'Không có tháng sau'}
            disabled={!next}
            onClick={() => next && go(next)}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>

      {/* Điện thoại: lưới 2×2 như Year in Pixels, không cuộn ngang để không thẻ nào bị cắt hay nằm ngoài màn. */}
      <dl key={`p${month}`} className="grid grid-cols-2 gap-2.5 md:hidden">
        {stats.slice(0, 4).map((st) => (
          <div key={st.label} className="flex min-w-0 flex-col rounded-[16px] border-[1.5px] border-stroke bg-card px-3.5 py-2.5">
            <dt className="text-[13px] leading-[18px] text-ink-soft">{st.short}</dt>
            <dd className="font-heading text-[22px] leading-[30px] font-bold whitespace-nowrap nums">{st.value}</dd>
            <dd className="text-[11px] leading-4 text-ink-soft">{st.phoneSub}</dd>
          </div>
        ))}
      </dl>

      <dl key={month} className="grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 max-md:hidden">
        {stats.map((st, i) => (
          <div
            key={st.label}
            // Canvas .j-stat: di chuột nhấc 2px (chỉ chuột), không bóng.
            className="flex animate-pop flex-col gap-0.5 rounded-[18px] border-[1.5px] border-stroke bg-card px-[18px] py-4 transition-transform duration-(--dur-fast) ease-out pointer-fine:hover:-translate-y-0.5 motion-reduce:transform-none"
            style={delay(0.05 + i * 0.06)}
          >
            <dt className="text-[13px] leading-5 text-ink-soft">{st.label}</dt>
            <dd className="inline-flex items-center gap-2 font-heading text-[26px] leading-[34px] font-bold whitespace-nowrap nums">
              {st.swatch ? (
                <span
                  aria-hidden="true"
                  className={cn('size-3.5 shrink-0 rounded-[4px] border-[1.5px] border-stroke', SCORE_BG[st.swatch])}
                />
              ) : null}
              <span>{st.value}</span>
            </dd>
            <dd className="text-[13px] leading-5 text-ink-soft">{st.sub}</dd>
          </div>
        ))}
      </dl>

      <div className="max-md:hidden">
        <MonthRhythm key={`r${month}`} data={t} today={todayNum} selected={selected} onSelect={select} />
      </div>
      <div className="md:hidden">
        <MonthRhythmCompact key={`rc${month}`} data={t} />
      </div>

      <Segmented
        options={VIEWS}
        value={view}
        onChange={setView}
        ariaLabel="Cách xem"
        className="md:hidden"
      />

      <div className="flex flex-wrap items-start gap-8">
        <section
          aria-labelledby="list-h"
          className={cn('flex min-w-0 flex-[1_1_520px] flex-col gap-3 md:gap-4', view === 'cal' && 'max-md:hidden')}
        >
          <div className="flex items-baseline justify-between gap-3 max-md:sr-only">
            <h2 id="list-h" className="scroll-mt-24 font-heading text-xl leading-7 font-semibold">
              Các trang trong tháng
            </h2>
            <span className="text-[13px] leading-5 text-ink-soft nums">
              {t.recorded} trang{t.missed ? ` · ${t.missed} ngày trống` : ''}
            </span>
          </div>
          {t.items.length ? (
            <TimelineList
              items={t.items}
              peekDate={peekDay?.entry ? peekDay.date : null}
              monthNum={monthNum}
              today={todayNum}
              iconSetId={iconSetId}
              timeZone={timeZone}
              flash={flash}
              cut={cut}
              hidden={hidden}
              expanded={expanded}
              onMore={() => setExpanded(true)}
              onLess={() => {
                setExpanded(false)
                setSelected(null)
                document.getElementById('list-h')?.scrollIntoView?.({ block: 'start' })
              }}
              endText={`Đầu ${monthLabel(month).toLowerCase()}`}
              todayDate={current ? today : null}
              justScored={justScored}
              onQuickScore={(score) => {
                quick.save(today, score)
                setJustScored(true)
              }}
              onUndoQuick={() => {
                quick.undo(today)
                setJustScored(false)
              }}
            />
          ) : (
            <p className="rounded-[14px] border-[1.5px] border-dashed border-line-soft p-5 text-body text-ink-soft">
              Tháng này chưa có trang nào.
            </p>
          )}
        </section>

        <aside
          aria-label="Lịch tháng"
          className={cn(
            'flex min-w-[min(100%,300px)] flex-[0_1_360px] flex-col gap-4 min-[900px]:sticky min-[900px]:top-24',
            view === 'list' && 'max-md:hidden',
          )}
        >
          <MonthCalendar
            key={`c${month}`}
            data={t}
            iconSetId={iconSetId}
            today={todayNum}
            selected={selected}
            onSelect={select}
          />
          {t.keywords.length ? (
            <div
              className="flex animate-rise flex-col gap-2 md:gap-2.5 md:rounded-[20px] md:border-[1.5px] md:border-stroke md:bg-card md:p-[18px]"
              style={delay(0.22)}
            >
              <h2 className="text-sm leading-5 font-semibold md:text-body md:font-semibold">Từ khóa trong tháng</h2>
              <ul className="flex flex-wrap gap-1.5">
                {t.keywords.map((k) => (
                  <li key={k.label}>
                    {/* Từ khóa đi qua state của router, không lên URL (Project_Specs F-05). */}
                    <Link
                      to="/search"
                      state={{ q: k.label }}
                      aria-label={`Tìm “${k.label}”, ${k.count} trang`}
                      className="press inline-flex min-h-8 items-center gap-1.5 rounded-full border-[1.5px] border-stroke py-1 pr-2.5 pl-3 text-[13px] leading-5 font-medium select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                    >
                      {k.label}
                      <span className="min-w-[18px] rounded-full bg-secondary px-[5px] text-center text-[11px] leading-4 font-semibold nums">
                        {k.count}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>
      <BottomSheet
        open={peekDay !== null}
        onOpenChange={(o) => !o && setPeek(null)}
        title={peekDay ? weekdayDate(peekDay.date) : ''}
      >
        {peekDay ? (
          <DayPeek
            date={peekDay.date}
            morphDate={peekDay.entry ? peekDay.date : undefined}
            entry={peekDay.entry}
            iconSetId={iconSetId}
            meta={peekDay.entry ? `Viết lúc ${timeIn(timeZone, new Date(peekDay.entry.created_at))}` : undefined}
            state={peekDay.kind === 'open' ? 'today' : peekDay.kind === 'missing' ? 'past' : 'future'}
            onNavigate={() => setPeek(null)}
          />
        ) : null}
      </BottomSheet>
    </div>
  )
}

/** Đang tải: khung xương phẳng (khối sunk, hệ 1.1), giữ đúng bố cục để màn không nhảy khi có dữ liệu. */
function TimelineSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-6">
      <span className="sr-only">Đang mở dòng thời gian…</span>
      <div aria-hidden="true" className="flex flex-col gap-2">
        <span className="skeleton h-8 w-56" />
        <span className="skeleton h-5 w-72 max-md:hidden" />
      </div>
      <div aria-hidden="true" className="grid grid-cols-2 gap-2.5 md:grid-cols-[repeat(auto-fit,minmax(180px,1fr))] md:gap-3.5">
        {Array.from({ length: 5 }, (_, i) => (
          <span key={i} className={cn('skeleton h-[84px] rounded-[16px] md:h-[96px] md:rounded-[18px]', i === 4 && 'max-md:hidden')} />
        ))}
      </div>
      <span aria-hidden="true" className="skeleton h-[100px] rounded-[16px] md:h-[172px] md:rounded-[20px]" />
      <div aria-hidden="true" className="flex flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[1_1_520px] flex-col gap-3.5">
          {Array.from({ length: 3 }, (_, i) => (
            <span key={i} className="skeleton h-[132px] rounded-[18px]" />
          ))}
        </div>
        <span className="skeleton h-[420px] min-w-[min(100%,300px)] flex-[0_1_360px] rounded-[20px] max-md:hidden" />
      </div>
    </div>
  )
}
