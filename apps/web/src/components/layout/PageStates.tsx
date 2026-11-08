import { LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LogoMark } from './Logo'
import { useT } from '@/lib/i18n'

// Các màn trạng thái phụ dùng chung (thiết kế B9 · Lỗi, mất mạng, đang tải): đang tải, 404, lỗi máy chủ.

/** Nút chính (bóng đào, buttonVariants cta cỡ lg). */
const cta = cn(buttonVariants({ variant: 'cta', size: 'lg' }), 'disabled:cursor-wait')

function Centered({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        'flex min-h-[min(560px,70dvh)] animate-rise flex-col items-center justify-center gap-4 px-4 text-center',
        className,
      )}
    >
      {children}
    </div>
  )
}

/** Logo cuốn sổ (đứng yên, B9-States) + chữ, dùng khi chờ dữ liệu. */
export function WritingLogo({ label }: { label?: string }) {
  const t = useT()
  return (
    <span className="inline-flex items-center gap-2.5 text-sm leading-[22px] text-ink-soft">
      <LogoMark size={30} />
      {label ?? t('components:states.opening')}
    </span>
  )
}

/**
 * Khung xương khi đang mở một trang (route tải lười, chờ /me). Chỉ phác hình chung (tiêu đề, thẻ số, danh sách)
 * để dùng được cho mọi màn, không mô phỏng riêng màn nào.
 */
export function PageLoading({ className }: { className?: string }) {
  const t = useT()
  return (
    <div role="status" aria-label={t('components:states.openingAria')} className={cn('flex animate-rise flex-col gap-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          <span className="skeleton block h-[30px] w-[220px] max-w-full" />
          <span className="skeleton block h-4 w-[300px] max-w-full" />
        </div>
        <WritingLogo />
      </div>
      <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] border-line-soft bg-card px-[18px] py-4">
            <span className="skeleton block h-3 w-3/5" />
            <span className="skeleton block h-[26px] w-2/5" />
            <span className="skeleton block h-3 w-[70%]" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 rounded-[18px] border-[1.5px] border-line-soft bg-card px-5 py-[18px]">
            <span className="skeleton block size-14 rounded-full" />
            <span className="flex flex-col gap-2.5">
              <span className="skeleton block h-3 w-[45%]" />
              <span className="skeleton block h-5 w-[65%]" />
              <span className="skeleton block h-3 w-[90%]" />
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Trang không tồn tại (404). */
export function NotFoundState() {
  const t = useT()
  return (
    <Centered>
      <svg
        width="180"
        height="160"
        viewBox="0 0 110 98"
        fill="none"
        stroke="var(--icon-ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={t('components:states.tornPage')}
      >
        <g>
          <path d="M24 10h52l12 12v40l-6 4l-5-3l-6 5l-6-4l-5 4l-6-3l-6 4l-6-4l-6 3l-6-4z" fill="var(--card)" />
          <path d="M76 10v12h12" fill="var(--sunk)" />
          <path d="M34 28h30 M34 36h22" stroke="var(--rule)" />
          <path d="M51 46c0-4.5 6.5-4.5 6.5-8.6c0-2.5-2-4.4-4.8-4.4c-2.5 0-4.5 1.5-4.9 3.8" strokeWidth="2.4" />
          <circle cx="51.6" cy="52" r="1.6" fill="var(--icon-ink)" stroke="none" />
        </g>
        <path d="M30 76l-6 4l-5-3 M58 82l6 4l5-3" stroke="var(--ink-soft)" strokeDasharray="3 4" />
        <path d="M40 90l8-5l8 4l7-4" stroke="var(--ink-soft)" />
      </svg>
      <p className="text-label text-ink-soft">{t('components:states.error404')}</p>
      <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">{t('components:states.notFound')}</h1>
      <p className="max-w-[420px] text-body leading-[26px] text-ink-soft">
        {t('components:states.notFoundBody')}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-[22px] gap-y-3.5">
        <Link to="/today" className={cta}>
          {t('components:states.goToday')}
        </Link>
        <Link to="/timeline" className="link-underline text-body font-medium">
          {t('components:states.openTimeline')}
        </Link>
      </div>
    </Centered>
  )
}

/**
 * Lỗi máy chủ hoặc lỗi không lường trước: "Jotly đang gặp trục trặc". `onRetry` trả Promise thì nút hiện
 * "Đang thử…" tới khi xong; thử lại vẫn hỏng thì đếm số lần thử.
 */
export function ServerErrorState({ onRetry, status }: { onRetry: () => unknown; status?: number }) {
  const t = useT()
  const [retrying, setRetrying] = useState(false)
  const [tries, setTries] = useState(0)

  async function retry() {
    setRetrying(true)
    try {
      await onRetry()
    } finally {
      setRetrying(false)
      setTries((n) => n + 1)
    }
  }

  const code = status ? t('components:states.errorCode', { status }) : ''
  return (
    <Centered>
      <svg
        width="160"
        height="140"
        viewBox="0 0 100 88"
        fill="none"
        stroke="var(--icon-ink)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={t('components:states.teacup')}
      >
        <path d="M40 10c-3 4 3 6 0 10 M52 6c-3 4 3 6 0 10 M64 10c-3 4 3 6 0 10" />
        {/* Thân tách dùng màu bìa oải hương của logo, cố định ở cả hai chế độ như logo. */}
        <path d="M24 30h56v18a22 22 0 0 1-22 22H46a22 22 0 0 1-22-22z" fill="var(--lavender)" />
        <path d="M80 36h4a8 8 0 0 1 0 16h-5" />
        <path d="M16 76h72" strokeWidth="2.4" />
        <path
          d="M44 46c-2-1.6-3-2.7-3-3.9c0-1 .8-1.8 1.8-1.8c.6 0 1.1.3 1.3.8c.3-.5.7-.8 1.3-.8c1 0 1.8.8 1.8 1.8c0 1.2-1 2.3-3.2 3.9z"
          fill="var(--peach)"
        />
      </svg>
      <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">{t('components:states.serverTitle')}</h1>
      <p className="max-w-[440px] text-body leading-[26px] text-ink-soft">
        {t('components:states.serverBody')}
      </p>
      <button type="button" className={cn(cta, 'mt-2 cursor-pointer')} disabled={retrying} onClick={retry}>
        {retrying ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {retrying ? t('components:states.trying') : t('components:states.retry')}
      </button>
      <p role="status" className="text-label font-medium text-ink-soft">
        {tries ? `${t('components:states.stillFailing', { tries })}${code ? ` ${code}` : ''}` : code}
      </p>
    </Centered>
  )
}
