import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'
import { useT } from '@/lib/i18n'

/**
 * Khung công khai tối giản cho trang không thuộc app (thiết kế B8 · link đã tắt, B9 · Lỗi): logo về trang chủ,
 * nút sáng/tối, nội dung giữa trang. Dùng cho trang lỗi và trang 404 của người chưa đăng nhập.
 */
export function PlainFrame({ children }: { children: ReactNode }) {
  const t = useT()
  return (
    <div className="flex min-h-dvh flex-col bg-paper text-ink">
      <header className="border-b-[1.5px] border-stroke">
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-4 py-3 sm:px-[clamp(16px,4vw,40px)]">
          <Link
            to="/"
            aria-label={t('components:plainFrame.homeAria')}
            className="flex min-h-11 items-center rounded-sm transition-transform duration-150 ease-out active:scale-[.97] motion-reduce:transform-none"
          >
            <Logo size="sm" />
          </Link>
          <div className="flex-1" />
          <ThemeToggle className="size-10 rounded-[12px]" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col justify-center px-4 py-8 sm:px-[clamp(16px,4vw,40px)]">
        {children}
      </main>
    </div>
  )
}
