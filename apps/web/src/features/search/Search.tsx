import { Image, Search as SearchIcon, X } from 'lucide-react'
import { useDeferredValue, useId, useState } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel, SCORES, type Score } from '@/lib/catalog'
import { longDateLabel, todayIn, useNow } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useProfile } from '@/lib/profile'
import { highlight, matches, snippet } from '@/lib/text'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { NO_FILTERS, PERIODS, type SearchFilters } from './searchEntries'
import { useSearch, useTopKeywords } from './useSearch'

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

function ResultCard({ e, q, iconSetId, index }: { e: DemoEntry; q: string; iconSetId: string; index: number }) {
  const dark = useDarkMode()
  const body = e.content ? snippet(e.content, q) : null
  return (
    <li className="animate-rise" style={{ animationDelay: `${(index * 0.05).toFixed(2)}s` }}>
      <Link
        to={`/day/${e.entry_date}`}
        className="lift grid grid-cols-[8px_64px_minmax(0,1fr)] gap-x-4 overflow-hidden rounded-[18px] border-[1.5px] border-line bg-card shadow-ink-sm focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring"
      >
        <span
          aria-hidden="true"
          className="border-r-[1.5px] border-line bg-secondary"
          style={e.flag_color ? { backgroundColor: flagHex(e.flag_color, dark) } : undefined}
        />
        <span className="mt-4 flex size-14 items-center justify-center self-start rounded-full border-[1.5px] border-line bg-background">
          <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={36} />
        </span>
        <span className="flex min-w-0 flex-col gap-1 py-4 pr-5 pb-[18px] pl-1">
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] leading-5 text-muted-foreground">
            <span>
              {longDateLabel(e.entry_date)} · Điểm {e.score} · {scoreLabel(iconSetId, e.score)}
            </span>
            {e.photos.length ? (
              <span className="inline-flex items-center gap-1">
                <Image className="size-3.5" aria-hidden="true" /> {e.photos.length} ảnh
              </span>
            ) : null}
          </span>
          <span className="font-heading text-[19px] leading-7 font-bold">
            {e.title ? <Marked text={e.title} q={q} /> : 'Chỉ chấm điểm'}
          </span>
          {body ? (
            <span className="text-[15px] leading-6 text-muted-foreground">
              <Marked text={body} q={q} strong />
            </span>
          ) : null}
          {e.keywords.length ? (
            <span className="mt-1.5 flex flex-wrap gap-1.5">
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
  const deferredQ = useDeferredValue(q)
  const query = deferredQ.trim()
  const { data, isError } = useSearch(deferredQ, filters, today)
  const { data: top = [] } = useTopKeywords()
  const filtersOn = filters.scores.length > 0 || filters.period !== 'all' || filters.withPhotos
  const results = data?.results ?? []
  const hidden = (data?.matched ?? 0) - results.length

  const toggleScore = (k: Score) =>
    setFilters((f) => ({ ...f, scores: f.scores.includes(k) ? f.scores.filter((x) => x !== k) : [...f.scores, k].sort() }))

  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col gap-6">
      <div className="flex animate-rise flex-col gap-1.5">
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Tìm theo từ khóa</h1>
        <p className="text-[15px] leading-6 text-muted-foreground">Tìm trong tiêu đề, nội dung và từ khóa của mọi trang.</p>
      </div>

      <div role="search" className="flex animate-rise flex-col gap-2.5" style={{ animationDelay: '.05s' }}>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <label htmlFor={id} className="sr-only">
            Từ khóa
          </label>
          <input
            id={id}
            type="search"
            autoComplete="off"
            autoFocus={!initialQuery}
            placeholder="Nhập từ khóa, ví dụ: mưa"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-14 w-full rounded-[16px] border-[1.5px] border-line bg-card pr-14 pl-[50px] text-[17px] text-foreground shadow-ink outline-none placeholder:text-disabled-foreground focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-search-cancel-button]:hidden"
          />
          {q ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Xóa từ khóa"
              onClick={() => setQ('')}
              className="absolute top-1/2 right-2.5 size-10 -translate-y-1/2 no-underline"
            >
              <X aria-hidden="true" />
            </Button>
          ) : null}
        </div>
        {top.length ? (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[13px] leading-5 text-muted-foreground">Từ khóa hay dùng</span>
            {top.map((k) => {
              const on = q.trim().toLowerCase() === k.toLowerCase()
              return (
                <button
                  key={k}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setQ(k)}
                  className={cn(chip(on), 'h-8 font-medium shadow-none')}
                >
                  {k}
                </button>
              )
            })}
          </div>
        ) : null}
      </div>

      <div
        role="group"
        aria-label="Bộ lọc"
        className="flex animate-rise flex-wrap items-center gap-x-7 gap-y-3.5 rounded-[18px] border-[1.5px] border-dashed border-border bg-muted px-[18px] py-4"
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
          <div className="flex flex-col items-center gap-1.5 rounded-[18px] border-[1.5px] border-dashed border-border p-8 text-center">
            <p className="font-semibold">Bạn muốn tìm lại điều gì?</p>
            <p className="text-sm leading-[22px] text-muted-foreground">
              Gõ một từ khóa, hoặc chọn từ khóa hay dùng ở trên. Gõ không dấu cũng tìm được.
            </p>
          </div>
        ) : !data ? null : results.length ? (
          <>
            <p className="text-sm leading-[22px] text-muted-foreground">
              <strong className="font-semibold text-foreground">
                {results.length} kết quả cho “{query}”
              </strong>
              {hidden > 0 && filtersOn ? ` · ${hidden} trang khác bị ẩn bởi bộ lọc` : ''}
            </p>
            <ul className="flex flex-col gap-3.5">
              {results.map((e, i) => (
                <ResultCard key={e.entry_date} e={e} q={query} iconSetId={iconSetId} index={i} />
              ))}
            </ul>
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
    </div>
  )
}
