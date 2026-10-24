import { LayoutGrid, Link2, List, LogOut, Pencil, Settings } from 'lucide-react'
import { Link, useNavigate } from 'react-router'
import { Avatar } from '@/components/layout/Avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SIGNED_OUT, useLogout } from '@/lib/session'

type Props = {
  name: string
  email: string
  avatarUrl: string | null
  todayWritten: boolean
  shareCount: number
}

/** Menu tài khoản trên trang chủ khi đã đăng nhập (thiết kế B5 · Landing đã đăng nhập). */
export function AccountMenu({ name, email, avatarUrl, todayWritten, shareCount }: Props) {
  const logout = useLogout()
  const navigate = useNavigate()
  const items = [
    { to: '/today', label: 'Trang hôm nay', icon: Pencil, tag: todayWritten ? 'Đã ghi' : null },
    { to: '/timeline', label: 'Dòng thời gian', icon: List },
    { to: '/pixels', label: 'Year in Pixels', icon: LayoutGrid },
    { to: '/profile/shares', label: 'Trang đang chia sẻ', icon: Link2, count: shareCount },
    { to: '/profile', label: 'Hồ sơ & cài đặt', icon: Settings },
  ]
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`Tài khoản của ${name}`}
        className="rounded-full transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(.2,.8,.2,1)] hover:scale-[1.04] focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[.97] data-[state=open]:shadow-[0_0_0_2px_var(--card),0_0_0_3.5px_var(--line)]"
      >
        <Avatar name={name} src={avatarUrl} size={40} className="text-sm" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={12} className="w-[292px]">
        <div className="flex items-center gap-3 border-b-[1.5px] border-dashed border-border px-2.5 pt-2.5 pb-3">
          <Avatar name={name} src={avatarUrl} size={44} />
          <span className="flex min-w-0 flex-col">
            <span className="text-[15px] leading-[22px] font-semibold">{name}</span>
            <span className="truncate text-[13px] leading-5 text-muted-foreground">{email}</span>
          </span>
        </div>
        <div className="flex flex-col gap-0.5 py-1">
          {items.map((item) => (
            <DropdownMenuItem key={item.to} asChild>
              <Link to={item.to}>
                <item.icon aria-hidden="true" />
                <span className="flex-1">{item.label}</span>
                {item.tag ? <span className="text-xs text-muted-foreground">{item.tag}</span> : null}
                {item.count ? (
                  <span className="min-w-[22px] rounded-full bg-primary px-1.5 text-center text-[11px] leading-[18px] font-bold text-primary-foreground">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            </DropdownMenuItem>
          ))}
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          disabled={logout.isPending}
          onSelect={() => logout.mutate(undefined, { onSettled: () => navigate('/', { replace: true, state: SIGNED_OUT }) })}
        >
          <LogOut aria-hidden="true" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
