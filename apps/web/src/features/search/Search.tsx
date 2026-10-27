import { ArrowLeft, Check, ChevronDown, ArrowRight, Image, Search as SearchIcon, X } from 'lucide-react'
import { useId, useState } from 'react'
import { Link } from 'react-router'
import { BottomSheet } from '@/components/diary/BottomSheet'
import { MoodMark } from '@/components/diary/MoodMark'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel, SCORES, type Score } from '@/lib/catalog'
import { longDateLabel, shortDateLabel, todayIn, useNow } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { highlight, matches, snippet } from '@/lib/text'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { NO_FILTERS, PERIODS, type SearchFilters } from './searchEntries'
import { useDebounced, useHasEntries, useRecentPages, useSearch, useTopKeywords, type SearchHit } from './useSearch'

type RecentPage = { entry_date: string; title: string | null; score: Score; sub_icon: string | null }

const SCORE_SWATCH: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}
const chip = (on: boolean) =>
  cn(
    'inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3 text-[13px] font-semibold focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
    on ? 'border-line bg-secondary shadow-[2px_2px_0_var(--ink-shadow)]' : 'border-border bg-card hover:border-line',
  )

/** Chip bộ lọc trên điện thoại (thiết kế B10 · Tìm kiếm): bấm mở bảng chọn hoặc bật/tắt. */
const phoneChip = (on: boolean) =>
  cn(
    'inline-flex h-[38px] shrink-0 cursor-pointer items-center gap-1 rounded-full border-[1.5px] px-3.5 text-sm whitespace-nowrap focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
    on ? 'border-line bg-secondary font-semibold' : 'border-border bg-card font-medium',
  )

