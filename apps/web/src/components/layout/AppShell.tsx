import type { ReactNode } from 'react'
import { Outlet } from 'react-router'
import { AppHeader, BottomTabs } from './AppNav'
import { OfflineBanner } from './OfflineBanner'

/**
 * Khung trang trong app (sau đăng nhập): thanh trên (tab trên máy tính), nội dung trong khung 1120 px với lề space-4
 * (điện thoại) / space-8 (máy tính), thanh tab dưới trên điện thoại. Các phần trong một màn cách nhau space-12 (gap-12).
 */
export function AppShell({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-dvh pb-24 md:pb-0">
      <AppHeader />
      <OfflineBanner />
      <main className="mx-auto w-full max-w-[1120px] px-4 py-4 md:px-8 md:py-12">
        {children ?? <Outlet />}
      </main>
      <BottomTabs />
    </div>
  )
}
