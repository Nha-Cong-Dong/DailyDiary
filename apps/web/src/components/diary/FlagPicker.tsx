import { cn } from '@/lib/utils'
import { flagColors, flagHex } from '@/lib/catalog'
import { useDarkMode } from '@/lib/theme'

type FlagPickerProps = {
  /** Mã hex bản sáng đã lưu, hoặc null nếu chưa gắn cờ. */
  value: string | null
  onChange: (hex: string | null) => void
  /** Bản gọn cho màn Hôm nay: điện thoại 8 ô chia đều một hàng, máy tính ô 40×28. */
  compact?: boolean
  /**
   * Bản trong form Sửa / Ghi bù (thiết kế B9, B10): có ô "Không cờ" nét đứt đứng đầu;
   * điện thoại lưới 5 cột cao 40px, máy tính ô 48×34.
   */
  form?: boolean
  className?: string
}

const motion = 'transition-transform duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 active:scale-[.97]'

/** Tám ô màu cờ hiệu (shared/flag_colors.json). Bấm lại ô đang chọn để bỏ cờ. */
export function FlagPicker({ value, onChange, compact, form, className }: FlagPickerProps) {
  const dark = useDarkMode()
  const size = form
    ? 'h-10 rounded-[10px] md:h-[34px] md:w-12'
    : compact
      ? 'h-[30px] rounded-sm sm:h-7 sm:w-10'
      : 'h-11 w-[52px] rounded-[10px]'
  const ring = (on: boolean) => (on ? 'outline-[2.5px] outline-line' : 'outline-transparent')
  return (
    <div
      className={cn(
        form
          ? 'grid grid-cols-5 gap-2.5 md:flex md:flex-wrap md:items-center md:gap-3'
          : compact
            ? 'grid grid-cols-8 gap-2 sm:flex sm:flex-wrap sm:gap-2.5'
            : 'flex flex-wrap gap-3.5',
        className,
      )}
    >
      {form ? (
        <button
          type="button"
          aria-label="Không cờ"
          aria-pressed={value === null}
          onClick={() => onChange(null)}
          className={cn(
            'cursor-pointer border-[1.5px] border-dashed border-line bg-transparent outline-offset-3 focus-visible:outline-3 focus-visible:outline-ring',
            motion,
            size,
            ring(value === null),
          )}
        />
      ) : null}
      {flagColors.map((flag) => {
        const on = value?.toLowerCase() === flag.hex.toLowerCase()
        return (
          <button
            key={flag.id}
            type="button"
            aria-label={`Cờ ${flag.name}`}
            aria-pressed={on}
            onClick={() => onChange(on && !form ? null : flag.hex)}
            style={{ backgroundColor: flagHex(flag.hex, dark) }}
            className={cn(
              'cursor-pointer border-[1.5px] border-line outline-offset-3 focus-visible:outline-3 focus-visible:outline-ring',
              motion,
              size,
              ring(on),
            )}
          />
        )
      })}
    </div>
  )
}
