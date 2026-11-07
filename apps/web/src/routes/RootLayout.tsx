import { Outlet } from 'react-router'
import { PageLoading } from '@/components/layout/PageStates'

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-paper text-ink">
      <Outlet />
    </div>
  )
}

/** HydrateFallback của route gốc: hiện khi lần đầu mở app mà route cần tải lười chưa xong. */
export function RootLoading() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1120px] bg-paper px-4 py-8 text-ink md:px-8 md:py-12">
      <PageLoading />
    </div>
  )
}
