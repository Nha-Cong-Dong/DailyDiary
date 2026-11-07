import { cn } from '@/lib/utils'

/**
 * Biểu tượng Jotly (B5-Logo, bản vẽ lại): cuốn sổ mở (bìa sage + oải hương), trái tim đào, cây bút. Màu bìa cố định ở
 * cả hai chế độ; nét mực theo --icon-ink. Chi tiết giảm theo cỡ: ≥ 56px có hai vạch đai bút và ngòi; 32–55px bút trơn;
 * < 32px bỏ trang lót và cây bút, nét dày 3 để vẫn đọc được.
 */
export function LogoMark({ size = 34, className, title }: { size?: number; className?: string; title?: string }) {
  const tier = size >= 56 ? 'full' : size >= 32 ? 'mid' : 'tiny'
  const strokeWidth = size >= 100 ? 1.6 : size >= 56 ? 2 : size >= 40 ? 2.2 : size >= 32 ? 2.4 : 3
  return (
    <svg
      width={size}
      height={(size * 42) / 48}
      viewBox="0 0 48 42"
      fill="none"
      stroke="var(--icon-ink)"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      className={className}
    >
      {tier !== 'tiny' ? <path d="M4 10v26c8-.8 15 .2 20 3c5-2.8 12-3.8 20-3V10" /> : null}
      <path d="M24 10c-4-3-10-4-17-3.5v25c7-.5 13 .5 17 3.5z" fill="#B3BCA1" />
      <path d="M24 10c4-3 10-4 17-3.5v25c-7-.5-13 .5-17 3.5z" fill="#CBAAC7" />
      <path
        d="M15.5 25.5c-3.8-2.6-5.5-4.6-5.5-6.8c0-1.8 1.4-3.2 3.1-3.2c1.1 0 1.9.6 2.4 1.4c.5-.8 1.3-1.4 2.4-1.4c1.7 0 3.1 1.4 3.1 3.2c0 2.2-1.7 4.2-5.5 6.8z"
        fill="#F1BD90"
      />
      {tier !== 'tiny' ? (
        <g transform="translate(32 19) rotate(22)">
          <path d="M-2.2 -10h4.4v12.5l-2.2 3.8l-2.2-3.8z" fill="#F1BD90" />
          {tier === 'full' ? (
            <>
              <path d="M-2.2 -7h4.4 M-2.2 2.5h4.4" />
              <path d="M-.9 4.7l.9 1.6l.9-1.6z" fill="var(--icon-ink)" />
            </>
          ) : null}
        </g>
      ) : null}
    </svg>
  )
}

const SIZES = {
  sm: { mark: 28, text: 'text-xl' },
  md: { mark: 34, text: 'text-[22px]' },
  lg: { mark: 60, text: 'text-[44px]' },
} as const

/** Logo đầy đủ: biểu tượng + chữ "Jotly" (Young Serif, chỉ dùng ở đây). */
export function Logo({ size = 'md', className }: { size?: keyof typeof SIZES; className?: string }) {
  const s = SIZES[size]
  return (
    <span className={cn('inline-flex items-center', size === 'lg' ? 'gap-3' : 'gap-2', className)}>
      <LogoMark size={s.mark} />
      <span className={cn('font-brand leading-none tracking-[-0.01em]', s.text)}>Jotly</span>
    </span>
  )
}
