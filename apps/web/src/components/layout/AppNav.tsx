import { LayoutGrid, List, Pencil, Search, UserRound } from 'lucide-react'
import { Link, NavLink, useLocation, useMatches } from 'react-router'
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

/**
 * Route tự vẽ khung riêng trên điện thoại khai báo `handle: { phoneChrome }` trong router:
 * 'tabs' = có thanh trên riêng, giữ thanh tab dưới (Trang ngày, Ghi bù);
 * 'none' = toàn màn, không thanh nào (Sửa trang). Thanh bị thay vẫn giữ chỗ nhưng ẩn (invisible), nên Tab không vào được.
 */
type PhoneChrome = 'tabs' | 'none'
function usePhoneChrome(): PhoneChrome | null {
  const matches = useMatches()
  for (let i = matches.length - 1; i >= 0; i--) {
    const h = matches[i].handle as { phoneChrome?: PhoneChrome } | undefined
    if (h?.phoneChrome) return h.phoneChrome
  }
  return null
}

export function AppHeader() {
  const { displayName, avatarUrl } = useProfile()
  const forced = useActiveSection()
  // Điện thoại: màn Tìm có hàng riêng (quay lại + ô tìm) nên ẩn thanh trên chung (thiết kế B10 · Tìm kiếm).
  const ownHeader = useLocation().pathname === '/search'
  const phoneChrome = usePhoneChrome()
  return (
    <header
      className={cn(
        'sticky top-0 z-30 border-b-[1.5px] border-line bg-background',
        ownHeader && 'max-md:hidden',
        phoneChrome && 'max-md:invisible',
      )}
    >
      <nav
        aria-label="Điều hướng chính"
        className="mx-auto flex h-[60px] max-w-[1120px] items-center gap-1 pr-2 pl-4 md:h-auto md:gap-4 md:px-[clamp(16px,4vw,40px)] md:py-3"
      >
        <Link
          to="/today"
          aria-label="Jotly, Hôm nay"
          className={cn('rounded-sm transition-transform duration-150 hover:[&_svg]:animate-wiggle active:scale-[.97] [&_svg]:origin-[50%_60%]', focusRing)}
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
                    'relative inline-flex h-10 items-center rounded-[12px] border-[1.5px] px-3.5 text-sm transition-[background-color,scale] duration-200 active:scale-[.97]',
                    isActive || forced === item.to
                      ? 'border-line bg-secondary font-semibold shadow-[2px_2px_0_var(--ink-shadow)]'
                      : 'border-transparent font-medium after:absolute after:inset-x-3.5 after:bottom-[7px] after:h-0.5 after:origin-left after:scale-x-0 after:rounded-full after:bg-current after:transition-transform after:duration-250 hover:bg-secondary hover:after:scale-x-100',
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
  const phoneChrome = usePhoneChrome()
  return (
    <nav
      aria-label="Các màn hình chính"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t-[1.5px] border-line bg-card px-2 pt-1.5 pb-[max(14px,env(safe-area-inset-bottom))] md:hidden',
        phoneChrome === 'none' && 'invisible',
      )}
    >
      <ul className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {tabs.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex flex-col items-center gap-[3px] rounded-md pt-1 text-[11px] leading-[14px] transition-transform duration-150 active:scale-[.97]',
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
