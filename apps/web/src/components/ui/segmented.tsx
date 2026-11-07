import * as React from "react"
import { cn } from "@/lib/utils"

export type SegmentedOption<T extends string> = { value: T; label: React.ReactNode; disabled?: boolean }

type SegmentedProps<T extends string> = {
  options: readonly SegmentedOption<NoInfer<T>>[]
  value: T
  onChange: (value: NoInfer<T>) => void
  /** Tên nhóm cho trình đọc màn hình (bắt buộc nếu không có ariaLabelledby). */
  ariaLabel?: string
  ariaLabelledby?: string
  className?: string
  /** Lớp cho từng nút (vd. chiều cao khác). */
  optionClassName?: string
}

/**
 * Điều khiển phân đoạn (B11-Components · Segmented): rãnh sunk viền mực, miếng đào trượt sang mục mới trong 160ms
 * ease-move; nội dung đổi ngay. Bàn phím: mũi tên, Home, End (role radiogroup, focus đi theo mục chọn).
 */
function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  ariaLabelledby,
  className,
  optionClassName,
}: SegmentedProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  )
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  function onKeyDown(e: React.KeyboardEvent, i: number) {
    const last = options.length - 1
    let next: number | null = null
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = i === last ? 0 : i + 1
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp") next = i === 0 ? last : i - 1
    else if (e.key === "Home") next = 0
    else if (e.key === "End") next = last
    if (next === null) return
    e.preventDefault()
    // Bỏ qua mục bị tắt theo hướng đang đi.
    const step = e.key === "ArrowLeft" || e.key === "ArrowUp" || e.key === "End" ? -1 : 1
    for (let n = 0; n < options.length && options[next].disabled; n++) {
      next = (next + step + options.length) % options.length
    }
    onChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledby}
      data-slot="segmented"
      className={cn(
        "relative grid rounded-md border-[1.5px] border-stroke bg-sunk p-[3px]",
        className
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      <span
        aria-hidden="true"
        className="absolute top-[3px] bottom-[3px] left-[3px] rounded-[11px] border-[1.5px] border-stroke bg-peach transition-transform duration-(--dur-fast) ease-move motion-reduce:transition-none"
        style={{
          width: `calc((100% - 6px) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((o, i) => {
        const checked = i === index
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el
            }}
            type="button"
            role="radio"
            aria-checked={checked}
            disabled={o.disabled}
            tabIndex={checked ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={cn(
              "relative z-[1] h-[38px] cursor-pointer rounded-[11px] px-3 text-label whitespace-nowrap transition-colors duration-(--dur-fast) ease-out focus-visible:outline-3 focus-visible:outline-offset-1 focus-visible:outline-focus disabled:cursor-not-allowed disabled:text-ink-faint",
              checked ? "font-bold text-on-accent" : "font-semibold text-ink-soft pointer-fine:hover:text-ink",
              optionClassName
            )}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

export { Segmented }
