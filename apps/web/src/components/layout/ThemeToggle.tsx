import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { setDark, useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'

/** Nút đổi chế độ sáng/tối (vùng chạm 44 px); mặt trăng nghiêng nhẹ khi di chuột, xoay thêm khi bấm. */
export function ThemeToggle({ className }: { className?: string }) {
  const dark = useDarkMode()
  return (
    <Button
      variant="outline"
      size="icon"
      aria-label="Chế độ tối"
      aria-pressed={dark}
      onClick={() => setDark(!dark)}
      className={cn(
        '[&_svg]:transition-[rotate] [&_svg]:duration-200 [&_svg]:ease-out hover:[&_svg]:-rotate-12 active:[&_svg]:-rotate-30',
        className,
      )}
    >
      {dark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
    </Button>
  )
}
