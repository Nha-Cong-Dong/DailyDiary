import { isRouteErrorResponse, Link, useRouteError } from 'react-router'
import { ApiError } from '@/api/client'
import { Logo } from '@/components/layout/Logo'
import { NotFoundState, ServerErrorState } from '@/components/layout/PageStates'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

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
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b-[1.5px] border-line">
        <div className="mx-auto flex max-w-[1120px] items-center gap-4 px-4 py-3 sm:px-[clamp(16px,4vw,40px)]">
          <Link to="/" aria-label="Jotly, trang chủ" className="rounded-sm focus-visible:outline-3 focus-visible:outline-ring">
            <Logo size="sm" />
          </Link>
          <div className="flex-1" />
          <ThemeToggle className="press size-10 rounded-[12px]" />
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-[1120px] flex-1 flex-col justify-center px-4 py-8 sm:px-[clamp(16px,4vw,40px)]">
        {status === 404 ? <NotFoundState /> : <ServerErrorState status={status} onRetry={() => window.location.reload()} />}
      </main>
    </div>
  )
}
