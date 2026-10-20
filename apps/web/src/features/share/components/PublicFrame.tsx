import { PenLine } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring'

/**
 * Khung trang công khai (người nhận link, chưa chắc có tài khoản): logo, nút sáng/tối, lời mời viết nhật ký.
 * Không có điều hướng của app. Báo trình duyệt không gửi Referer (đường dẫn có token) và không cho máy tìm kiếm lập chỉ mục.
 */
export function PublicFrame({ title, cta = true, children }: { title: string; cta?: boolean; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <title>{title}</title>
      <meta name="robots" content="noindex, nofollow" />
      <meta name="referrer" content="no-referrer" />
      <header className="border-b-[1.5px] border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center gap-x-4 gap-y-2.5 px-[clamp(16px,4vw,40px)] py-3">
          <Link to="/" aria-label="Jotly, trang chủ" className={`rounded-sm hover:[&_svg]:animate-wiggle [&_svg]:origin-[50%_60%] ${focusRing}`}>
            <Logo size="sm" />
          </Link>
          <div className="flex-1" />
          <ThemeToggle className="press size-10 rounded-[12px]" />
          {cta ? (
            <Link
              to="/"
              className={`lift inline-flex h-10 items-center gap-2 rounded-[12px] border-[1.5px] border-line bg-card pr-4 pl-3 text-sm font-semibold shadow-ink-sm ${focusRing}`}
            >
              <PenLine className="size-[18px]" aria-hidden="true" />
              Viết nhật ký của bạn
            </Link>
          ) : null}
        </div>
      </header>
      {children}
      <footer className="border-t-[1.5px] border-line">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-4 px-[clamp(16px,4vw,40px)] py-6">
          <div className="flex items-center gap-2">
            <Logo size="sm" />
            <span className="ml-1.5 text-[13px] text-muted-foreground">Jot it down, keep it forever.</span>
          </div>
          <div className="flex flex-wrap gap-5 text-[13px]">
            <a href="#" className="link-underline">
              [Điều khoản sử dụng]
            </a>
            <a href="#" className="link-underline">
              [Chính sách quyền riêng tư]
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}
