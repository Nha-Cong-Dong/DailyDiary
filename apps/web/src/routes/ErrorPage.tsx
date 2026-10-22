import { isRouteErrorResponse, useRouteError } from 'react-router'
import { ApiError } from '@/api/client'
import { NotFoundState, ServerErrorState } from '@/components/layout/PageStates'
import { PlainFrame } from '@/components/layout/PlainFrame'

/** Mã HTTP của lỗi nếu có (lỗi API, lỗi do router ném); lỗi JavaScript thường thì không có. */
function statusOf(error: unknown): number | undefined {
  if (isRouteErrorResponse(error)) return error.status
  if (error instanceof ApiError) return error.status
  return undefined
}

/**
 * ErrorBoundary của route gốc: lỗi khi dựng trang hoặc tải route lười. Thay cả khung app, nên tự có thanh trên tối giản.
 * Không hiện nội dung lỗi (có thể chứa dữ liệu nhật ký); chỉ hiện mã HTTP.
 */
export function ErrorPage() {
  const error = useRouteError()
  const status = statusOf(error)
  return (
    <PlainFrame>
      {status === 404 ? <NotFoundState /> : <ServerErrorState status={status} onRetry={() => window.location.reload()} />}
    </PlainFrame>
  )
}
