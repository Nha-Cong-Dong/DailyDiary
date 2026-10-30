import { flagColors, flagHex } from '@/lib/catalog'
import { initials } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

const LAVENDER = flagColors.find((f) => f.id === 'lavender')!.hex

type AvatarProps = {
  name: string
  src?: string | null
  /** Cạnh, px. */
  size?: number
  className?: string
}

/** Ảnh đại diện tròn; chưa có ảnh thì hiện chữ viết tắt trên nền oải hương (thiết kế B6, B7). */
export function Avatar({ name, src, size = 40, className }: AvatarProps) {
  const dark = useDarkMode()
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-(length:--stroke-width) border-line font-semibold text-[var(--icon-face)]',
        className,
      )}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36), backgroundColor: flagHex(LAVENDER, dark) }}
    >
      {src ? <img src={src} alt="" referrerPolicy="no-referrer" className="size-full object-cover" /> : initials(name)}
    </span>
  )
}
