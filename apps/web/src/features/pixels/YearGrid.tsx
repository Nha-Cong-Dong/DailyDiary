import { Fragment, useRef, type KeyboardEvent } from 'react'
import { pixelFilterOf, type PixelFilter } from '@/components/diary/pixelFilter'
import { flagHex, flagName, type Score } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { ColorBy } from './useColorBy'
import { decimal, type YearCell } from './yearStats'

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
  const label = `${c.day} tháng ${c.month}${c.date === today ? ', hôm nay' : ''}`
  if (c.kind === 'score' && flag !== undefined) return `${label}, điểm ${c.score}, ${flag ? `cờ ${flagName(flag)}` : 'không cờ'}`
  if (c.kind === 'score') return `${label}, điểm ${c.score}`
  if (c.kind === 'missing') return `${label}, chưa ghi`
  if (c.kind === 'future') return `${label}, chưa tới`
  return `${label}, trước khi dùng Jotly`
}

const focusable = (c: YearCell | undefined) => !!c && (c.kind === 'score' || c.kind === 'missing')

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
 * Bảng điểm cả năm (thiết kế B7). Máy tính: 12 hàng tháng × 31 cột ngày + cột trung bình.
 * Điện thoại: xoay thành 12 cột tháng × 31 hàng ngày + hàng trung bình, để không phải cuộn ngang.
 * Bàn phím: chỉ một ô nhận Tab (roving tabindex); phím mũi tên đi theo đúng hướng đang nhìn thấy.
 */
export function YearGrid({ grid, monthAverages, today, selected, onSelect, focus, colorBy = 'score', flags = {} }: YearGridProps) {
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
      aria-label="Bảng điểm cả năm"
      className="grid grid-flow-col grid-cols-[18px_repeat(12,minmax(0,1fr))] grid-rows-[auto_repeat(31,auto)_auto] gap-[3px] md:grid-flow-row md:grid-cols-[36px_repeat(31,minmax(0,1fr))_52px] md:grid-rows-none md:gap-1"
    >
      {/* Nhóm đầu: số ngày (máy tính là hàng trên cùng, điện thoại là cột bên trái). */}
      <span aria-hidden="true" />
      {Array.from({ length: 31 }, (_, i) => (
        <span
          key={i}
          aria-hidden="true"
          className={cn(
            'text-right text-[11px] leading-3 text-muted-foreground tabular-nums md:text-center md:leading-[14px]',
            i !== 0 && (i + 1) % 5 !== 0 && 'max-md:invisible',
          )}
        >
          {i + 1}
        </span>
      ))}
      <span
        aria-hidden="true"
        className="text-[11px] leading-3 font-semibold text-muted-foreground max-md:mt-2 max-md:border-t-[1.5px] max-md:border-dashed max-md:border-border max-md:pt-2 md:text-center md:text-[11px] md:leading-[14px]"
      >
        TB
      </span>

      {grid.map((row, m) => {
        const avg = monthAverages[m]
        return (
          <Fragment key={m}>
            <span className="mb-0.5 text-center text-[11px] leading-[14px] font-semibold text-muted-foreground md:mb-0 md:text-left md:text-label">
              <span className="max-md:hidden">T</span>
              {m + 1}
            </span>
            {row.map((c, d) => {
              if (c.kind === 'none') return <span key={d} aria-hidden="true" />
              const dimmed = focus !== null && c.kind !== 'pre' && pixelFilterOf(c.score, c.kind === 'future' ? 'future' : 'past') !== focus
              const flag = byFlag && c.kind === 'score' ? (flags[c.date] ?? '') : undefined
              // Tô theo cờ: ô có cờ mang màu cờ; có trang mà không cờ thì chỉ có viền đậm.
              const style = flag ? { backgroundColor: flagHex(flag, dark), borderColor: 'var(--line)' } : undefined
              const look = cn(
                'h-[13px] w-full rounded-[3px] border transition-[transform,filter] duration-150 ease-out md:aspect-square md:h-auto md:rounded-[5px]',
                c.kind === 'score' && !byFlag && SCORE_BG[c.score!],
                c.kind === 'score' && byFlag && !flag && 'border-[1.5px] border-line bg-card',
                c.kind === 'missing' && 'border-border bg-muted',
                c.kind === 'future' && 'border-border',
                c.kind === 'pre' && 'border-dashed border-border',
                c.date === today && 'border-2 border-line',
                dimmed && '[filter:grayscale(1)_opacity(.25)]',
              )
              if (!focusable(c)) return <span key={d} title={describe(c, today)} className={look} />
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
                    'cursor-pointer p-0 active:[transform:scale(.9)] md:hover:[transform:scale(1.3)] md:active:[transform:scale(1.1)] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isSel && 'shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--line)]',
                  )}
                />
              )
            })}
            <span
              title={avg === null ? `Tháng ${m + 1} · chưa có điểm` : `Tháng ${m + 1} · trung bình ${decimal(avg)}`}
              className="flex flex-col items-center justify-center gap-0.5 text-[11px] leading-3 font-semibold tabular-nums max-md:mt-2 max-md:border-t-[1.5px] max-md:border-dashed max-md:border-border max-md:pt-2 md:h-6 md:flex-row md:gap-[5px] md:text-xs md:leading-4"
            >
              <span
                aria-hidden="true"
                className={cn(
                  'inline-block size-2.5 rounded-[3px] border',
                  avg === null ? 'border-border' : cn('border-line', SCORE_SWATCH[Math.round(avg) as Score]),
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
