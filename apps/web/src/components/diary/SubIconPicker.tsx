import { cn } from '@/lib/utils'
import { subIcons } from '@/lib/catalog'
import { useT } from '@/lib/i18n'

type SubIconPickerProps = {
  value: string | null
  /** Bấm lại biểu tượng đang chọn để bỏ chọn (sub icon không bắt buộc). */
  onChange: (icon: string | null) => void
  icons?: string[]
  className?: string
}

/** Chọn sub icon (emoji) từ shared/icons.json. Mỗi ô 44×44 px; bố cục hàng do `className` quyết định. */
export function SubIconPicker({ value, onChange, icons = subIcons, className }: SubIconPickerProps) {
  const t = useT()
  return (
    <div className={cn('flex flex-wrap gap-1.5', className)}>
      {icons.map((icon) => {
        const on = value === icon
        return (
          <button
            key={icon}
            type="button"
            aria-label={t('components:subIcon.aria', { icon })}
            aria-pressed={on}
            onClick={() => onChange(on ? null : icon)}
            className={cn(
              'pick inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] text-[22px] leading-none outline-none focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus',
              on ? 'border-stroke bg-lavender-soft shadow-sm' : 'border-line-soft pointer-fine:hover:border-stroke',
            )}
          >
            {icon}
          </button>
        )
      })}
    </div>
  )
}
