import { createBrowserRouter, type RouteObject } from 'react-router'
import { AppShell } from '@/components/layout/AppShell'
import { DevUiPage } from './DevUiPage'
import { HomePage } from './HomePage'
import { NotFoundPage } from './NotFoundPage'
import { RootLayout } from './RootLayout'

// /dev/ui chỉ có khi chạy dev (MVP Bước 2), không vào bản build production.
const devRoutes: RouteObject[] = import.meta.env.DEV ? [{ path: 'dev/ui', Component: DevUiPage }] : []

export const router = createBrowserRouter([
  {
    path: '/',
    Component: RootLayout,
    children: [
      { index: true, Component: HomePage },
      {
        Component: AppShell,
        children: [...devRoutes, { path: '*', Component: NotFoundPage }],
      },
    ],
  },
])
