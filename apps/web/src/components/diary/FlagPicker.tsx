import { cn } from '@/lib/utils'
import { flagColors, flagHex } from '@/lib/catalog'
import { useDarkMode } from '@/lib/theme'

type FlagPickerProps = {
  /** Mã hex bản sáng đã lưu, hoặc null nếu chưa gắn cờ. */
  value: string | null
  onChange: (hex: string | null) => void
  className?: string
}

/** Tám ô màu cờ hiệu (shared/flag_colors.json). Bấm lại ô đang chọn để bỏ cờ. */
export function FlagPicker({ value, onChange, className }: FlagPickerProps) {
  const dark = useDarkMode()
  return (
    <div className={cn('flex flex-wrap gap-3.5', className)}>
      {flagColors.map((flag) => {
        const on = value?.toLowerCase() === flag.hex.toLowerCase()
        return (
          <button
            key={flag.id}
            type="button"
            aria-label={`Cờ ${flag.name}`}
            aria-pressed={on}
            onClick={() => onChange(on ? null : flag.hex)}
            style={{ backgroundColor: flagHex(flag.hex, dark) }}
            className={cn(
              'h-11 w-[52px] cursor-pointer rounded-[10px] border-[1.5px] border-line outline-offset-3 focus-visible:outline-3 focus-visible:outline-ring',
              on ? 'outline-[2.5px] outline-line' : 'outline-transparent',
            )}
          />
        )
      })}
    </div>
  )
}
