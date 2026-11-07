import type { CSSProperties, ReactNode } from 'react'
import { Slot } from 'radix-ui'
import { cn } from '@/lib/utils'

/**
 * Cỡ khung trang sổ, theo nơi dùng:
 * - `preview`: xem trước trong hộp Chia sẻ (B8-Share), nhỏ, bóng 2px.
 * - `card`: thẻ một ngày trong danh sách / Year in Pixels (B11-DayCard thẻ nhỏ), bóng 4px.
 * - `result`: kết quả tìm kiếm (B7/B10-Search): nhỏ trên điện thoại, bằng `card` từ md, bóng 2px.
 * - `list`: trang đang chia sẻ (B8-Shared), bóng 4px.
 * - `public`: trang người nhận link (B8/B10-Public), đổi cỡ ở sm.
 * - `page`: trang ngày đầy đủ (B7-Day, B10-Day, B11-DayCard trang), đổi cỡ ở md.
 */
export type NotebookSize = 'preview' | 'card' | 'result' | 'list' | 'public' | 'page'

type FrameSpec = {
  root: string
  holes: string
  hole: string
  count: number
  margin: string
  ribbon: (color: string) => ReactNode
}

const FRAME: Record<NotebookSize, FrameSpec> = {
  preview: {
    root: 'rounded-[18px] shadow-sm',
    holes: 'top-[26px] bottom-[26px] left-3',
    hole: 'size-3',
    count: 2,
    margin: 'left-[34px]',
    ribbon: (c) => <FlagRibbon color={c} size="sm" className="-top-1 right-[18px]" />,
  },
  card: {
    root: 'rounded-[18px] shadow-md',
    holes: 'top-[30px] bottom-[30px] left-[18px]',
    hole: 'size-3.5',
    count: 2,
    margin: 'left-11',
    ribbon: (c) => <FlagRibbon color={c} size="md" className="-top-[5px] right-[22px]" />,
  },
  result: {
    root: 'rounded-[16px] shadow-sm md:rounded-[18px]',
    holes: 'top-[22px] bottom-[22px] left-3 md:top-[30px] md:bottom-[30px] md:left-[18px]',
    hole: 'size-3 md:size-3.5',
    count: 2,
    margin: 'left-[34px] md:left-11',
    ribbon: (c) => <FlagRibbon color={c} size="md" className="-top-[5px] right-4 md:right-5" />,
  },
  list: {
    root: 'rounded-[22px] shadow-md',
    holes: 'top-9 bottom-9 left-5',
    hole: 'size-4',
    count: 2,
    margin: 'left-[52px]',
    ribbon: (c) => <FlagRibbon color={c} size="md" className="-top-[5px] right-[26px]" />,
  },
  public: {
    root: 'rounded-[24px] shadow-lg max-sm:rounded-[20px] max-sm:shadow-md',
    holes:
      'top-14 bottom-14 left-[calc(clamp(64px,9vw,92px)/2-18px)] max-sm:top-10 max-sm:bottom-10 max-sm:left-3.5',
    hole: 'size-[18px] max-sm:size-3.5',
    count: 4,
    margin: 'left-[calc(clamp(64px,9vw,92px)-24px)] max-sm:left-[38px]',
    ribbon: (c) => (
      <>
        <FlagRibbon color={c} size="lg" className="-top-1.5 right-9 max-sm:hidden" />
        <FlagRibbon color={c} size="tall" className="-top-[5px] right-[22px] sm:hidden" />
      </>
    ),
  },
  page: {
    root: 'rounded-[20px] shadow-md md:rounded-lg md:shadow-lg',
    holes:
      'top-10 bottom-10 left-3.5 md:top-14 md:bottom-14 md:left-[calc(clamp(64px,9vw,92px)/2-18px)]',
    hole: 'size-[18px]',
    count: 4,
    margin: 'left-[38px] md:left-[calc(clamp(64px,9vw,92px)-24px)]',
    ribbon: (c) => <FlagRibbon color={c} size="lg" className="-top-1.5 right-[34px]" />,
  },
}

