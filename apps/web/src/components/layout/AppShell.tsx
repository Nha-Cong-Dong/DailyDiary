import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppHeader, BottomTabs } from './AppNav'
import { OfflineBanner } from './OfflineBanner'

/** Khung trang trong app (sau đăng nhập): thanh trên, nội dung trong khung 1120 px, thanh tab dưới trên điện thoại. */
export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <AppHeader />
      <OfflineBanner />
      <main className="mx-auto w-full max-w-[1120px] px-4 py-4 sm:px-[clamp(16px,4vw,40px)] md:py-[clamp(40px,6vw,72px)]">
        {children ?? <Outlet />}
      </main>
      <BottomTabs />
    </div>
  )
}
