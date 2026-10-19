import { CalendarDays, Grid2x2, List, Search, UserRound } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

// Các màn hình chính. Đường dẫn được dựng ở các bước 5, 8, 10; trước đó NavLink dẫn tới trang 404.
const ITEMS = [
  { to: '/today', label: 'Hôm nay', icon: CalendarDays },
  { to: '/timeline', label: 'Dòng thời gian', icon: List },
  { to: '/pixels', label: 'Year in Pixels', icon: Grid2x2 },
] as const

/** Thanh trên: máy tính có đủ mục; điện thoại chỉ giữ logo và nút, các mục chuyển xuống thanh dưới. */
export function AppNav() {
  return (
    <header className="mx-auto w-full max-w-[1200px] px-4 pt-4 sm:px-6 sm:pt-6 lg:px-8">
      <nav
        aria-label="Điều hướng chính"
        className="flex items-center gap-2 rounded-lg border-[1.5px] border-line bg-card py-2 pr-2 pl-4 shadow-ink sm:gap-4 sm:py-2.5 sm:pr-3 sm:pl-6"
      >
        <Link to="/" aria-label="Jotly, trang chủ" className="rounded-sm focus-visible:outline-3 focus-visible:outline-ring">
          <Logo />
        </Link>
        <ul className="ml-4 hidden gap-1.5 md:flex">
          {ITEMS.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                className={({ isActive }) =>
                  cn(
                    'inline-flex h-11 items-center rounded-md border-[1.5px] px-4 text-[15px] font-medium focus-visible:outline-3 focus-visible:outline-ring',
                    isActive ? 'border-line bg-secondary font-semibold shadow-ink-sm' : 'border-transparent hover:bg-secondary',
                  )
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
        <div className="flex-1" />
        <Button variant="outline" size="icon" aria-label="Tìm theo từ khóa">
          <Search aria-hidden="true" />
        </Button>
        <ThemeToggle />
        <Button variant="outline" size="icon" aria-label="Hồ sơ" className="rounded-full bg-secondary">
          <UserRound aria-hidden="true" />
        </Button>
      </nav>
    </header>
  )
}

/** Thanh tab dưới cho điện thoại (dưới 768 px). */
export function BottomTabs() {
  return (
    <nav
      aria-label="Các màn hình chính"
      className="fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-line bg-card pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-3">
        {ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ring',
                  isActive ? 'font-semibold text-foreground' : 'text-muted-foreground',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'inline-flex h-7 w-12 items-center justify-center rounded-full border-[1.5px]',
                      isActive ? 'border-line bg-secondary' : 'border-transparent',
                    )}
                  >
                    <item.icon className="size-5" aria-hidden="true" />
                  </span>
                  {item.label}
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