type NotebookPageProps = {
  size: NotebookSize
  /** Phần tử gốc; `article` khi thẻ là một trang nhật ký độc lập. */
  as?: 'div' | 'article' | 'li'
  labelledBy?: string
  label?: string
  /** Màu cờ đã quy đổi theo chế độ sáng/tối (`flagHex(hex, dark)`); không có thì không có ruy băng. */
  flag?: string | null
  /** `false`: ruy băng mờ đi (xem trước khi tắt Màu cờ). */
  flagVisible?: boolean
  className?: string
  /** Bọc nội dung trong <div className={bodyClassName}>; bỏ trống thì đặt con thẳng vào khung. */
  bodyClassName?: string
  style?: CSSProperties
  /**
   * Dùng phần tử con duy nhất làm khung (vd. <Link> của cả thẻ): lỗ đục, lề, ruy băng chèn vào trong nó.
   * Không dùng cùng `bodyClassName`.
   */
  asChild?: boolean
  children: ReactNode
}

/**
 * Khung "trang sổ" dùng chung (B11-DayCard, B7, B8): nền card, viền mực 1.5px, lỗ đục bên trái, lề hồng, ruy băng màu
 * cờ ở mép trên phải. Đệm trong (padding) do nơi dùng đặt qua `className`, chừa chỗ bên trái cho lỗ đục và lề.
 */
export function NotebookPage({
  size,
  as: Tag = 'div',
  labelledBy,
  label,
  flag,
  flagVisible = true,
  className,
  bodyClassName,
  style,
  asChild = false,
  children,
}: NotebookPageProps) {
  const f = FRAME[size]
  const Root = asChild ? Slot.Root : Tag
  return (
    <Root
      aria-labelledby={labelledBy}
      aria-label={label}
      style={style}
      className={cn('relative border-[1.5px] border-stroke bg-card text-ink', f.root, className)}
    >
      <span aria-hidden="true" className={cn('absolute flex flex-col justify-between', f.holes)}>
        {Array.from({ length: f.count }, (_, i) => (
          <span
            key={i}
            className={cn(
              'shrink-0 rounded-full border-[1.5px] border-stroke bg-paper shadow-[inset_2px_2px_0_var(--hole-in)]',
              f.hole,
            )}
          />
        ))}
      </span>
      <span aria-hidden="true" className={cn('absolute inset-y-0 w-0.5 bg-notebook-margin', f.margin)} />
      {flag ? (
        <span
          aria-hidden="true"
          className="transition-opacity duration-(--dur-base) ease-out"
          style={{ opacity: flagVisible ? 1 : 0 }}
        >
          {f.ribbon(flag)}
        </span>
      ) : null}
      {asChild ? (
        <Slot.Slottable>{children}</Slot.Slottable>
      ) : bodyClassName !== undefined ? (
        <div className={bodyClassName}>{children}</div>
      ) : (
        children
      )}
    </Root>
  )
}

const RIBBON = {
  sm: { w: 10, h: 18, d: 'M0.75 0.75H9.25V17.25L5 13.45L0.75 17.25Z' },
  md: { w: 12, h: 22, d: 'M0.75 0.75H11.25V21.25L6 16.69L0.75 21.25Z' },
  tall: { w: 12, h: 24, d: 'M0.75 0.75H11.25V23.25L6 18.75L0.75 23.25Z' },
  lg: { w: 14, h: 28, d: 'M0.75 0.75H13.25V27.25L7 21.93L0.75 27.25Z' },
} as const

/**
 * Ruy băng cờ hiệu (bookmark) màu cờ, viền mực, đặt tuyệt đối ở mép trên phải của khung cha (`relative`).
 * Vị trí (`-top-* right-*`) truyền qua `className`. `color`: mã màu đã quy đổi theo chế độ.
 */
export function FlagRibbon({
  color,
  size = 'md',
  className,
}: {
  color: string
  size?: keyof typeof RIBBON
  className?: string
}) {
  const r = RIBBON[size]
  return (
    <svg
      aria-hidden="true"
      width={r.w}
      height={r.h}
      viewBox={`0 0 ${r.w} ${r.h}`}
      className={cn('absolute z-[2] overflow-visible', className)}
    >
      <path d={r.d} fill={color} className="stroke-stroke" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  )
}
