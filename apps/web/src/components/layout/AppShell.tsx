import { Outlet } from 'react-router'
import { AppNav, BottomTabs } from './AppNav'

/** Khung trang trong app (sau đăng nhập): thanh trên, nội dung trong khung 1200 px, thanh tab dưới trên điện thoại. */
export function AppShell() {
  return (
    <div className="min-h-dvh pb-20 md:pb-0">
      <AppNav />
      <main className="mx-auto w-full max-w-[1200px] px-4 py-8 sm:px-6 lg:px-8">
        <Outlet />
      </main>
      <BottomTabs />
    </div>
  )
}
