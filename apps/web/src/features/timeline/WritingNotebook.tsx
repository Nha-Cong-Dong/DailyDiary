import { cn } from '@/lib/utils'

/** Cuốn sổ mở, cây bút đang viết (thiết kế B8 · hôm nay chưa viết, B9 · màn trống). */
export function WritingNotebook({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 120 90"
      fill="none"
      stroke="var(--line)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn('shrink-0', className)}
    >
      <path d="M12 22v52c18-1.6 32 .4 48 6c16-5.6 30-7.6 48-6V22" />
      <path d="M60 22c-10-6-24-8-42-7v52c18-1 32 1 42 7z" fill="#B3BCA1" />
      <path d="M60 22c10-6 24-8 42-7v52c-18-1-32 1-42 7z" fill="var(--card)" />
      <path className="draw-in" pathLength={1} d="M70 36c6-1 14-1 22 0 M70 46c6-1 12-1 18 0" stroke="var(--muted-foreground)" />
      <g transform="translate(86 44) rotate(28)">
        <path d="M-3 -16h6v18l-3 5l-3-5z" fill="#F1BD90" />
        <path d="M-3 -11h6" />
      </g>
      <path
        d="M22 8l1.4 3.6L27 13l-3.6 1.4L22 18l-1.4-3.6L17 13l3.6-1.4z"
        fill="#F1BD90"
        strokeWidth="1.4"
      />
    </svg>
  )
}
