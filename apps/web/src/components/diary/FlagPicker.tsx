import { cn } from '@/lib/utils'
import { flagColors, flagHex } from '@/lib/catalog'
import { useDarkMode } from '@/lib/theme'

type FlagPickerProps = {
  /** Mã hex bản sáng đã lưu, hoặc null nếu chưa gắn cờ. */
  value: string | null
  onChange: (hex: string | null) => void
  /** Bản gọn cho màn Hôm nay: điện thoại 8 ô chia đều một hàng, máy tính ô 40×28. */
  compact?: boolean
  className?: string
}

/** Tám ô màu cờ hiệu (shared/flag_colors.json). Bấm lại ô đang chọn để bỏ cờ. */
export function FlagPicker({ value, onChange, compact, className }: FlagPickerProps) {
  const dark = useDarkMode()
  return (
    <div className={cn(compact ? 'grid grid-cols-8 gap-2 sm:flex sm:flex-wrap sm:gap-2.5' : 'flex flex-wrap gap-3.5', className)}>
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
              'cursor-pointer border-[1.5px] border-line outline-offset-3 focus-visible:outline-3 focus-visible:outline-ring',
              compact ? 'h-[30px] rounded-sm sm:h-7 sm:w-10' : 'h-11 w-[52px] rounded-[10px]',
              on ? 'outline-[2.5px] outline-line' : 'outline-transparent',
            )}
          />
        )
      })}
    </div>
  )
}
