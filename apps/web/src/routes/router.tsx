import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { ErrorPage } from './ErrorPage'
import { RootLayout, RootLoading } from './RootLayout'

// Chỉ có khi chạy dev, không vào bản build production: /dev/ui xem hệ thiết kế (MVP Bước 2), không cần đăng nhập.
// Các màn trong app (nhật ký, ảnh, dòng thời gian, Year in Pixels, tìm kiếm, chia sẻ) đều vào bản build, tải lười.
const devPublicRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'dev/ui', lazy: async () => ({ Component: (await import('./DevUiPage')).DevUiPage }) }]
  : []

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    // Lỗi không bắt được trong cây route → màn "Jotly đang gặp trục trặc"; tải route lười → khung xương.
    ErrorBoundary: ErrorPage,
    HydrateFallback: RootLoading,
    children: [
      { index: true, Component: HomePage },
      { path: 'login', Component: LoginPage },
      // Trang người nhận xem: ngoài khung app, không cần đăng nhập.
      { path: 's/:token', lazy: async () => ({ Component: (await import('./SharePage')).SharePage }) },
      // Lần đầu: cần đăng nhập nhưng chưa xong onboarding vẫn vào được.
      { element: <RequireAuth allowNotOnboarded />, children: [{ path: 'onboarding', lazy: async () => ({ Component: (await import('./OnboardingPage')).OnboardingPage }) }] },
      {
        Component: AppShell,
        children: [
          ...devPublicRoutes,
          {
            Component: RequireAuth,
            children: [
              // Màn trong app tải lười để trang chủ và /login vẽ nhanh (tiêu đề Landing không phải chờ cả app).
              { path: 'today', lazy: async () => ({ Component: (await import('./TodayPage')).TodayPage }) },
              { path: 'day/:date/edit', handle: { phoneChrome: 'none' }, lazy: async () => ({ Component: (await import('./DayEditPage')).DayEditPage }) },
              { path: 'day/:date/backfill', handle: { phoneChrome: 'tabs' }, lazy: async () => ({ Component: (await import('./BackfillPage')).BackfillPage }) },
              { path: 'day/:date', handle: { phoneChrome: 'tabs' }, lazy: async () => ({ Component: (await import('./DayPage')).DayPage }) },
              { path: 'search', lazy: async () => ({ Component: (await import('./SearchPage')).SearchPage }) },
              { path: 'pixels', lazy: async () => ({ Component: (await import('./PixelsPage')).PixelsPage }) },
              { path: 'timeline', lazy: async () => ({ Component: (await import('./TimelinePage')).TimelinePage }) },
              { path: 'profile', lazy: async () => ({ Component: (await import('./ProfilePage')).ProfilePage }) },
              { path: 'profile/shares', lazy: async () => ({ Component: (await import('./SharedListPage')).SharedListPage }) },
            ],
          },
        ],
      },
      // 404 tự chọn khung: đã đăng nhập thì khung app, chưa thì khung công khai.
      { path: '*', Component: NotFoundPage },
    ],
  },
])
