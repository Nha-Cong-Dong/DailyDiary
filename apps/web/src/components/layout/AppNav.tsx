import { LayoutGrid, List, Pencil, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation } from 'react-router'
import { Button } from '@/components/ui/button'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { Avatar } from './Avatar'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

// Khung app theo thiết kế B6. Ở bản build (chưa có API), /timeline và /pixels chỉ có khi chạy dev; bản build dẫn tới 404.
const ITEMS = [
  { to: '/today', label: 'Hôm nay', short: 'Hôm nay', icon: Pencil },
  { to: '/timeline', label: 'Dòng thời gian', short: 'Dòng thời gian', icon: List },
  { to: '/pixels', label: 'Year in Pixels', short: 'Cả năm', icon: LayoutGrid },
] as const

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** Thanh trên: máy tính có đủ mục và nút; điện thoại chỉ giữ logo và tìm kiếm, các mục chuyển xuống thanh dưới. */
// Trang một ngày (/day/...) thuộc nhánh Dòng thời gian.
function useActiveSection() {
  const { pathname } = useLocation()
  return pathname.startsWith('/day/') ? '/timeline' : null
}

export function AppHeader() {
  const { displayName, avatarUrl } = useProfile()
  const forced = useActiveSection()
  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-line bg-background">
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex h-[60px] max-w-[1120px] items-center gap-1 pr-2 pl-4 md:h-auto md:gap-4 md:px-[clamp(16px,4vw,40px)] md:py-3"
      >
        <Link
          to="/today"
          aria-label="Jotly, Hôm nay"
          className={cn('rounded-sm hover:[&_svg]:animate-wiggle [&_svg]:origin-[50%_60%]', focusRing)}
        >
          <Logo size="sm" />
        </Link>
        <ul className="ml-3 hidden gap-1 md:flex">
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-10 items-center rounded-[12px] border-[1.5px] px-3.5 text-sm transition-colors',
                    isActive || forced === item.to
                      ? 'border-line bg-secondary font-semibold shadow-[2px_2px_0_var(--ink-shadow)]'
                      : 'border-transparent font-medium hover:bg-secondary',
                    focusRing,
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex-1" />
        <Button asChild variant="outline" size="icon" className="press border-transparent md:size-10 md:rounded-[12px] md:border-line">
          <NavLink to="/search" aria-label="Tìm theo từ khóa">
            <Search aria-hidden="true" />
          </NavLink>
        </Button>
        <ThemeToggle className="press hidden size-10 rounded-[12px] md:inline-flex" />
        <NavLink
          to="/profile"
          aria-label={`Hồ sơ của ${displayName}`}
          className={cn('press hidden rounded-full md:inline-flex', focusRing)}
        >
          <Avatar name={displayName} src={avatarUrl} size={40} className="text-[15px]" />
        </NavLink>
      </nav>
    </header>
  )
}

/** Thanh tab dưới cho điện thoại (dưới 768 px): bốn màn chính. */
export function BottomTabs() {
  const forced = useActiveSection()
  const tabs = [...ITEMS, { to: '/profile', label: 'Hồ sơ', short: 'Hồ sơ', icon: UserRound }]
  return (
    <nav
      aria-label="Các màn hình chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-line bg-card px-2 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-[3px] rounded-md pt-1 text-[11px] leading-[14px]',
                  isActive || forced === item.to ? 'font-semibold text-foreground' : 'font-medium text-muted-foreground',
                  focusRing,
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'inline-flex h-8 w-[52px] items-center justify-center rounded-full border-[1.5px]',
                      isActive || forced === item.to ? 'border-line bg-secondary shadow-[2px_2px_0_var(--ink-shadow)]' : 'border-transparent',
                    )}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  {item.short}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
