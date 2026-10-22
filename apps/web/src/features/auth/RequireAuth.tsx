import { Navigate, Outlet, useLocation } from 'react-router'
import { ApiError } from '@/api/client'
import { PageLoading, ServerErrorState } from '@/components/layout/PageStates'
import { useMe } from '@/lib/profile'
import { cn } from '@/lib/utils'
import type { LoginState } from './loginState'

/**
 * Bọc các route cần đăng nhập. 401 → /login (nhớ trang đang mở để quay lại); chưa xong lần đầu → /onboarding.
 */
export function RequireAuth({ allowNotOnboarded = false }: { allowNotOnboarded?: boolean }) {
  const { data, error, isPending, refetch } = useMe()
  const location = useLocation()
  // /onboarding nằm ngoài khung app nên tự thêm lề.
  const bare = allowNotOnboarded && 'mx-auto max-w-[1120px] px-4 py-8 sm:px-[clamp(16px,4vw,40px)]'

  if (isPending) return <PageLoading className={cn(bare)} />
  if (error) {
    if (error instanceof ApiError && error.status === 401) {
      // Còn hồ sơ cũ trong cache nghĩa là vừa đăng nhập xong rồi phiên hết hạn (không phải người lạ).
      const state: LoginState = {
        from: location.pathname,
        expired: data ? { name: data.display_name, email: data.email, avatarUrl: data.avatar_url } : undefined,
      }
      return <Navigate to="/login" replace state={state} />
    }
    // Lỗi khi tải lại (mất mạng, 429) mà đã có hồ sơ trong cache: giữ màn đang dùng, không thay bằng màn lỗi.
    if (data) return data.onboarded || allowNotOnboarded ? <Outlet /> : <Navigate to="/onboarding" replace />
    return (
      <div className={cn(bare)}>
        <ServerErrorState status={error instanceof ApiError ? error.status : undefined} onRetry={() => refetch()} />
      </div>
    )
  }
  if (!data.onboarded && !allowNotOnboarded) return <Navigate to="/onboarding" replace />
  return <Outlet />
}
