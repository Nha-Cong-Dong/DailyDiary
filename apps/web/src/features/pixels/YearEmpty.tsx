import { ArrowRight } from 'lucide-react'
import { Fragment } from 'react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'
import { scoreLabel, SCORES, type Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { cn } from '@/lib/utils'
import type { Month, YearCell } from './yearStats'
import { useT } from '@/lib/i18n'

const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}

/** Year in Pixels của người dùng mới (thiết kế B9 · màn trống): bảng chưa tô, ô hôm nay màu đào nhấp nháy ba lần. */
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
  const t = useT()
  return (
    <div className="flex animate-rise flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <h1 className="text-title">{t('pixels:title')}</h1>
          <p className="text-body text-ink-soft">{t('pixels:empty.subtitle')}</p>
        </div>
        <span className="nums text-heading font-bold">{year}</span>
      </div>
      <section aria-labelledby="year-empty-h" className="rounded-lg border-[1.5px] border-stroke bg-card p-4 shadow-md sm:p-6">
        <div aria-hidden="true" className="overflow-x-auto p-1">
          <div className="grid min-w-[720px] grid-cols-[36px_repeat(31,minmax(0,1fr))] items-center gap-1">
            {grid.map((row, m) => (
              <Fragment key={m}>
                <span className="text-label text-ink-soft">{t(`pixels:grid.monthHeader.${(m + 1) as Month}`)}</span>
                {row.map((c, d) =>
                  c.kind === 'none' ? (
                    <span key={d} />
                  ) : (
                    <span
                      key={d}
                      className={cn(
                        'aspect-square rounded-[5px]',
                        c.date === today
                          ? 'animate-pulse-3 border-2 border-stroke bg-peach'
                          : c.kind === 'pre'
                            ? 'border border-dashed border-ink-faint'
                            : 'border border-line-soft',
                      )}
                    />
                  ),
                )}
              </Fragment>
            ))}
          </div>
        </div>
        <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t-[1.5px] border-dashed border-line-soft pt-[18px]">
          <div className="flex max-w-[460px] flex-col gap-1">
            <h2 id="year-empty-h" className="text-xl leading-7 font-bold">
              {t('pixels:empty.heading')}
            </h2>
            <p className="text-sm leading-[22px] text-ink-soft">
              {t('pixels:empty.body')}
            </p>
          </div>
          <Button asChild variant="cta" size="lg" className="group">
            <Link to="/today">
              {t('pixels:empty.cta')}
              <ArrowRight className="size-[18px] transition-transform duration-(--dur-fast) ease-out pointer-fine:group-hover:translate-x-[3px]" aria-hidden="true" />
            </Link>
          </Button>
        </div>
        <ul aria-label={t('pixels:legend.scoreAria')} className="mt-4 flex flex-wrap items-center gap-2">
          <li aria-hidden="true" className="mr-1 text-label font-normal text-ink-soft">
            {t('pixels:legend.scoreTitle')}
          </li>
          {SCORES.map((k) => (
            <li
              key={k}
              className="inline-flex h-[30px] animate-paint items-center gap-1.5 rounded-full border-[1.5px] border-line-soft pr-2.5 pl-2 text-label font-normal"
              style={{ animationDelay: `${(0.3 + k * 0.08).toFixed(2)}s` }}
            >
              <span aria-hidden="true" className={cn('size-3.5 rounded-[4px] border border-stroke', SCORE_BG[k])} />
              {t('pixels:scoreRow', { score: k, label: scoreLabel(iconSetId, k) })}
            </li>
          ))}
          <li className="inline-flex h-[30px] items-center gap-1.5 rounded-full border-[1.5px] border-line-soft pr-2.5 pl-2 text-label font-normal">
            <span aria-hidden="true" className="size-3.5 rounded-[4px] border border-dashed border-ink-faint" />
            {t('pixels:legend.beforeJotly')}
          </li>
        </ul>
      </section>
    </div>
  )
}
