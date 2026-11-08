import { Fragment, useRef, type KeyboardEvent } from 'react'
import { pixelFilterOf, type PixelFilter } from '@/components/diary/pixelFilter'
import { flagHex, flagName, type Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { ColorBy } from './useColorBy'
import { t, useT } from '@/lib/i18n'
import { decimal, type Month, type YearCell } from './yearStats'

const SCORE_BG: Record<Score, string> = {
  1: 'bg-score-1 border-score-1',
  2: 'bg-score-2 border-score-2',
  3: 'bg-score-3 border-score-3',
  4: 'bg-score-4 border-score-4',
  5: 'bg-score-5 border-score-5',
}
const SCORE_SWATCH: Record<Score, string> = {
  1: 'bg-score-1',
  2: 'bg-score-2',
  3: 'bg-score-3',
  4: 'bg-score-4',
  5: 'bg-score-5',
}

function describe(c: YearCell, today: DateString, flag?: string): string {
  const month = c.month as Month
  const label =
    t('pixels:grid.cell.date', { day: c.day, month, monthShort: t(`common:date.monthShort.${month}`) }) +
    (c.date === today ? t('pixels:grid.cell.today') : '')
  if (c.kind === 'score' && flag !== undefined)
    return `${label}${t('pixels:grid.cell.scored', { score: c.score })}${flag ? t('pixels:grid.cell.flagged', { flag: flagName(flag) }) : t('pixels:grid.cell.noFlag')}`
  if (c.kind === 'score') return `${label}${t('pixels:grid.cell.scored', { score: c.score })}`
  if (c.kind === 'missing') return label + t('pixels:grid.cell.missing')
  if (c.kind === 'future') return label + t('pixels:grid.cell.future')
  return label + t('pixels:grid.cell.pre')
}

const focusable = (c: YearCell | undefined) => !!c && (c.kind === 'score' || c.kind === 'missing')

/** Vành ngoài ô: vành đào cho hôm nay đã ghi (giữ màu điểm bên trong), vành mực cho ô đang chọn. */
function ring(todayScored: boolean, selected: boolean): string | false {
  if (todayScored && selected) return 'shadow-[0_0_0_2px_var(--peach),0_0_0_3.5px_var(--stroke)]'
  if (todayScored) return 'shadow-[0_0_0_2px_var(--peach)]'
  if (selected) return 'shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--stroke)]'
  return false
}

type YearGridProps = {
  grid: YearCell[][]
  monthAverages: (number | null)[]
  today: DateString
  selected: DateString | null
  onSelect: (date: DateString) => void
  /** Nhóm đang lọc/làm nổi ở chú thích; các ô khác mờ đi. */
  focus: PixelFilter | null
  /** Tô theo điểm (mặc định) hay theo màu cờ; `flags`: ngày → mã hex. */
  colorBy?: ColorBy
  flags?: Record<DateString, string>
}

/**
 * Bảng điểm cả năm (thiết kế B7/B10, hệ 1.1). Máy tính: 12 hàng tháng × 31 cột ngày + cột trung bình.
 * Điện thoại: xoay thành 12 cột tháng × 31 hàng ngày + hàng trung bình, để không phải cuộn ngang.
 * Bàn phím: chỉ một ô nhận Tab (roving tabindex); phím mũi tên đi theo đúng hướng đang nhìn thấy.
 */
export function YearGrid({ grid, monthAverages, today, selected, onSelect, focus, colorBy = 'score', flags = {} }: YearGridProps) {
  const t = useT()
  const ref = useRef<HTMLDivElement>(null)
  const dark = useDarkMode()
  const byFlag = colorBy === 'flag'
  const cells = grid.flat()
  const tabStop =
    (selected && cells.find((c) => c.date === selected && focusable(c))?.date) ??
    [...cells].reverse().find(focusable)?.date ??
    null

  function move(e: KeyboardEvent, m: number, d: number) {
    // Hướng phím theo bố cục đang hiện: từ 768 px hàng là tháng, dưới 768 px cột là tháng.
    const wide = window.matchMedia?.('(min-width: 768px)').matches ?? true
    const step: Record<string, [number, number]> = wide
      ? { ArrowLeft: [0, -1], ArrowRight: [0, 1], ArrowUp: [-1, 0], ArrowDown: [1, 0] }
      : { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }
    const delta = step[e.key]
    if (!delta) return
    e.preventDefault()
    let [nm, nd] = [m + delta[0], d + delta[1]]
    while (nm >= 0 && nm < 12 && nd >= 0 && nd < 31) {
      const c = grid[nm][nd]
      if (focusable(c)) {
        onSelect(c.date)
        ref.current?.querySelector<HTMLButtonElement>(`[data-date="${c.date}"]`)?.focus()
        return
      }
      nm += delta[0]
      nd += delta[1]
    }
  }

  return (
    <div
      ref={ref}
      role="group"
      aria-label={t('pixels:grid.aria')}
      className="grid grid-flow-col grid-cols-[18px_repeat(12,minmax(0,1fr))] grid-rows-[auto_repeat(31,auto)_auto] gap-[3px] md:grid-flow-row md:grid-cols-[36px_repeat(31,minmax(0,1fr))_52px] md:grid-rows-none md:gap-1"
    >
      {/* Nhóm đầu: số ngày (máy tính là hàng trên cùng, điện thoại là cột bên trái). */}
      <span aria-hidden="true" />
      {Array.from({ length: 31 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'nums text-right text-[11px] leading-3 text-ink-soft md:text-center md:leading-[14px]',
            i !== 0 && (i + 1) % 5 !== 0 && 'max-md:invisible',
          )}
        >
          {i + 1}
        </span>
      ))}
      <span
        aria-hidden="true"
        className="text-[11px] leading-3 font-semibold text-ink-soft max-md:mt-2 max-md:border-t-[1.5px] max-md:border-dashed max-md:border-line-soft max-md:pt-2 md:text-center md:leading-[14px]"
      >
        {t('pixels:grid.avgHeader')}
      </span>

      {grid.map((row, m) => {
        const avg = monthAverages[m]
        return (
          <Fragment key={m}>
            <span className="mb-0.5 text-center text-[11px] leading-[14px] font-semibold text-ink-soft md:mb-0 md:text-left md:text-label">
              <span className="max-md:hidden">{t(`pixels:grid.monthHeader.${(m + 1) as Month}`)}</span>
              <span className="md:hidden">{m + 1}</span>
            </span>
            {row.map((c, d) => {
              if (c.kind === 'none') return <span key={d} aria-hidden="true" />
              const dimmed = focus !== null && c.kind !== 'pre' && pixelFilterOf(c.score, c.kind === 'future' ? 'future' : 'past') !== focus
              const isToday = c.date === today
              const flag = byFlag && c.kind === 'score' ? (flags[c.date] ?? '') : undefined
              // Tô theo cờ: ô có cờ mang màu cờ; có trang mà không cờ thì chỉ có viền đậm.
              const style = flag ? { backgroundColor: flagHex(flag, dark), borderColor: 'var(--stroke)' } : undefined
              const look = cn(
                'h-[13px] w-full rounded-[3px] border transition-[transform,filter] duration-(--dur-fast) ease-out md:aspect-square md:h-auto md:rounded-[5px]',
                c.kind === 'score' && !byFlag && SCORE_BG[c.score!],
                c.kind === 'score' && byFlag && !flag && 'border-[1.5px] border-stroke bg-card',
                c.kind === 'missing' && !isToday && 'border-line-soft bg-sunk',
                c.kind === 'future' && 'border-line-soft',
                c.kind === 'pre' && 'border-dashed border-line-soft',
                // Ô hôm nay là vùng peach duy nhất của màn: chưa ghi thì tô đào; đã ghi thì giữ màu điểm, thêm vành đào.
                isToday && 'border-2 border-stroke',
                isToday && c.kind === 'missing' && 'bg-peach',
                dimmed && '[filter:grayscale(1)_opacity(.25)]',
              )
              if (!focusable(c)) return <span key={d} title={describe(c, today)} className={cn(look, ring(isToday && c.kind === 'score', false))} />
              const label = describe(c, today, flag)
              const isSel = c.date === selected
              return (
                <button
                  key={d}
                  type="button"
                  data-date={c.date}
                  tabIndex={c.date === tabStop ? 0 : -1}
                  title={label}
                  aria-label={label}
                  style={style}
                  aria-pressed={isSel}
                  onClick={() => onSelect(c.date)}
                  onKeyDown={(e) => move(e, m, d)}
                  className={cn(
                    look,
                    'cursor-pointer p-0 touch-manipulation select-none active:[transform:scale(.9)] md:pointer-fine:hover:[transform:scale(1.3)] md:active:[transform:scale(1.1)] motion-reduce:transform-none! focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus',
                    ring(isToday && c.kind === 'score', isSel),
                  )}
                />
              )
            })}
            <span
              title={avg === null
                  ? t('pixels:grid.monthNoScore', { month: m + 1, monthLong: t(`common:date.monthLong.${(m + 1) as Month}`) })
                  : t('pixels:grid.monthAverage', { month: m + 1, monthLong: t(`common:date.monthLong.${(m + 1) as Month}`), value: decimal(avg) })}
              className="nums flex flex-col items-center justify-center gap-0.5 text-[11px] leading-3 font-semibold max-md:mt-2 max-md:border-t-[1.5px] max-md:border-dashed max-md:border-line-soft max-md:pt-2 md:h-6 md:flex-row md:gap-[5px] md:text-label"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block size-2.5 rounded-[3px] border',
                  avg === null ? 'border-line-soft' : cn('border-stroke', SCORE_SWATCH[Math.round(avg) as Score]),
                )}
              />
              {avg === null ? '–' : decimal(avg)}
            </span>
          </Fragment>
        )
      })}
    </div>
  )
}
