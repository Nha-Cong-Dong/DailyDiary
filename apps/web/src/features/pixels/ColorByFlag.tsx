import { flagHex, flagName, presetFlag } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import type { ColorBy } from './useColorBy'

const OPTIONS: { id: ColorBy; label: string }[] = [
  { id: 'score', label: 'Điểm' },
  { id: 'flag', label: 'Cờ hiệu' },
]

export function ColorByToggle({ value, onChange, className }: { value: ColorBy; onChange: (v: ColorBy) => void; className?: string }) {
  return (
    <div className={cn('inline-flex items-center gap-2.5', className)}>
      <span id="color-by-label" className="text-label leading-5 font-medium text-muted-foreground">
        Tô ô theo
      </span>
      <div
        role="radiogroup"
        aria-labelledby="color-by-label"
        className="inline-flex gap-0.5 rounded-[14px] border-(length:--stroke-width) border-line bg-background p-[3px]"
      >
        {OPTIONS.map((o) => {
          const on = value === o.id
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.id)}
              className={cn(
                'h-[34px] cursor-pointer rounded-[11px] px-3.5 text-sm transition-colors focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring',
                on ? 'bg-foreground font-semibold text-background' : 'font-medium hover:bg-secondary',
              )}
            >
              {o.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/**
 * Chú thích khi tô theo cờ: các cờ dùng trong năm (kể cả màu riêng) kèm số ngày, rồi "Không cờ".
 * Màu theo đúng ô trên bảng (giao diện tối dùng bản tối của cờ).
 */
export function FlagLegend({ flags, written, className }: { flags: Record<DateString, string>; written: number; className?: string }) {
  const dark = useDarkMode()
  const counts = new Map<string, number>()
  for (const hex of Object.values(flags)) counts.set(hex.toUpperCase(), (counts.get(hex.toUpperCase()) ?? 0) + 1)
  const used = [...counts.entries()].sort((a, b) => b[1] - a[1])
  const noFlag = written - Object.keys(flags).length
  const item = 'inline-flex h-8 items-center gap-1.5 rounded-full px-2.5 whitespace-nowrap'
  return (
    <ul aria-label="Chú thích màu cờ" className={cn('flex flex-wrap items-center gap-1 text-label', className)}>
      {used.map(([hex, n]) => (
        <li key={hex} className={item}>
          <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] border border-line" style={{ backgroundColor: flagHex(hex, dark) }} />
          {/* Màu riêng kèm mã màu để phân biệt khi dùng nhiều màu riêng. */}
          {presetFlag(hex) ? flagName(hex) : `Màu riêng ${hex}`} · {n}
        </li>
      ))}
      {noFlag > 0 ? (
        <li className={item}>
          <span aria-hidden="true" className="size-3.5 shrink-0 rounded-[4px] border-(length:--stroke-width) border-line bg-card" />
          Không cờ · {noFlag}
        </li>
      ) : null}
      {used.length === 0 && noFlag === 0 ? <li className={cn(item, 'text-muted-foreground')}>Chưa có trang nào trong năm</li> : null}
    </ul>
  )
}
