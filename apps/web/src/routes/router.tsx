import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { RootLayout } from './RootLayout'

// Các màn chỉ có khi chạy dev, không vào bản build production:
// - /dev/ui: xem hệ thiết kế (MVP Bước 2);
// - /today, /onboarding: giao diện thiết kế B6, chưa nối API (đăng nhập + hồ sơ ở Bước 3, nhật ký ở Bước 5);
// - /day/:date, /pixels, /search, /profile: thiết kế B7, chạy trên dữ liệu mẫu (lib/demo.ts) tới khi có API.
// Tải lười bằng import động trong nhánh DEV, nên bản build loại hẳn các trang này và dữ liệu mẫu.
const devAppRoutes: RouteObject[] = import.meta.env.DEV
  ? [
      { path: 'dev/ui', lazy: async () => ({ Component: (await import('./DevUiPage')).DevUiPage }) },
      { path: 'today', lazy: async () => ({ Component: (await import('./TodayPage')).TodayPage }) },
      { path: 'day/:date', lazy: async () => ({ Component: (await import('./DayPage')).DayPage }) },
      { path: 'pixels', lazy: async () => ({ Component: (await import('./PixelsPage')).PixelsPage }) },
      { path: 'search', lazy: async () => ({ Component: (await import('./SearchPage')).SearchPage }) },
      { path: 'profile', lazy: async () => ({ Component: (await import('./ProfilePage')).ProfilePage }) },
    ]
  : []
const devStandaloneRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'onboarding', lazy: async () => ({ Component: (await import('./OnboardingPage')).OnboardingPage }) }]
  : []

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      ...devStandaloneRoutes,
      {
        Component: AppShell,
        children: [...devAppRoutes, { path: '*', Component: NotFoundPage }],
      },
    ],
  },
])
