import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Segmented } from '@/components/ui/segmented'
import { setDark, setThemePreference, THEME_CAPTIONS, THEME_OPTIONS, useDarkMode, useThemePreference } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

/** Nút đổi nhanh sáng/tối ở thanh trên (vùng chạm 40–44 px); chọn hẳn Sáng hoặc Tối. Mặt trăng nghiêng khi di chuột. */
export function ThemeToggle({ className }: { className?: string }) {
  const t = useT()
  const dark = useDarkMode()
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label={t('components:theme.darkMode')}
      aria-pressed={dark}
      onClick={() => setDark(!dark)}
      className={cn('moon-tilt', className)}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}

/**
 * Bộ chọn chế độ màu đầy đủ (B11-Theme, dùng trong Hồ sơ › Giao diện): Sáng / Tối / Hệ thống / Theo giờ, kèm chú thích
 * dưới cho Hệ thống và Theo giờ. `labelledBy` là id của nhãn "Chế độ màu".
 */
export function ThemePicker({ labelledBy, className }: { labelledBy?: string; className?: string }) {
  const t = useT()
  const pref = useThemePreference()
  const caption = THEME_CAPTIONS[pref]
  return (
    <div className={cn('flex flex-col items-stretch gap-1.5 sm:items-end', className)}>
      <Segmented
        options={THEME_OPTIONS}
        value={pref}
        onChange={setThemePreference}
        ariaLabelledby={labelledBy}
        ariaLabel={labelledBy ? undefined : t('components:theme.colorMode')}
        className="w-full sm:w-[352px]"
      />
      {caption ? <p className="text-label font-normal text-balance text-ink-soft sm:max-w-[352px] sm:text-right">{caption}</p> : null}
    </div>
  )
}
