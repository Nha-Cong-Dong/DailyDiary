import type { CSSProperties } from 'react'
import type { Score } from '@/lib/catalog'
import { cn } from '@/lib/utils'
import { decimal, type MonthTimeline } from './monthTimeline'
import { useT } from '@/lib/i18n'

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
  const t = useT()
  const monthNum = Number(data.month.slice(5))
  const futureFrom = data.days.findIndex((d) => d.kind === 'future')
  const cols = {
    gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))`,
  } as CSSProperties
  return (
    <section
      aria-labelledby="rhythm-h"
      className="flex animate-rise flex-col gap-3.5 rounded-[20px] border-[1.5px] border-stroke bg-card px-6 pt-5 pb-4 shadow-md"
      style={{ animationDelay: '.1s' }}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
        <h2 id="rhythm-h" className="text-body font-semibold">
          {t('timeline:rhythm.heading')}
        </h2>
        {data.average !== null ? (
          <span className="inline-flex items-center gap-2 text-[13px] leading-5 text-ink-soft nums">
            <span aria-hidden="true" className="w-[22px] border-t-[1.5px] border-dashed border-ink-soft" />
            {t('timeline:rhythm.average', { value: decimal(data.average) })}
          </span>
        ) : null}
      </div>
      <div className="grid grid-cols-[18px_minmax(0,1fr)] gap-2">
        <div
          aria-hidden="true"
          className="flex h-[100px] flex-col justify-between text-right text-[11px] leading-3 text-ink-soft nums"
        >
          <span className="-translate-y-1.5">5</span>
          <span>3</span>
          <span className="translate-y-1.5">1</span>
        </div>
        <div className="flex min-w-0 flex-col gap-1.5">
          <div className="relative h-[100px] border-b-[1.5px] border-stroke">
            {data.average !== null ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 border-t-[1.5px] border-dashed border-ink-soft transition-[bottom] duration-500 ease-out"
                style={{ bottom: `${data.average * 20}%` }}
              />
            ) : null}
            <div className="absolute inset-0 grid items-end gap-0.5" style={cols}>
              {data.days.map((d) => {
                const label = `${d.day}/${monthNum}`
                // Ngày chưa tới nằm trong một vùng tô nhạt chung (dưới), không vẽ vạch từng ngày.
                if (d.kind === 'future') return null
                if (d.kind === 'pre') {
                  return (
                    <span key={d.day} aria-hidden="true" className="flex h-full items-end justify-center">
                      <span className="h-0.5 w-full max-w-5 rounded-full bg-line-soft" />
                    </span>
                  )
                }
                const tip = d.entry
                  ? t('timeline:rhythm.tipScoreTitle', {
                      label,
                      score: d.entry.score,
                      title: d.entry.title ?? t('timeline:rhythm.tipScoreOnly'),
                    })
                  : d.kind === 'open'
                    ? t('timeline:rhythm.tipOpen', { label })
                    : t('timeline:rhythm.tipNone', { label })
                return (
                  <button
                    key={d.day}
                    type="button"
                    aria-label={tip}
                    onClick={() => onSelect(d.day)}
                    className="group relative flex h-full cursor-pointer items-end justify-center rounded-[4px] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus"
                  >
                    <span
                      className="relative w-full max-w-5"
                      style={{
                        height: d.entry ? `${d.entry.score * 20}%` : '8px',
                      }}
                    >
                      <span
                        className={cn(
                          'absolute inset-x-0 bottom-0 h-full origin-bottom rounded-t-[4px] border-[1.5px] border-b-0 transition-[height,filter] duration-200 ease-out pointer-fine:group-hover:h-[calc(100%+5px)] pointer-fine:group-hover:saturate-125 group-focus-visible:h-[calc(100%+5px)]',
                          // Hôm nay chưa ghi: cột thấp nền đào tĩnh (mốc "bây giờ"), không mọc, không nhấp nháy.
                          d.entry
                            ? cn('animate-grow border-stroke', SCORE_BG[d.entry.score])
                            : d.kind === 'open'
                              ? 'border-dashed border-stroke bg-peach'
                              : 'animate-grow border-dashed border-ink-soft',
                          selected === d.day && 'shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--stroke)]',
                        )}
                        style={d.kind === 'open' ? undefined : { animationDelay: `${(0.15 + d.day * 0.018).toFixed(3)}s` }}
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute bottom-[calc(100%+16px)] left-1/2 z-10 -translate-x-1/2 translate-y-1 rounded-[10px] bg-ink px-2.5 py-1.5 text-[13px] leading-[18px] font-medium whitespace-nowrap text-paper opacity-0 transition-[opacity,translate] duration-150 ease-out pointer-fine:group-hover:translate-y-0 pointer-fine:group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                      >
                        {tip}
                      </span>
                    </span>
                  </button>
                )
              })}
              {futureFrom >= 0 ? <FutureBand from={futureFrom} total={data.days.length} /> : null}
            </div>
          </div>
          <div aria-hidden="true" className="grid gap-0.5" style={cols}>
            {data.days.map((d) => {
              const isToday = d.day === today
              return (
                <span
                  key={d.day}
                  className={cn(
                    'text-center text-[11px] leading-[14px] nums',
                    isToday ? 'font-bold text-ink' : 'text-ink-soft',
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

/** Vùng các ngày chưa tới của tháng đang xem: một khối tô nhạt chung, để nửa sau tháng không trông như ngày bỏ trống. */
function FutureBand({ from, total, compact = false }: { from: number; total: number; compact?: boolean }) {
  const t = useT()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex items-center justify-center self-stretch rounded-t-[6px] bg-secondary text-[11px] leading-4 font-medium text-ink-soft',
        compact && 'rounded-t-[4px]',
      )}
      style={{ gridColumn: `${from + 1} / -1`, gridRow: 1 }}
    >
      {/* Chữ chỉ hiện khi vùng đủ rộng (từ 4 ngày), tránh tràn sang cột bên cạnh. */}
      {total - from >= 4 ? t('timeline:rhythm.notYet') : null}
    </span>
  )
}

/** Nhịp tháng gọn cho điện thoại (thiết kế B10): chỉ các cột điểm, không trục, không bấm. */
export function MonthRhythmCompact({ data }: { data: MonthTimeline }) {
  const t = useT()
  const monthNum = Number(data.month.slice(5))
  const futureFrom = data.days.findIndex((d) => d.kind === 'future')
  return (
    <section
      aria-label={t('timeline:rhythm.headingShort')}
      className="flex flex-col gap-2 rounded-[16px] border-[1.5px] border-stroke bg-card px-3.5 pt-3 pb-2.5"
    >
      <div className="flex justify-between text-[13px] leading-[18px]">
        <span className="font-semibold">{t('timeline:rhythm.headingShort')}</span>
        {data.average !== null ? (
          <span className="text-ink-soft nums">{t('timeline:rhythm.average', { value: decimal(data.average) })}</span>
        ) : null}
      </div>
      <div
        className="grid h-14 items-end gap-0.5 border-b-[1.5px] border-stroke"
        style={{ gridTemplateColumns: `repeat(${data.days.length}, minmax(0, 1fr))` }}
      >
        {data.days.map((d) => {
          if (d.kind === 'future') return null
          const label = `${d.day}/${monthNum}`
          const tip = d.entry
            ? d.entry.title
              ? t('timeline:rhythm.tipScoreTitle', { label, score: d.entry.score, title: d.entry.title })
              : t('timeline:rhythm.tipScoreNoTitle', { label, score: d.entry.score })
            : d.kind === 'missing'
              ? t('timeline:rhythm.tipNone', { label })
              : d.kind === 'open'
                ? t('timeline:rhythm.tipOpen', { label })
                : label
          return (
            <span
              key={d.day}
              title={tip}
              className={cn(
                'origin-bottom rounded-t-[3px] border border-b-0',
                d.kind !== 'open' && 'animate-grow',
                d.entry
                  ? cn('border-stroke', SCORE_BG[d.entry.score])
                  : d.kind === 'missing'
                    ? 'border-dashed border-ink-soft'
                    : d.kind === 'open'
                      ? 'border-dashed border-stroke bg-peach'
                      : 'border-line-soft bg-line-soft',
              )}
              style={{
                height: d.entry ? `${d.entry.score * 20}%` : d.kind === 'missing' || d.kind === 'open' ? '6px' : '2px',
                animationDelay: `${(0.1 + d.day * 0.015).toFixed(3)}s`,
              }}
            />
          )
        })}
        {futureFrom >= 0 ? <FutureBand from={futureFrom} total={data.days.length} compact /> : null}
      </div>
    </section>
  )
}
