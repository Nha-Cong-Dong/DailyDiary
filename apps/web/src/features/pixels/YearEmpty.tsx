import { ArrowRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { scoreLabel, SCORES, type Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { YearCell } from './yearStats'

const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}

/** Year in Pixels của người dùng mới (thiết kế B9 · màn trống): bảng chưa tô, ô hôm nay nhấp nháy. */
export function YearEmpty({
  year,
  grid,
  today,
  iconSetId,
}: {
  year: number
  grid: YearCell[][]
  today: DateString
  iconSetId: string
}) {
  return (
    <div className="flex animate-rise flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Year in Pixels</h1>
          <p className="text-[15px] leading-6 text-muted-foreground">Năm của bạn bắt đầu từ hôm nay.</p>
        </div>
        <span className="font-heading text-title-3 font-bold tabular-nums">{year}</span>
      </div>
      <section aria-labelledby="year-empty-h" className="rounded-[22px] border-[1.5px] border-line bg-card p-4 shadow-ink sm:p-6">
        <div aria-hidden="true" className="overflow-x-auto p-1">
          <div className="grid min-w-[720px] grid-cols-[36px_repeat(31,minmax(0,1fr))] items-center gap-1">
            {grid.map((row, m) => (
              <Fragment key={m}>
                <span className="text-xs leading-4 font-semibold text-muted-foreground">T{m + 1}</span>
                {row.map((c, d) =>
                  c.kind === 'none' ? (
                    <span key={d} />
                  ) : (
                    <span
                      key={d}
                      className={cn(
                        'aspect-square rounded-[5px]',
                        c.date === today
                          ? 'animate-glow border-2 border-line bg-secondary'
                          : c.kind === 'pre'
                            ? 'border border-dashed border-faint'
                            : 'border border-border',
                      )}
                    />
                  ),
                )}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-dashed border-border pt-[18px]">
          <div className="flex max-w-[460px] flex-col gap-1">
            <h2 id="year-empty-h" className="text-xl leading-7 font-bold">
              Tô ô đầu tiên của năm
            </h2>
            <p className="text-sm leading-[22px] text-muted-foreground">
              Ô đang nhấp nháy là hôm nay. Mỗi ngày chấm điểm sẽ tô màu một ô, cuối năm thành cả một bức tranh.
            </p>
          </div>
          <Link
            to="/today"
            className="group inline-flex h-12 items-center gap-2 rounded-[14px] border-[1.5px] border-line bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[4px_4px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--cta-shadow)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--cta-shadow)]"
          >
            Chấm điểm hôm nay
            <ArrowRight className="size-[18px] transition-transform group-hover:translate-x-[3px]" aria-hidden="true" />
          </Link>
        </div>
        <ul aria-label="Màu theo điểm" className="mt-4 flex flex-wrap items-center gap-2">
          <li aria-hidden="true" className="mr-1 text-[13px] leading-5 text-muted-foreground">
            Màu theo điểm
          </li>
          {SCORES.map((k) => (
            <li
              key={k}
              className="inline-flex h-[30px] animate-paint items-center gap-1.5 rounded-full border-[1.5px] border-border pr-2.5 pl-2 text-xs leading-[18px]"
              style={{ animationDelay: `${(0.3 + k * 0.08).toFixed(2)}s` }}
            >
              <span aria-hidden="true" className={cn('size-3.5 rounded-[4px] border border-line', SCORE_BG[k])} />
              {k} · {scoreLabel(iconSetId, k)}
            </li>
          ))}
          <li className="inline-flex h-[30px] items-center gap-1.5 rounded-full border-[1.5px] border-border pr-2.5 pl-2 text-xs leading-[18px]">
            <span aria-hidden="true" className="size-3.5 rounded-[4px] border border-dashed border-faint" />
            Trước khi dùng Jotly
          </li>
        </ul>
      </section>
    </div>
  )
}
