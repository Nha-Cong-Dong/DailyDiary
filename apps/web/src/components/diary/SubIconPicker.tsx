import { cn } from '@/lib/utils'
import { subIcons } from '@/lib/catalog'

type SubIconPickerProps = {
  value: string | null
  /** Bấm lại biểu tượng đang chọn để bỏ chọn (sub icon không bắt buộc). */
  onChange: (icon: string | null) => void
  icons?: string[]
  className?: string
}

/** Lưới chọn sub icon (emoji) từ shared/icons.json. Mỗi ô 48×48 px. */
export function SubIconPicker({ value, onChange, icons = subIcons, className }: SubIconPickerProps) {
  return (
    <div className={cn('flex flex-wrap gap-2.5', className)}>
      {icons.map((icon) => {
        const on = value === icon
        return (
          <button
            key={icon}
            type="button"
            aria-label={`Biểu tượng ${icon}`}
            aria-pressed={on}
            onClick={() => onChange(on ? null : icon)}
            className={cn(
              'inline-flex size-12 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] text-2xl leading-none outline-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring',
              on ? 'border-line bg-secondary shadow-ink-sm' : 'border-border hover:border-line',
            )}
          >
            {icon}
          </button>
        )
      })}
    </div>
  )
}
