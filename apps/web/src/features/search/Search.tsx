import { ArrowLeft, Check, ChevronDown, ArrowRight, Image, Search as SearchIcon, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { BottomSheet } from '@/components/diary/BottomSheet'
import { MoodMark } from '@/components/diary/MoodMark'
import { NotebookPage } from '@/components/diary/NotebookPage'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { flagHex, scoreLabel, SCORES, type Score } from '@/lib/catalog'
import { longDateLabel, shortDateLabel, todayIn, useNow } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { highlight, matches, snippet } from '@/lib/text'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { NO_FILTERS, PERIODS, type Period, type SearchFilters } from './searchEntries'
import { useDebounced, useHasEntries, useRecentPages, useSearch, useTopKeywords, type SearchHit } from './useSearch'

type RecentPage = { entry_date: string; title: string | null; score: Score; sub_icon: string | null }

const SCORE_SWATCH: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}
const PERIOD_OPTIONS = PERIODS.map((p) => ({ value: p.id, label: p.label }))

/** Chip bộ lọc trên máy tính (B7): chọn thì nền secondary, viền mực, bóng 2px. */
const chip = (on: boolean) =>
  cn(
    'press inline-flex h-9 cursor-pointer touch-manipulation items-center gap-1.5 rounded-full border-[1.5px] px-3 text-label select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
    on ? 'border-stroke bg-secondary shadow-sm' : 'border-line-soft bg-card pointer-fine:hover:border-stroke',
  )

/** Chip bộ lọc trên điện thoại (thiết kế B10 · Tìm kiếm): bấm mở bảng chọn hoặc bật/tắt. */
const phoneChip = (on: boolean) =>
  cn(
    'press inline-flex h-[38px] shrink-0 cursor-pointer touch-manipulation items-center gap-1 rounded-full border-[1.5px] px-3.5 text-sm whitespace-nowrap select-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
    on ? 'border-stroke bg-secondary font-semibold' : 'border-line-soft bg-card font-medium',
  )

/** Hàng trong bảng chọn (checkbox/radio) trên điện thoại. */
const sheetRow = (first: boolean) =>
  cn(
    'row-press flex min-h-[52px] cursor-pointer touch-manipulation items-center gap-3 px-4 text-left text-body select-none focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-focus',
    !first && 'border-t-[1.5px] border-dashed border-line-soft',
  )

/** Tô sáng chỗ khớp: nền đào (sáng) / highlight (tối), bo 4px, chữ mực. */
function Marked({ text, q, strong }: { text: string; q: string; strong?: boolean }) {
  return (
    <>
      {highlight(text, q).map((seg, i) =>
        seg.match ? (
          <mark key={i} className={cn('rounded-[4px] bg-peach px-0.5 text-ink dark:bg-highlight', strong && 'font-semibold')}>
            {seg.text}
          </mark>
        ) : (
          <span key={i}>{seg.text}</span>
        ),
      )}
    </>
  )
}

