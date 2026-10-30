import type { QueryClient } from '@tanstack/react-query'
import { createBrowserRouter, type LoaderFunction, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { RequireAuth } from '@/features/auth/RequireAuth'
import { NotFoundPage } from './NotFoundPage'
import { ErrorPage } from './ErrorPage'
import { RootLayout, RootLoading } from './RootLayout'

// Chỉ có khi chạy dev, không vào bản build production: /dev/ui xem hệ thiết kế (MVP Bước 2), không cần đăng nhập.
// Các màn trong app (nhật ký, ảnh, dòng thời gian, Year in Pixels, tìm kiếm, chia sẻ) đều vào bản build, tải lười.
const devPublicRoutes: RouteObject[] = import.meta.env.DEV
  ? [{ path: 'dev/ui', lazy: async () => ({ Component: (await import('./DevUiPage')).DevUiPage }) }]
  : []

/**
 * Loader chỉ khởi động việc tải trước dữ liệu của màn (routes/prefetch.ts, nạp lười để không làm nặng gói đầu) rồi
 * trả ngay, không chặn việc vẽ; màn vẫn tự gọi query như cũ và nhận lại từ cache.
 */
/** Trang ngày chờ dữ liệu tối đa chừng này trước khi chuyển: có dữ liệu thì vòng icon đích có mặt ngay, và chuyển cảnh
 * nối (DayMorph) chạy được; mạng chậm hơn thì vẫn chuyển trang như cũ, màn tự hiện trạng thái đang mở. */
const DAY_WAIT_MS = 300

function warm(client: QueryClient, name: 'today' | 'day' | 'timeline' | 'pixels'): LoaderFunction {
  return ({ request, params }) => {
    const url = new URL(request.url)
    const loaded = import('./prefetch').then((m) => m.prefetchRoute(client, name, url, params))
    if (name !== 'day') return null
    return Promise.race([loaded, new Promise((resolve) => setTimeout(resolve, DAY_WAIT_MS))]).then(() => null)
  }
}

export function createRouter(client: QueryClient) {
  return createBrowserRouter([
    {
      path: '/',
      Component: RootLayout,
      // Lỗi không bắt được trong cây route → màn "Jotly đang gặp trục trặc"; tải route lười → khung xương.
      ErrorBoundary: ErrorPage,
      HydrateFallback: RootLoading,
      children: [
        // Trang chủ và /login cũng tải lười (Bước 14, LCP): Landing kéo theo menu Radix, autosave, IndexedDB — các màn
        // trong app không cần tải những thứ đó trước khi vẽ.
        { index: true, lazy: async () => ({ Component: (await import('./HomePage')).HomePage }) },
        { path: 'login', lazy: async () => ({ Component: (await import('./LoginPage')).LoginPage }) },
        // Chính sách quyền riêng tư (đặc tả 4.1): công khai, ngoài khung app.
        { path: 'privacy', lazy: async () => ({ Component: (await import('./PrivacyPage')).PrivacyPage }) },
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
                // Màn trong app tải lười: mỗi màn chỉ tải phần của nó.
                { path: 'today', loader: warm(client, 'today'), lazy: async () => ({ Component: (await import('./TodayPage')).TodayPage }) },
                { path: 'day/:date/edit', handle: { phoneChrome: 'none' }, loader: warm(client, 'day'), lazy: async () => ({ Component: (await import('./DayEditPage')).DayEditPage }) },
                { path: 'day/:date/backfill', handle: { phoneChrome: 'tabs' }, loader: warm(client, 'day'), lazy: async () => ({ Component: (await import('./BackfillPage')).BackfillPage }) },
                { path: 'day/:date', handle: { phoneChrome: 'tabs' }, loader: warm(client, 'day'), lazy: async () => ({ Component: (await import('./DayPage')).DayPage }) },
                { path: 'search', lazy: async () => ({ Component: (await import('./SearchPage')).SearchPage }) },
                { path: 'pixels', loader: warm(client, 'pixels'), lazy: async () => ({ Component: (await import('./PixelsPage')).PixelsPage }) },
                { path: 'timeline', loader: warm(client, 'timeline'), lazy: async () => ({ Component: (await import('./TimelinePage')).TimelinePage }) },
                { path: 'profile', lazy: async () => ({ Component: (await import('./ProfilePage')).ProfilePage }) },
                { path: 'profile/shares', lazy: async () => ({ Component: (await import('./SharedListPage')).SharedListPage }) },
                { path: 'profile/trash', lazy: async () => ({ Component: (await import('./TrashPage')).TrashPage }) },
              ],
            },
          ],
        },
        // 404 tự chọn khung: đã đăng nhập thì khung app, chưa thì khung công khai.
        { path: '*', Component: NotFoundPage },
      ],
    },
  ])
}
