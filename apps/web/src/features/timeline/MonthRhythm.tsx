import type { CSSProperties } from 'react'
import type { Score } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { decimal, type MonthTimeline } from './monthTimeline'

const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}

type MonthRhythmProps = {
  data: MonthTimeline
  today: number | null
  selected: number | null
  onSelect: (day: number) => void
}

/** "Nhịp tháng": mỗi cột là một ngày, cao theo điểm; nét đứt là điểm trung bình. Bấm cột để cuộn tới trang đó. */
export function MonthRhythm({ data, today, selected, onSelect }: MonthRhythmProps) {
  const monthNum = Number(data.month.slice(5))
  const cols = {
    gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))`,
  } as CSSProperties
  return (
    <section
      aria-labelledby="rhythm-h"
      className="flex animate-rise flex-col gap-3.5 rounded-[20px] border-[1.5px] border-line bg-card px-6 pt-5 pb-4 shadow-ink"
      style={{ animationDelay: '.1s' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="rhythm-h" className="font-sans text-[15px] leading-[22px] font-semibold">
          Nhịp tháng · điểm từng ngày
        </h2>
        {data.average !== null ? (
          <span className="inline-flex items-center gap-2 text-[13px] leading-5 text-muted-foreground">
            <span aria-hidden="true" className="w-[22px] border-t-[1.5px] border-dashed border-muted-foreground" />
            Trung bình {decimal(data.average)}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
        <div
          aria-hidden="true"
          className="flex h-[100px] flex-col justify-between text-right text-[11px] leading-3 text-muted-foreground tabular-nums"
        >
          <span className="-translate-y-1.5">5</span>
          <span>3</span>
          <span className="translate-y-1.5">1</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="relative h-[100px] border-b-[1.5px] border-line">
            {data.average !== null ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 border-t-[1.5px] border-dashed border-muted-foreground transition-[bottom] duration-500"
                style={{ bottom: `${data.average * 20}%` }}
              />
            ) : null}
            <div className="absolute inset-0 grid items-end gap-0.5" style={cols}>
              {data.days.map((d) => {
                const label = `${d.day}/${monthNum}`
                if (d.kind === 'future' || d.kind === 'pre' || d.kind === 'open') {
                  return (
                    <span key={d.day} aria-hidden="true" className="flex h-full items-end justify-center">
                      <span className="h-0.5 w-full max-w-5 rounded-full bg-border" />
                    </span>
                  )
                }
                const tip = d.entry
                  ? `${label} · Điểm ${d.entry.score} · ${d.entry.title ?? 'Chỉ chấm điểm'}`
                  : `${label} · Không ghi`
                return (
                  <button
                    key={d.day}
                    type="button"
                    aria-label={tip}
                    onClick={() => onSelect(d.day)}
                    className="group relative flex h-full cursor-pointer items-end justify-center rounded-[4px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <span
                      className="relative w-full max-w-5"
                      style={{
                        height: d.entry ? `${d.entry.score * 20}%` : '8px',
                      }}
                    >
                      <span
                        className={cn(
                          'absolute inset-x-0 bottom-0 h-full origin-bottom animate-grow rounded-t-[4px] border-[1.5px] border-b-0 transition-[height,filter] duration-200 group-hover:h-[calc(100%+8px)] group-hover:saturate-125 group-focus-visible:h-[calc(100%+8px)]',
                          d.entry ? cn('border-line', SCORE_BG[d.entry.score]) : 'border-dashed border-muted-foreground',
                          selected === d.day && 'shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--line)]',
                        )}
                        style={{
                          animationDelay: `${(0.15 + d.day * 0.018).toFixed(3)}s`,
                        }}
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-[calc(100%+16px)] left-1/2 z-10 -translate-x-1/2 translate-y-1 rounded-[10px] bg-foreground px-2.5 py-1.5 text-xs leading-[18px] font-medium whitespace-nowrap text-background opacity-0 transition-[opacity,translate] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                      >
                        {tip}
                      </span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
          <div aria-hidden="true" className="grid gap-0.5" style={cols}>
            {data.days.map((d) => {
              const isToday = d.day === today
              return (
                <span
                  key={d.day}
                  className={cn(
                    'text-center text-[11px] leading-[14px] tabular-nums',
                    isToday ? 'font-bold text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {d.day === 1 || d.day % 5 === 0 || isToday ? d.day : ''}
                </span>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
