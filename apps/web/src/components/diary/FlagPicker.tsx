import { useEffect, useEffectEvent, useRef } from 'react'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { flagColors, flagHex, presetFlag } from '@/lib/catalog'
import { useCustomFlagColors } from '@/lib/profile'
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

const motion = 'transition-transform duration-200 ease-out hover:-translate-y-0.5 active:scale-[.97]'

type Swatch = { hex: string; label: string }

/**
 * Ô màu cờ hiệu: 8 màu có sẵn (shared/flag_colors.json), rồi màu riêng người dùng đã thêm (chốt Q6),
 * rồi ô "+" mở bảng pha màu của hệ thống. Bấm lại ô đang chọn để bỏ cờ.
 * Trang mang màu đã gỡ khỏi danh sách vẫn hiện màu đó (đang chọn) để không mất cờ khi sửa.
 */
export function FlagPicker({ value, onChange, compact, form, className }: FlagPickerProps) {
  const dark = useDarkMode()
  const custom = useCustomFlagColors()
  const size = form
    ? 'h-10 rounded-[10px] md:h-[34px] md:w-12'
    : compact
      ? 'h-[30px] rounded-sm sm:h-7 sm:w-10'
      : 'h-11 w-[52px] rounded-[10px]'
  const ring = (on: boolean) => (on ? 'outline-[2.5px] outline-line' : 'outline-transparent')
  const tile = cn('cursor-pointer outline-offset-3 focus-visible:outline-3 focus-visible:outline-ring', motion, size)

  const swatches: Swatch[] = [
    ...flagColors.map((flag) => ({ hex: flag.hex, label: `Cờ ${flag.name}` })),
    ...custom.colors.map((hex) => ({ hex, label: `Cờ màu riêng ${hex}` })),
  ]
  const same = (a: string, b: string | null) => a.toLowerCase() === b?.toLowerCase()
  if (value && !swatches.some((s) => same(s.hex, value))) swatches.push({ hex: value, label: `Cờ màu riêng ${value}` })

  function pickCustom(hex: string) {
    const known = presetFlag(hex)?.hex ?? custom.colors.find((c) => same(c, hex))
    if (!known) custom.add(hex)
    // Nhật ký nhận mọi mã #RRGGBB: lưu danh sách lỗi (mất mạng) thì trang vẫn mang màu này.
    onChange((known ?? hex).toUpperCase())
  }

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
          className={cn(tile, 'border-(length:--stroke-width) border-dashed border-line bg-transparent', ring(value === null))}
        />
      ) : null}
      {swatches.map((s) => {
        const on = same(s.hex, value)
        return (
          <button
            key={s.hex}
            type="button"
            aria-label={s.label}
            aria-pressed={on}
            onClick={() => onChange(on && !form ? null : s.hex)}
            style={{ backgroundColor: flagHex(s.hex, dark) }}
            className={cn(tile, 'border-(length:--stroke-width) border-line', ring(on))}
          />
        )
      })}
      {custom.canAdd ? (
        <AddColor
          className={tile}
          sizeClass={size}
          disabled={custom.pending}
          initial={value ?? flagColors[0]!.hex}
          onPick={pickCustom}
        />
      ) : null}
    </div>
  )
}

/**
 * Ô "+": mở bảng pha màu của trình duyệt/hệ điều hành (input type=color).
 * Chỉ nhận màu khi đóng bảng (sự kiện `change` gốc), không phải mỗi lần kéo (React onChange = `input`).
 */
function AddColor({
  className,
  sizeClass,
  disabled,
  initial,
  onPick,
}: {
  className: string
  sizeClass: string
  disabled: boolean
  initial: string
  onPick: (hex: string) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const commit = useEffectEvent(() => {
    if (input.current) onPick(input.current.value)
  })

  useEffect(() => {
    const el = input.current
    if (!el) return
    el.addEventListener('change', commit)
    return () => el.removeEventListener('change', commit)
  }, [])

  function open() {
    const el = input.current
    if (!el) return
    el.value = initial.toLowerCase()
    try {
      el.showPicker()
    } catch {
      el.click() // trình duyệt cũ chưa có showPicker
    }
  }

  return (
    <span className={cn('relative flex', sizeClass)}>
      <button
        type="button"
        aria-label="Thêm màu cờ riêng"
        title="Thêm màu riêng"
        disabled={disabled}
        onClick={open}
        className={cn(
          className,
          'flex size-full items-center justify-center border-(length:--stroke-width) border-dashed border-line bg-transparent text-muted-foreground disabled:cursor-wait disabled:opacity-60',
        )}
      >
        <Plus aria-hidden className="size-4" strokeWidth={2.25} />
      </button>
      {/* Không dùng display:none: bảng pha màu mở cạnh ô input. */}
      <input ref={input} type="color" tabIndex={-1} aria-hidden className="pointer-events-none absolute inset-0 size-full opacity-0" />
    </span>
  )
}
