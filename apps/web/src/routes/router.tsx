import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { HomePage } from './HomePage'
import { LoginPage } from './LoginPage'
import { NotFoundPage } from './NotFoundPage'
import { OnboardingPage } from './OnboardingPage'
import { ProfilePage } from './ProfilePage'
import { ErrorPage } from './ErrorPage'
import { RootLayout, RootLoading } from './RootLayout'
import { TodayPage } from './TodayPage'

// Các màn chỉ có khi chạy dev, không vào bản build production (tải lười bằng import động trong nhánh DEV):
// - /dev/ui: xem hệ thiết kế (MVP Bước 2), không cần đăng nhập;
// - /day/:date, /pixels, /search: thiết kế B7 trên dữ liệu mẫu (lib/demo.ts) tới khi có API ở bước 5, 10, 11;
// - /timeline, /day/:date/edit, /day/:date/backfill: thiết kế B8–B9, nối API ở bước 5–9;
// - /s/:token, /profile/shares: Chia sẻ (B8, F-10), nối API khi có Bước 5 (backend link đã có).
const devPublicRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'dev/ui', lazy: async () => ({ Component: (await import('./DevUiPage')).DevUiPage }) }]
  : []
// Trang người nhận xem: ngoài khung app, không cần đăng nhập.
const devStandaloneRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: 's/:token', lazy: async () => ({ Component: (await import('./SharePage')).SharePage }) }]
  : []
const devAuthedRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: 'timeline', lazy: async () => ({ Component: (await import('./TimelinePage')).TimelinePage }) },
      { path: 'day/:date/edit', lazy: async () => ({ Component: (await import('./DayEditPage')).DayEditPage }) },
      { path: 'day/:date/backfill', lazy: async () => ({ Component: (await import('./BackfillPage')).BackfillPage }) },
      { path: 'day/:date', lazy: async () => ({ Component: (await import('./DayPage')).DayPage }) },
      { path: 'pixels', lazy: async () => ({ Component: (await import('./PixelsPage')).PixelsPage }) },
      { path: 'search', lazy: async () => ({ Component: (await import('./SearchPage')).SearchPage }) },
      { path: 'profile/shares', lazy: async () => ({ Component: (await import('./SharedListPage')).SharedListPage }) },
    ]
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
      ...devStandaloneRoutes,
      // Lần đầu: cần đăng nhập nhưng chưa xong onboarding vẫn vào được.
      { element: <RequireAuth allowNotOnboarded />, children: [{ path: 'onboarding', Component: OnboardingPage }] },
      {
        Component: AppShell,
        children: [
          ...devPublicRoutes,
          {
            Component: RequireAuth,
            children: [
              // /today: lưu nhật ký thật có ở Bước 5; trước đó màn ghi rõ "bản thử, chưa lưu".
              { path: 'today', Component: TodayPage },
              { path: 'profile', Component: ProfilePage },
              ...devAuthedRoutes,
            ],
          },
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
])
