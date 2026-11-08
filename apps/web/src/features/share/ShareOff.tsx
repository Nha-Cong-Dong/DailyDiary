import { Link } from 'react-router'
import { cn } from '@/lib/utils'
import { PublicFrame } from './components/PublicFrame'
import { useT } from '@/lib/i18n'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-focus'

/**
 * Cuốn sổ đã khóa: bìa và khóa giữ màu logo ở cả hai chế độ, nét vẽ theo màu mực. Sổ nghiêng nhẹ khi di chuột lên
 * hình; ổ khóa hiện ra sau, bốn nét "rung" tự vẽ (một lần, không lặp).
 */
function LockedBook() {
  const t = useT()
  return (
    <svg
      width="220"
      height="184"
      viewBox="0 0 120 100"
      fill="none"
      stroke="var(--icon-ink)"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label={t('share:off.bookAria')}
      className="group/book"
    >
      <g className="origin-[50%_100%] transition-[rotate] duration-(--dur-base) ease-out [transform-box:fill-box] motion-reduce:transition-none pointer-fine:group-hover/book:-rotate-3 motion-reduce:pointer-fine:group-hover/book:rotate-0">
        <path d="M30 20h52a8 8 0 0 1 8 8v52a8 8 0 0 1-8 8H30z" fill="#CBAAC7" />
        <path d="M30 20h-2a6 6 0 0 0-6 6v56a6 6 0 0 0 6 6h2z" fill="#B3BCA1" />
        <path d="M90 30v48" stroke="#FFFCF8" strokeWidth="3" />
        <path
          d="M46 38c-3.3-2.3-4.8-4-4.8-5.9c0-1.6 1.2-2.8 2.7-2.8c1 0 1.7.5 2.1 1.2c.4-.7 1.1-1.2 2.1-1.2c1.5 0 2.7 1.2 2.7 2.8c0 1.9-1.5 3.6-4.8 5.9z"
          fill="#F1BD90"
        />
        <path d="M44 88v8l4-3l4 3v-8" fill="#F1BD90" />
      </g>
      <g className="origin-center animate-pop [animation-delay:650ms] [transform-box:fill-box]">
        <path d="M70 58v-6a8 8 0 0 1 16 0v6" />
        <rect x="64" y="57" width="28" height="22" rx="5" fill="#F1BD90" />
        <path d="M78 65v6" />
      </g>
      <path className="draw-in" pathLength={1} d="M14 30l-6-4" />
      <path className="draw-in" pathLength={1} d="M12 46h-7" />
      <path className="draw-in" pathLength={1} d="M104 18l5-5" />
      <path className="draw-in" pathLength={1} d="M108 32h7" />
    </svg>
  )
}

/** Link chia sẻ không mở được: đã tắt, trang đã xóa, hoặc gõ sai (B8-Off). Mọi lý do đều cùng một trang. */
export function ShareOff() {
  const t = useT()
  return (
    <PublicFrame title={t('share:off.pageTitle')} cta={false}>
      <main className="flex flex-1 items-center justify-center px-[clamp(16px,4vw,40px)] pt-16 pb-20">
        <div className="flex max-w-[520px] flex-col items-center gap-4 text-center">
          <div className="relative flex animate-rise items-center justify-center">
            <span aria-hidden="true" className="absolute size-[200px] rounded-full border-[1.5px] border-dashed border-line-soft bg-sunk" />
            <span className="relative inline-flex">
              <LockedBook />
            </span>
          </div>
          <h1 className="mt-3 animate-rise text-title text-balance [animation-delay:500ms]">{t('share:off.title')}</h1>
          <p className="animate-rise text-body leading-[26px] text-pretty text-ink-soft [animation-delay:600ms]">
            {t('share:off.body')}
          </p>
          <div className="mt-3 flex animate-rise flex-wrap items-center justify-center gap-x-[22px] gap-y-3.5 [animation-delay:700ms]">
            <Link
              to="/"
              className={cn(
                'cta inline-flex h-12 items-center rounded-[14px] border-[1.5px] border-stroke bg-primary px-5 text-body font-semibold text-on-primary',
                focusRing,
              )}
            >
              {t('share:off.learn')}
            </Link>
            <Link to="/login" className={cn('link-underline text-body font-medium', focusRing)}>
              {t('share:off.write')}
            </Link>
          </div>
        </div>
      </main>
    </PublicFrame>
  )
}
