import { LoaderCircle } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { LogoMark } from './Logo'

// Các màn trạng thái phụ dùng chung (thiết kế B9 · Lỗi, mất mạng, đang tải): đang tải, 404, lỗi máy chủ.

/** Nút chính có bóng hồng của thiết kế (giống dải kêu gọi ở landing). */
const cta =
  'inline-flex h-12 items-center gap-2.5 rounded-md border-[1.5px] border-line bg-primary px-5 text-[15px] font-semibold text-primary-foreground shadow-[4px_4px_0_var(--cta-shadow)] transition-[transform,box-shadow] duration-200 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--cta-shadow)] active:translate-x-0.5 active:translate-y-0.5 active:shadow-[1px_1px_0_var(--cta-shadow)] focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring disabled:cursor-wait'

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

/** Logo cây bút "đang viết" + chữ, dùng khi chờ dữ liệu. */
export function WritingLogo({ label = 'Đang mở cuốn sổ…' }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2.5 text-sm leading-[22px] text-muted-foreground">
      <LogoMark size={30} className="origin-[50%_80%] animate-writing" />
      {label}
    </span>
  )
}

/**
 * Khung xương khi đang mở một trang (route tải lười, chờ /me). Chỉ phác hình chung (tiêu đề, thẻ số, danh sách)
 * để dùng được cho mọi màn, không mô phỏng riêng màn nào.
 */
export function PageLoading({ className }: { className?: string }) {
  return (
    <div role="status" aria-label="Đang mở cuốn sổ" className={cn('flex animate-rise flex-col gap-6', className)}>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div aria-hidden="true" className="flex flex-col gap-2.5">
          <span className="skeleton block h-[30px] w-[220px] max-w-full" />
          <span className="skeleton block h-4 w-[300px] max-w-full" />
        </div>
        <WritingLogo />
      </div>
      <div aria-hidden="true" className="grid grid-cols-[repeat(auto-fit,minmax(min(180px,100%),1fr))] gap-3.5">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex flex-col gap-2.5 rounded-[18px] border-[1.5px] border-border bg-card px-[18px] py-4">
            <span className="skeleton block h-3 w-3/5" />
            <span className="skeleton block h-[26px] w-2/5" />
            <span className="skeleton block h-3 w-[70%]" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="flex flex-col gap-3.5">
        {[0, 1, 2].map((i) => (
          <div key={i} className="grid grid-cols-[56px_minmax(0,1fr)] gap-4 rounded-[18px] border-[1.5px] border-border bg-card px-5 py-[18px]">
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
        aria-label="Một trang giấy bị xé"
      >
        <g className="origin-top animate-sway [transform-box:fill-box]">
          <path d="M24 10h52l12 12v40l-6 4l-5-3l-6 5l-6-4l-5 4l-6-3l-6 4l-6-4l-6 3l-6-4z" fill="var(--card)" />
          <path d="M76 10v12h12" fill="var(--muted)" />
          <path d="M34 28h30 M34 36h22" stroke="var(--rule)" />
          <path d="M51 46c0-4.5 6.5-4.5 6.5-8.6c0-2.5-2-4.4-4.8-4.4c-2.5 0-4.5 1.5-4.9 3.8" strokeWidth="2.4" />
          <circle cx="51.6" cy="52" r="1.6" fill="var(--icon-ink)" stroke="none" />
        </g>
        <path d="M30 76l-6 4l-5-3 M58 82l6 4l5-3" stroke="var(--muted-foreground)" strokeDasharray="3 4" />
        <path d="M40 90l8-5l8 4l7-4" stroke="var(--muted-foreground)" />
      </svg>
      <p className="text-[13px] leading-5 font-semibold tracking-[0.08em] text-muted-foreground">LỖI 404</p>
      <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Không tìm thấy trang này</h1>
      <p className="max-w-[420px] text-base leading-[26px] text-muted-foreground">
        Đường dẫn có thể bị gõ sai, hoặc trang này đã bị xóa.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-x-[22px] gap-y-3.5">
        <Link to="/today" className={cta}>
          Về Hôm nay
        </Link>
        <Link to="/timeline" className="link-underline text-[15px] font-medium focus-visible:outline-3 focus-visible:outline-ring">
          Mở Dòng thời gian
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

  const code = status ? `Mã lỗi: ${status}` : ''
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
        aria-label="Một tách trà đang bốc hơi"
      >
        <path className="animate-steam" d="M40 10c-3 4 3 6 0 10 M52 6c-3 4 3 6 0 10 M64 10c-3 4 3 6 0 10" />
        {/* Thân tách dùng màu bìa oải hương của logo, cố định ở cả hai chế độ như logo. */}
        <path d="M24 30h56v18a22 22 0 0 1-22 22H46a22 22 0 0 1-22-22z" fill="#CBAAC7" />
        <path d="M80 36h4a8 8 0 0 1 0 16h-5" />
        <path d="M16 76h72" strokeWidth="2.4" />
        <path
          d="M44 46c-2-1.6-3-2.7-3-3.9c0-1 .8-1.8 1.8-1.8c.6 0 1.1.3 1.3.8c.3-.5.7-.8 1.3-.8c1 0 1.8.8 1.8 1.8c0 1.2-1 2.3-3.2 3.9z"
          fill="#F1BD90"
        />
      </svg>
      <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Jotly đang gặp trục trặc</h1>
      <p className="max-w-[440px] text-base leading-[26px] text-muted-foreground">
        Nhật ký của bạn vẫn an toàn. Pha một tách trà rồi thử lại sau ít phút nhé.
      </p>
      <button type="button" className={cn(cta, 'mt-2 cursor-pointer')} disabled={retrying} onClick={retry}>
        {retrying ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
        {retrying ? 'Đang thử…' : 'Thử lại'}
      </button>
      <p role="status" className="text-xs leading-[18px] text-muted-foreground">
        {tries ? `Vẫn chưa được, lần thử ${tries}.${code ? ` ${code}` : ''}` : code}
      </p>
    </Centered>
  )
}