/** Khi chưa gõ: từ khóa hay dùng cỡ lớn để bấm thử, và ba trang gần nhất (đề xuất từ báo cáo rà thiết kế). */
function IdleSuggestions({
  top,
  recent,
  iconSetId,
  onPick,
}: {
  top: string[]
  recent: RecentPage[]
  iconSetId: string
  onPick: (k: string) => void
}) {
  return (
    <div className="flex flex-col gap-6 rounded-[18px] border-[1.5px] border-dashed border-line-soft p-5 md:p-7">
      <div className="flex flex-col gap-1">
        <h2 className="text-xl leading-7 font-bold">Bạn muốn tìm lại điều gì?</h2>
        <p className="text-sm leading-[22px] text-ink-soft">Gõ một từ khóa, gõ không dấu cũng được. Hoặc bấm thử:</p>
      </div>
      {top.length ? (
        <section aria-labelledby="idle-top" className="flex flex-col gap-2.5 max-md:hidden">
          <h3 id="idle-top" className="text-label text-ink-soft [font-variation-settings:normal]">
            Từ khóa hay dùng
          </h3>
          <div className="flex flex-wrap gap-2">
            {top.map((k) => (
              <button key={k} type="button" onClick={() => onPick(k)} className={cn(chip(false), 'h-10 px-4 text-body font-medium')}>
                {k}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {recent.length ? (
        <section aria-labelledby="idle-recent" className="flex flex-col gap-2.5">
          <h3 id="idle-recent" className="text-label text-ink-soft [font-variation-settings:normal]">
            Trang gần đây
          </h3>
          <ul className="flex flex-col gap-2">
            {recent.map((e) => (
              <li key={e.entry_date}>
                <Link
                  to={`/day/${e.entry_date}`}
                  className="press flex items-center gap-3 rounded-[14px] border-[1.5px] border-line-soft bg-card px-3 py-2.5 transition-[transform,border-color] duration-(--dur-fast) ease-out pointer-fine:hover:border-stroke focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                >
                  <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={28} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body leading-[22px] font-semibold">{e.title || 'Chỉ chấm điểm'}</span>
                    <span className="text-label font-normal text-ink-soft">
                      {longDateLabel(e.entry_date)} · Điểm {e.score}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  )
}

/**
 * Một kết quả (B7/B10 · Tìm kiếm): trang sổ có lỗ đục, lề hồng, dòng kẻ vở, ruy băng cờ — cùng dáng EntryCard nhưng
 * tiêu đề và đoạn trích tô sáng chỗ khớp; khung trang sổ dùng chung NotebookPage.
 */
function ResultCard({ e, q, iconSetId, index }: { e: SearchHit; q: string; iconSetId: string; index: number }) {
  const dark = useDarkMode()
  const body = e.content ? snippet(e.content, q) : null
  const label = scoreLabel(iconSetId, e.score)
  return (
    <li className="animate-rise" style={{ animationDelay: `${(index * 0.05).toFixed(2)}s` }}>
      <NotebookPage size="result" flag={e.flag_color ? flagHex(e.flag_color, dark) : null} asChild>
        <Link
          to={`/day/${e.entry_date}`}
          className="lift-sm grid grid-cols-[40px_minmax(0,1fr)] gap-x-3 py-3 pr-3.5 pb-3.5 pl-[46px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus md:grid-cols-[56px_minmax(0,1fr)] md:gap-x-4 md:py-4 md:pr-5 md:pb-[18px] md:pl-[60px]"
        >
        <span
          role="img"
          aria-label={`Điểm ${e.score}, ${label}`}
          className="flex size-10 items-center justify-center self-start rounded-full border-[1.5px] border-stroke bg-paper md:size-14"
        >
          <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={28} className="md:hidden" />
          <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={36} className="max-md:hidden" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 md:gap-1">
          <span className="text-label font-normal text-ink-soft md:hidden">
            {shortDateLabel(e.entry_date).replace(/ (\d+)\/(\d+)$/, `, $1/$2/${e.entry_date.slice(0, 4)}`)} · Điểm {e.score}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-label font-normal text-ink-soft max-md:hidden">
            <span>
              {longDateLabel(e.entry_date)} · Điểm {e.score} · {label}
            </span>
            {e.photo_count ? (
              <span className="inline-flex items-center gap-1">
                <Image className="size-3.5" aria-hidden="true" /> {e.photo_count} ảnh
              </span>
            ) : null}
          </span>
          <span className="text-body font-bold [font-variation-settings:'FLAR'_60] md:text-[19px] md:leading-7">
            {e.title ? <Marked text={e.title} q={q} /> : 'Chỉ chấm điểm'}
          </span>
          {body ? (
            <span className="ruled bg-[position:0_-3px] text-sm leading-6 max-md:line-clamp-2 md:text-body md:leading-7">
              <Marked text={body} q={q} strong />
            </span>
          ) : null}
          {e.keywords.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5 max-md:hidden">
              {e.keywords.map((k) => {
                const hit = matches(k, q)
                return (
                  <span
                    key={k}
                    className={cn(
                      'relative rounded-full border-[1.5px] py-0.5 pr-2.5 pl-6 text-label',
                      hit ? 'border-stroke bg-peach text-on-accent dark:bg-highlight dark:text-ink' : 'border-line-soft font-medium',
                    )}
                  >
                    {/* Lỗ xỏ dây của nhãn từ khóa (như KeywordChip). */}
                    <span aria-hidden="true" className="absolute top-1/2 left-[9px] -mt-1 size-2 rounded-full border-[1.5px] border-stroke bg-paper" />
                    {k}
                  </span>
                )
              })}
            </span>
          ) : null}
        </span>
        </Link>
      </NotebookPage>
    </li>
  )
}

/** Khung xương khi đang tìm: ba thẻ sunk phẳng cùng cỡ thẻ kết quả. */
function ResultsSkeleton() {
  return (
    <div role="status" className="flex flex-col gap-2.5 md:gap-3.5">
      <span className="sr-only">Đang tìm…</span>
      <span aria-hidden="true" className="skeleton h-5 w-44" />
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden="true" className="skeleton h-[104px] rounded-[16px] md:h-[150px] md:rounded-[18px]" />
      ))}
    </div>
  )
}

/** Trang tìm theo từ khóa (thiết kế B7 máy tính, B10 điện thoại; hệ 1.1): tìm trong tiêu đề, nội dung, từ khóa, kèm bộ lọc. */
export function Search({ initialQuery = '' }: { initialQuery?: string }) {
  const { timeZone, iconSetId } = useProfile()
  const today = todayIn(timeZone, useNow())
  const id = useId()
  const [q, setQ] = useState(initialQuery)
  const [filters, setFilters] = useState<SearchFilters>(NO_FILTERS)
  // Chỉ gửi khi ngừng gõ 300 ms; bấm từ khóa gợi ý thì cũng đi qua đây.
  const settledQ = useDebounced(q)
  const query = settledQ.trim()
  const search = useSearch(settledQ, filters)
  const { data, isError } = search
  const { data: top = [] } = useTopKeywords()
  // Người dùng mới chưa có trang nào: bỏ bộ lọc, hiện màn trống (thiết kế B9).
  const { data: hasEntries = true } = useHasEntries(today)
  const { data: recent = [] } = useRecentPages(today)
  const filtersOn = filters.scores.length > 0 || filters.period !== 'all' || filters.withPhotos
  const results = data?.results ?? []
  const hidden = (data?.matched ?? 0) - (data?.total ?? 0)

  const [sheet, setSheet] = useState<'score' | 'period' | null>(null)
  const periodLabel = PERIODS.find((p) => p.id === filters.period)?.label ?? ''

  const toggleScore = (k: Score) =>
    setFilters((f) => ({ ...f, scores: f.scores.includes(k) ? f.scores.filter((x) => x !== k) : [...f.scores, k].sort() }))
  const setPeriod = (period: Period) => setFilters((f) => ({ ...f, period }))

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 md:gap-6">
      <div className="flex animate-rise flex-col gap-1.5 max-md:sr-only">
        <h1 className="text-title">Tìm theo từ khóa</h1>
        <p className="text-body text-ink-soft">Tìm trong tiêu đề, nội dung và từ khóa của mọi trang.</p>
      </div>

      <div role="search" className="flex animate-rise flex-col gap-4 md:gap-2.5" style={{ animationDelay: '.05s' }}>
        <div className="flex items-center gap-1">
          <Link
            to="/timeline"
            aria-label="Quay lại Dòng thời gian"
            className="back-nudge row-press -ml-3 inline-flex size-11 shrink-0 touch-manipulation items-center justify-center rounded-[12px] md:hidden focus-visible:outline-3 focus-visible:outline-focus"
          >
            <ArrowLeft className="size-[22px]" aria-hidden="true" />
          </Link>
          <div className="relative flex-1">
            <SearchIcon
              className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-ink-soft md:left-4 md:size-5"
              aria-hidden="true"
            />
            <label htmlFor={id} className="sr-only">
              Từ khóa
            </label>
            <input
              id={id}
              type="search"
              autoComplete="off"
              enterKeyHint="search"
              autoFocus={!initialQuery}
              placeholder="Tìm trong nhật ký"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-11 w-full rounded-[14px] border-[1.5px] border-stroke bg-card pr-10 pl-[38px] text-base text-ink outline-none placeholder:text-ink-faint focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus md:h-14 md:rounded-[16px] md:pr-14 md:pl-[50px] md:text-lg md:shadow-md [&::-webkit-search-cancel-button]:hidden"
            />
            {q ? (
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Xóa từ khóa"
                onClick={() => setQ('')}
                className="absolute top-1/2 right-0.5 size-10 -translate-y-1/2 no-underline md:right-2.5"
              >
                <X aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        </div>
        {hasEntries ? (
          <div role="group" aria-label="Bộ lọc" className="-mx-4 scroll-quiet flex gap-2 overflow-x-auto px-4 md:hidden">
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSheet('score')}
              className={cn(phoneChip(filters.scores.length > 0), 'pr-2.5')}
            >
              {filters.scores.length ? `Điểm ${filters.scores.join(', ')}` : 'Điểm'}
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-haspopup="dialog"
              onClick={() => setSheet('period')}
              className={cn(phoneChip(filters.period !== 'all'), 'pr-2.5')}
            >
              {periodLabel}
              <ChevronDown className="size-4" aria-hidden="true" />
            </button>
            <button
              type="button"
              aria-pressed={filters.withPhotos}
              onClick={() => setFilters((f) => ({ ...f, withPhotos: !f.withPhotos }))}
              className={phoneChip(filters.withPhotos)}
            >
              <Image className="size-[15px]" aria-hidden="true" />
              Có ảnh
            </button>
          </div>
        ) : null}

        {top.length ? (
          // Máy tính, khi chưa gõ: từ khóa hay dùng hiện to trong khối gợi ý bên dưới, nên ẩn hàng nhỏ này.
          <div className={cn('flex flex-col gap-2 md:flex-row md:flex-wrap md:items-center', !query && 'md:hidden')}>
            <span className="text-label text-ink-soft md:font-normal">Từ khóa hay dùng</span>
            <div className="-mx-4 scroll-quiet flex gap-1.5 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0">
              {top.map((k) => {
                const on = q.trim().toLowerCase() === k.toLowerCase()
                return (
                  <button
                    key={k}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setQ(k)}
                    className={cn(chip(on), 'h-[34px] shrink-0 font-medium whitespace-nowrap shadow-none md:h-8')}
                  >
                    {k}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>

      {!hasEntries ? (
        <div
          aria-live="polite"
          className="flex animate-rise flex-col items-center gap-3 rounded-lg border-[1.5px] border-dashed border-stroke px-6 py-10 text-center"
        >
          <span className="inline-flex size-16 items-center justify-center rounded-[18px] border-[1.5px] border-stroke bg-card shadow-sm">
            <SearchIcon className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-1 text-heading font-bold">{query ? `Chưa có trang nào chứa “${query}”` : 'Chưa có trang nào để tìm'}</h2>
          <p className="max-w-[440px] text-body text-ink-soft">
            Khi bạn viết và gắn từ khóa, mọi trang sẽ tìm được ở đây. Ví dụ: tìm “cà phê” để mở lại những ngày có ly cà phê.
          </p>
          <Button asChild variant="cta" size="lg" className="group mt-2">
            <Link to="/today">
              Viết trang đầu tiên
              <ArrowRight
                className="size-[18px] transition-transform duration-(--dur-fast) ease-out pointer-fine:group-hover:translate-x-[3px]"
                aria-hidden="true"
              />
            </Link>
          </Button>
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Bộ lọc"
            className="flex animate-rise flex-wrap items-center gap-x-7 gap-y-3.5 rounded-[18px] border-[1.5px] border-dashed border-line-soft bg-sunk px-[18px] py-4 max-md:hidden"
            style={{ animationDelay: '.1s' }}
          >
            <div role="group" aria-label="Lọc theo điểm" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-label">Điểm</span>
              {SCORES.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={`Điểm ${k}, ${scoreLabel(iconSetId, k)}`}
                  aria-pressed={filters.scores.includes(k)}
                  onClick={() => toggleScore(k)}
                  className={cn(chip(filters.scores.includes(k)), 'min-w-11 justify-center px-2.5')}
                >
                  <span aria-hidden="true" className={cn('size-3 rounded-[4px] border border-stroke', SCORE_SWATCH[k])} />
                  {k}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span id={`${id}-period`} className="mr-1 text-label">
                Thời gian
              </span>
              <Segmented options={PERIOD_OPTIONS} value={filters.period} onChange={setPeriod} ariaLabelledby={`${id}-period`} />
            </div>
            <button
              type="button"
              aria-pressed={filters.withPhotos}
              onClick={() => setFilters((f) => ({ ...f, withPhotos: !f.withPhotos }))}
              className={cn(chip(filters.withPhotos), 'pl-2.5')}
            >
              <Image className="size-4" aria-hidden="true" />
              Có ảnh
            </button>
          </div>

          <div aria-live="polite" className="flex flex-col gap-4">
            {isError ? (
              <Alert variant="destructive">
                <AlertDescription>Không tìm được lúc này. Thử lại sau ít phút.</AlertDescription>
              </Alert>
            ) : !query ? (
              <IdleSuggestions top={top} recent={recent} iconSetId={iconSetId} onPick={setQ} />
            ) : !data ? (
              <ResultsSkeleton />
            ) : results.length ? (
              <>
                <p className="text-label font-normal text-ink-soft md:text-sm md:leading-[22px]">
                  <strong className="font-semibold text-ink">
                    {data.total} kết quả cho “{query}”
                  </strong>
                  {hidden > 0 && filtersOn ? ` · ${hidden} trang khác bị ẩn bởi bộ lọc` : ''}
                </p>
                <ul className="flex flex-col gap-2.5 md:gap-3.5">
                  {results.map((e, i) => (
                    <ResultCard key={e.entry_date} e={e} q={query} iconSetId={iconSetId} index={i % 10} />
                  ))}
                </ul>
                {search.hasNextPage ? (
                  <Button
                    variant="outline"
                    className="self-center"
                    disabled={search.isFetchingNextPage}
                    onClick={() => void search.fetchNextPage()}
                  >
                    {search.isFetchingNextPage ? 'Đang tải…' : `Xem thêm ${data.total - results.length} kết quả cũ hơn`}
                  </Button>
                ) : null}
              </>
            ) : data.matched > 0 ? (
              <div className="flex flex-col items-center gap-2.5 rounded-[16px] border-[1.5px] border-dashed border-line-soft px-4 py-6 text-center md:gap-3 md:rounded-[18px] md:p-8">
                <p className="text-body font-semibold">Không có trang nào khớp với bộ lọc</p>
                <p className="text-label font-normal text-ink-soft md:text-sm md:leading-[22px]">
                  Có {data.matched} trang chứa “{query}”, nhưng không trang nào hợp với điểm, thời gian hoặc ảnh bạn chọn.
                </p>
                <Button variant="secondary" size="sm" className="h-10" onClick={() => setFilters(NO_FILTERS)}>
                  Bỏ lọc
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 rounded-[16px] border-[1.5px] border-dashed border-line-soft px-4 py-6 text-center md:gap-1.5 md:rounded-[18px] md:p-8">
                <p className="text-body font-semibold">Không tìm thấy “{query}”</p>
                <p className="text-label font-normal text-ink-soft md:text-sm md:leading-[22px]">Thử một từ ngắn hơn, hoặc gõ không dấu.</p>
              </div>
            )}
          </div>
        </>
      )}
      <BottomSheet open={sheet === 'score'} onOpenChange={(o) => !o && setSheet(null)} title="Lọc theo điểm">
        <div role="group" aria-label="Chọn điểm" className="flex flex-col overflow-hidden rounded-[16px] border-[1.5px] border-stroke">
          {SCORES.map((k, i) => {
            const on = filters.scores.includes(k)
            return (
              <button key={k} type="button" role="checkbox" aria-checked={on} onClick={() => toggleScore(k)} className={sheetRow(i === 0)}>
                <span aria-hidden="true" className={cn('size-4 rounded-[4px] border border-stroke', SCORE_SWATCH[k])} />
                <span className="flex-1">
                  Điểm {k}, {scoreLabel(iconSetId, k)}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-[22px] items-center justify-center rounded-[6px] border-[1.5px] border-stroke',
                    on ? 'bg-ink text-paper' : 'bg-card',
                  )}
                >
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" size="lg" className="rounded-[14px]" onClick={() => setFilters((f) => ({ ...f, scores: [] }))}>
            Bỏ chọn
          </Button>
          <Button size="lg" className="rounded-[14px]" onClick={() => setSheet(null)}>
            Xong
          </Button>
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'period'} onOpenChange={(o) => !o && setSheet(null)} title="Khoảng thời gian">
        <div role="radiogroup" aria-label="Khoảng thời gian" className="flex flex-col overflow-hidden rounded-[16px] border-[1.5px] border-stroke">
          {PERIODS.map((p, i) => {
            const on = filters.period === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setPeriod(p.id)}
                className={cn(sheetRow(i === 0), 'justify-between', on ? 'font-semibold' : 'font-normal')}
              >
                {p.label}
                <span aria-hidden="true" className="inline-flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-stroke">
                  <span className={cn('size-2.5 rounded-full', on && 'bg-ink')} />
                </span>
              </button>
            )
          })}
        </div>
        <Button size="lg" className="rounded-[14px]" onClick={() => setSheet(null)}>
          Xong
        </Button>
      </BottomSheet>
    </div>
  )
}
