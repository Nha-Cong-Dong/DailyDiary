import { cn } from '@/lib/utils'

/** Biểu tượng Jotly: cuốn sổ mở (bìa sage + oải hương), trái tim đào, cây bút. Màu bìa cố định ở cả hai chế độ. */
export function LogoMark({ size = 34, className }: { size?: number; className?: string }) {
  const strokeWidth = size >= 60 ? 1.6 : size >= 40 ? 2 : size >= 30 ? 2.2 : 2.4
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
      aria-hidden="true"
      className={className}
    >
      <path d="M4 10v26c8-.8 15 .2 20 3c5-2.8 12-3.8 20-3V10" />
      <path d="M24 10c-4-3-10-4-17-3.5v25c7-.5 13 .5 17 3.5z" fill="#B3BCA1" />
      <path d="M24 10c4-3 10-4 17-3.5v25c-7-.5-13 .5-17 3.5z" fill="#CBAAC7" />
      <path
        d="M15.5 25.5c-3.8-2.6-5.5-4.6-5.5-6.8c0-1.8 1.4-3.2 3.1-3.2c1.1 0 1.9.6 2.4 1.4c.5-.8 1.3-1.4 2.4-1.4c1.7 0 3.1 1.4 3.1 3.2c0 2.2-1.7 4.2-5.5 6.8z"
        fill="#F1BD90"
      />
      <g transform="translate(32 19) rotate(22)">
        <path d="M-2.2 -10h4.4v12.5l-2.2 3.8l-2.2-3.8z" fill="#F1BD90" />
        <path d="M-2.2 -7h4.4" />
      </g>
    </svg>
  )
}

/** Logo đầy đủ: biểu tượng + chữ "Jotly" (Young Serif). */
export function Logo({ size = 'md', className }: { size?: 'sm' | 'md'; className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <LogoMark size={size === 'md' ? 34 : 28} />
      <span className={cn('font-brand leading-none', size === 'md' ? 'text-2xl' : 'text-xl')}>Jotly</span>
    </span>
  )
}
