import { Outlet } from 'react-router'
import { PageLoading } from '@/components/layout/PageStates'

export function RootLayout() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Outlet />
    </div>
  )
}

/** HydrateFallback của route gốc: hiện khi lần đầu mở app mà route cần tải lười chưa xong. */
export function RootLoading() {
  return (
    <div className="mx-auto min-h-dvh w-full max-w-[1120px] bg-background px-4 py-8 text-foreground sm:px-[clamp(16px,4vw,40px)] md:py-[clamp(40px,6vw,72px)]">
      <PageLoading />
    </div>
  )
}
