import { useRef, type KeyboardEvent, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type SegmentedOption<T extends string> = { value: T; label: ReactNode }

type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<T>[]
  /** Kiểu giá trị chỉ suy ra từ `options`, để truyền thẳng setState vào `onChange`. */
  value: NoInfer<T>
  onChange: (value: NoInfer<T>) => void
  /** Tên nhóm cho trình đọc màn hình; dùng `labelledBy` khi đã có nhãn hiện trên màn. */
  label?: string
  labelledBy?: string
  className?: string
}

/**
 * Điều khiển phân đoạn: chọn một trong 2–4 lựa chọn ngang hàng (DESIGN.md mục 8). Rãnh lõm có viền mực; mục đang chọn
 * là miếng màu đào trượt sang mục mới (--dur-fast, ease-move), nội dung bên dưới đổi ngay. Các mục rộng bằng nhau.
 * Bàn phím theo mẫu radio group: Tab vào mục đang chọn, mũi tên/Home/End để chọn mục khác.
 */
export function Segmented<T extends string>({ options, value, onChange, label, labelledBy, className }: SegmentedProps<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([])
  const index = options.findIndex((o) => o.value === value)

  function onKeyDown(e: KeyboardEvent<HTMLButtonElement>, i: number) {
    const last = options.length - 1
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? (i === last ? 0 : i + 1)
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? (i === 0 ? last : i - 1)
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? last
              : null
    if (next === null) return
    e.preventDefault()
    onChange(options[next].value)
    buttons.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-labelledby={labelledBy}
      className={cn(
        'relative grid auto-cols-fr grid-flow-col rounded-md border-(length:--stroke-width) border-line bg-muted p-[3px]',
        className,
      )}
    >
      {index >= 0 ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-[3px] left-[3px] rounded-[11px] border-(length:--stroke-width) border-line bg-peach transition-[translate] duration-(--dur-fast) ease-move"
          style={{ width: `calc((100% - 6px) / ${options.length})`, translate: `${index * 100}% 0` }}
        />
      ) : null}
      {options.map((o, i) => {
        const on = i === index
        return (
          <button
            key={o.value}
            ref={(el) => {
              buttons.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={on || (index < 0 && i === 0) ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              'relative z-[1] h-[38px] cursor-pointer rounded-[11px] px-3 text-label whitespace-nowrap transition-colors duration-(--dur-fast) focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-ring',
              on ? 'font-bold text-on-accent' : 'font-semibold text-muted-foreground hover:text-foreground',
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}