function Marked({ text, q, strong }: { text: string; q: string; strong?: boolean }) {
  return (
    <>
      {highlight(text, q).map((seg, i) =>
        seg.match ? (
          <mark key={i} className={cn('rounded-[4px] bg-highlight px-0.5 text-foreground', strong && 'font-semibold')}>
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
    <div className="flex flex-col gap-6 rounded-[18px] border-[1.5px] border-dashed border-border p-5 md:p-7">
      <div className="flex flex-col gap-1">
        <h2 className="font-heading text-xl leading-7 font-bold">Bạn muốn tìm lại điều gì?</h2>
        <p className="text-sm leading-[22px] text-muted-foreground">Gõ một từ khóa, gõ không dấu cũng được. Hoặc bấm thử:</p>
      </div>
      {top.length ? (
        <section aria-labelledby="idle-top" className="flex flex-col gap-2.5 max-md:hidden">
          <h3 id="idle-top" className="font-sans text-[13px] leading-5 font-semibold text-muted-foreground">
            Từ khóa hay dùng
          </h3>
          <div className="flex flex-wrap gap-2">
            {top.map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => onPick(k)}
                className={cn(chip(false), 'h-10 px-4 text-[15px] font-medium shadow-none')}
              >
                {k}
              </button>
            ))}
          </div>
        </section>
      ) : null}
      {recent.length ? (
        <section aria-labelledby="idle-recent" className="flex flex-col gap-2.5">
          <h3 id="idle-recent" className="font-sans text-[13px] leading-5 font-semibold text-muted-foreground">
            Trang gần đây
          </h3>
          <ul className="flex flex-col gap-2">
            {recent.map((e) => (
              <li key={e.entry_date}>
                <Link
                  to={`/day/${e.entry_date}`}
                  className="press flex items-center gap-3 rounded-[14px] border-[1.5px] border-border bg-card px-3 py-2.5 hover:border-line focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                >
                  <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={28} />
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-[15px] leading-[22px] font-semibold">{e.title}</span>
                    <span className="text-[13px] leading-5 text-muted-foreground">
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

function ResultCard({ e, q, iconSetId, index }: { e: SearchHit; q: string; iconSetId: string; index: number }) {
  const dark = useDarkMode()
  const body = e.content ? snippet(e.content, q) : null
  return (
    <li className="animate-rise" style={{ animationDelay: `${(index * 0.05).toFixed(2)}s` }}>
      <Link
        to={`/day/${e.entry_date}`}
        className="lift grid grid-cols-[6px_40px_minmax(0,1fr)] gap-x-3 overflow-hidden rounded-[16px] border-[1.5px] border-line bg-card shadow-[2px_2px_0_var(--ink-shadow)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring md:grid-cols-[8px_64px_minmax(0,1fr)] md:gap-x-4 md:rounded-[18px] md:shadow-ink-sm"
      >
        <span
          aria-hidden="true"
          className="border-r-[1.5px] border-line bg-secondary"
          style={e.flag_color ? { backgroundColor: flagHex(e.flag_color, dark) } : undefined}
        />
        <span
          role="img"
          aria-label={`Điểm ${e.score}, ${scoreLabel(iconSetId, e.score)}`}
          className="mt-3 flex size-10 items-center justify-center self-start rounded-full border-[1.5px] border-line bg-background md:mt-4 md:size-14"
        >
          <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={28} className="md:hidden" />
          <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={36} className="max-md:hidden" />
        </span>
        <span className="flex min-w-0 flex-col gap-0.5 pt-2.5 pr-3.5 pb-3 md:gap-1 md:py-4 md:pr-5 md:pb-[18px] md:pl-1">
          <span className="text-xs leading-[18px] text-muted-foreground md:hidden">
            {shortDateLabel(e.entry_date).replace(/ (\d+)\/(\d+)$/, `, $1/$2/${e.entry_date.slice(0, 4)}`)} · Điểm {e.score}
          </span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5 text-muted-foreground max-md:hidden">
            <span>
              {longDateLabel(e.entry_date)} · Điểm {e.score} · {scoreLabel(iconSetId, e.score)}
            </span>
            {e.photo_count ? (
              <span className="inline-flex items-center gap-1">
                <Image className="size-3.5" aria-hidden="true" /> {e.photo_count} ảnh
              </span>
            ) : null}
          </span>
          <span className="font-heading text-base leading-6 font-bold md:text-[19px] md:leading-7">
            {e.title ? <Marked text={e.title} q={q} /> : 'Chỉ chấm điểm'}
          </span>
          {body ? (
            <span className="text-sm leading-[22px] text-muted-foreground max-md:line-clamp-2 md:text-[15px] md:leading-6">
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
                      'rounded-full border-[1.5px] px-2.5 py-0.5 text-xs leading-[18px]',
                      hit ? 'border-line bg-highlight font-semibold' : 'border-border font-medium',
                    )}
                  >
                    {k}
                  </span>
                )
              })}
            </span>
          ) : null}
        </span>
      </Link>
    </li>
  )
}

/** Trang tìm theo từ khóa (thiết kế B7): tìm trong tiêu đề, nội dung, từ khóa, kèm bộ lọc. */
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

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-4 md:gap-6">
      <div className="flex animate-rise flex-col gap-1.5 max-md:sr-only">
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Tìm theo từ khóa</h1>
        <p className="text-[15px] leading-6 text-muted-foreground">Tìm trong tiêu đề, nội dung và từ khóa của mọi trang.</p>
      </div>

      <div role="search" className="flex animate-rise flex-col gap-4 md:gap-2.5" style={{ animationDelay: '.05s' }}>
        <div className="flex items-center gap-1">
          <Link
            to="/timeline"
            aria-label="Quay lại Dòng thời gian"
            className="-ml-3 inline-flex size-11 shrink-0 items-center justify-center rounded-[12px] active:bg-pressed md:hidden focus-visible:outline-3 focus-visible:outline-ring"
          >
            <ArrowLeft className="size-[22px]" aria-hidden="true" />
          </Link>
        <div className="relative flex-1">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-[18px] -translate-y-1/2 text-muted-foreground md:left-4 md:size-5" aria-hidden="true" />
          <label htmlFor={id} className="sr-only">
            Từ khóa
          </label>
          <input
            id={id}
            type="search"
            autoComplete="off"
            autoFocus={!initialQuery}
            placeholder="Tìm trong nhật ký"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-11 w-full rounded-[14px] border-[1.5px] border-line bg-card pr-10 pl-[38px] text-base text-foreground outline-none md:h-14 md:rounded-[16px] md:pr-14 md:pl-[50px] md:text-[17px] md:shadow-ink placeholder:text-disabled-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden"
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
          <div
            role="group"
            aria-label="Bộ lọc"
            className="-mx-4 flex gap-2 overflow-x-auto px-4 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden"
          >
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
            <span className="text-xs leading-[18px] font-semibold text-muted-foreground md:text-[13px] md:leading-5 md:font-normal">
              Từ khóa hay dùng
            </span>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none] md:mx-0 md:flex-wrap md:gap-2 md:overflow-visible md:px-0 [&::-webkit-scrollbar]:hidden">
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
          className="flex animate-rise flex-col items-center gap-3 rounded-[22px] border-[1.5px] border-dashed border-line px-6 py-10 text-center"
        >
          <span className="inline-flex size-16 items-center justify-center rounded-[18px] border-[1.5px] border-line bg-card shadow-ink-sm hover:[&_svg]:animate-seek">
            <SearchIcon className="size-7" aria-hidden="true" />
          </span>
          <h2 className="mt-1 text-title-3 font-bold">{query ? `Chưa có trang nào chứa “${query}”` : 'Chưa có trang nào để tìm'}</h2>
          <p className="max-w-[440px] text-[15px] leading-6 text-muted-foreground">
            Khi bạn viết và gắn từ khóa, mọi trang sẽ tìm được ở đây. Ví dụ: tìm “cà phê” để mở lại những ngày có ly cà phê.
          </p>
          <Link
            to="/today"
            className="group mt-2 inline-flex h-12 items-center gap-2 rounded-[14px] cta border-[1.5px] border-line bg-primary px-5 text-[15px] font-semibold text-primary-foreground focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring"
          >
            Viết trang đầu tiên
            <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-[3px]" aria-hidden="true" />
          </Link>
        </div>
      ) : (
        <>
          <div
            role="group"
            aria-label="Bộ lọc"
            className="flex animate-rise flex-wrap items-center gap-x-7 gap-y-3.5 rounded-[18px] border-[1.5px] border-dashed border-border bg-muted px-[18px] py-4 max-md:hidden"
            style={{ animationDelay: '.1s' }}
          >
            <div role="group" aria-label="Lọc theo điểm" className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-[13px] leading-5 font-semibold">Điểm</span>
              {SCORES.map((k) => (
                <button
                  key={k}
                  type="button"
                  aria-label={`Điểm ${k}, ${scoreLabel(iconSetId, k)}`}
                  aria-pressed={filters.scores.includes(k)}
                  onClick={() => toggleScore(k)}
                  className={cn(chip(filters.scores.includes(k)), 'min-w-11 justify-center px-2.5')}
                >
                  <span aria-hidden="true" className={cn('size-3 rounded-[4px] border border-line', SCORE_SWATCH[k])} />
                  {k}
                </button>
              ))}
            </div>
            <div role="radiogroup" aria-label="Khoảng thời gian" className="flex w-full flex-wrap items-center gap-1.5 sm:inline-flex sm:w-auto">
              <span className="mr-1 text-[13px] leading-5 font-semibold">Thời gian</span>
              <span className="grid w-full grid-cols-4 gap-0.5 rounded-[12px] border-[1.5px] border-line bg-card p-[3px] sm:inline-flex sm:w-auto">
                {PERIODS.map((p) => {
                  const on = filters.period === p.id
                  return (
                    <button
                      key={p.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setFilters((f) => ({ ...f, period: p.id }))}
                      className={cn(
                        'h-8 cursor-pointer rounded-[9px] px-1.5 text-[13px] whitespace-nowrap transition-colors focus-visible:outline-3 focus-visible:outline-ring sm:px-3',
                        on ? 'bg-foreground font-semibold text-background' : 'font-medium hover:bg-secondary',
                      )}
                    >
                      {p.label}
                    </button>
                  )
                })}
              </span>
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
            ) : !data ? null : results.length ? (
              <>
                <p className="text-[13px] leading-5 text-muted-foreground md:text-sm md:leading-[22px]">
                  <strong className="font-semibold text-foreground">
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
                    className="h-11 self-center"
                    disabled={search.isFetchingNextPage}
                    onClick={() => void search.fetchNextPage()}
                  >
                    {search.isFetchingNextPage ? 'Đang tải…' : `Xem thêm ${data.total - results.length} kết quả cũ hơn`}
                  </Button>
                ) : null}
              </>
            ) : data.matched > 0 ? (
              <div className="flex flex-col items-center gap-3 rounded-[18px] border-[1.5px] border-dashed border-border p-8 text-center">
                <p className="font-semibold">Không có trang nào khớp với bộ lọc</p>
                <p className="text-sm leading-[22px] text-muted-foreground">
                  Có {data.matched} trang chứa “{query}”, nhưng không trang nào hợp với điểm, thời gian hoặc ảnh bạn chọn.
                </p>
                <Button variant="secondary" size="sm" className="h-10" onClick={() => setFilters(NO_FILTERS)}>
                  Bỏ lọc
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 rounded-[18px] border-[1.5px] border-dashed border-border p-8 text-center">
                <p className="font-semibold">Không tìm thấy “{query}”</p>
                <p className="text-sm leading-[22px] text-muted-foreground">Thử một từ ngắn hơn, hoặc gõ không dấu.</p>
              </div>
            )}
          </div>
        </>
      )}
      <BottomSheet open={sheet === 'score'} onOpenChange={(o) => !o && setSheet(null)} title="Lọc theo điểm">
        <div role="group" aria-label="Chọn điểm" className="flex flex-col overflow-hidden rounded-[16px] border-[1.5px] border-line">
          {SCORES.map((k, i) => {
            const on = filters.scores.includes(k)
            return (
              <button
                key={k}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => toggleScore(k)}
                className={cn(
                  'flex min-h-[52px] cursor-pointer items-center gap-3 px-4 text-left text-[15px] active:bg-pressed focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring',
                  i > 0 && 'border-t-[1.5px] border-dashed border-border',
                )}
              >
                <span aria-hidden="true" className={cn('size-4 rounded-[4px] border border-line', SCORE_SWATCH[k])} />
                <span className="flex-1">
                  Điểm {k}, {scoreLabel(iconSetId, k)}
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    'inline-flex size-[22px] items-center justify-center rounded-[6px] border-[1.5px] border-line',
                    on ? 'bg-foreground text-background' : 'bg-card',
                  )}
                >
                  {on ? <Check className="size-3.5" strokeWidth={3} /> : null}
                </span>
              </button>
            )
          })}
        </div>
        <div className="grid grid-cols-2 gap-2.5">
          <Button variant="outline" className="h-12 rounded-[14px] text-[15px] font-medium" onClick={() => setFilters((f) => ({ ...f, scores: [] }))}>
            Bỏ chọn
          </Button>
          <Button className="h-12 rounded-[14px] text-[15px]" onClick={() => setSheet(null)}>
            Xong
          </Button>
        </div>
      </BottomSheet>
      <BottomSheet open={sheet === 'period'} onOpenChange={(o) => !o && setSheet(null)} title="Khoảng thời gian">
        <div role="radiogroup" aria-label="Khoảng thời gian" className="flex flex-col overflow-hidden rounded-[16px] border-[1.5px] border-line">
          {PERIODS.map((p, i) => {
            const on = filters.period === p.id
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={on}
                onClick={() => setFilters((f) => ({ ...f, period: p.id }))}
                className={cn(
                  'flex min-h-[52px] cursor-pointer items-center justify-between px-4 text-[15px] active:bg-pressed focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring',
                  i > 0 && 'border-t-[1.5px] border-dashed border-border',
                  on ? 'font-semibold' : 'font-normal',
                )}
              >
                {p.label}
                <span aria-hidden="true" className="inline-flex size-[22px] items-center justify-center rounded-full border-[1.5px] border-line">
                  <span className={cn('size-2.5 rounded-full', on && 'bg-foreground')} />
                </span>
              </button>
            )
          })}
        </div>
        <Button className="h-12 rounded-[14px] text-[15px]" onClick={() => setSheet(null)}>
          Xong
        </Button>
      </BottomSheet>
    </div>
  )
}
