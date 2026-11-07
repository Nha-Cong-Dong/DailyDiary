import { Image as ImageIcon, RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { DayMorph } from './DayMorph'
import { KeywordChip } from './KeywordChip'
import { NotebookPage } from './NotebookPage'
import { ScoreIcon } from './ScoreIcon'

type EntryCardProps = {
  /** `card`: thẻ nhỏ trong danh sách (Dòng thời gian, tìm kiếm). `page`: trang ngày đầy đủ (B7/B10-Day). */
  variant?: 'card' | 'page'
  iconSetId: string
  /** Bỏ trống: vòng icon hiện vòng nét đứt (chưa chấm). */
  score?: Score | null
  subIcon?: string | null
  /** Mã hex bản sáng của cờ hiệu: hiện ruy băng nhỏ màu cờ ở mép trên. */
  flagColor?: string | null
  /** Thẻ: "Thứ Bảy · 17/10". Trang: dùng khi không có `dateParts`. */
  dateLabel: ReactNode
  /** Trang: ngày dạng điền vào chỗ trống "Chủ nhật, ngày 18 tháng 10 năm 2026" (điện thoại: thứ nằm dòng riêng). */
  dateParts?: { weekday: string; day: number | string; month: number | string; year: number | string }
  /** Trang: dòng dưới ngày, vd. "Điểm 4 · Hé nở · ghi đúng ngày" (có thể chứa nút, vd. "Đang chia sẻ"). */
  statusLine?: ReactNode
  /** Tiêu đề; nhận ReactNode để tô sáng chỗ khớp (<mark>). */
  title?: ReactNode
  /**
   * Thẻ hành chữ tiêu đề. Thẻ: mặc định `span` (trong phần đầu). Trang: mặc định `h3` trong vùng kẻ dòng; `h1` thì
   * tiêu đề lớn nằm ngoài vùng kẻ dòng, ngay dưới phần đầu (trang ngày B7).
   */
  titleAs?: 'h1' | 'h2' | 'h3' | 'span'
  /** Nội dung (trang: đầy đủ, chuỗi thì tách đoạn theo dòng trống; thẻ: cắt 2 dòng). Nhận ReactNode để tô sáng. */
  excerpt?: ReactNode
  /** Chữ khi chưa viết; mặc định "Chưa viết gì cho ngày này.". */
  emptyText?: string
  keywords?: string[]
  /** Vẽ một từ khóa (vd. bọc <Link> sang Tìm kiếm). Mặc định là KeywordChip. */
  renderKeyword?: (keyword: string) => ReactNode
  /** Thẻ: số ảnh hiện cạnh từ khóa. */
  photoCount?: number
  /** Trang: ảnh đầu ngày (<EntryPhoto> hoặc <EntryPhotoStack>). */
  photo?: ReactNode
  /** Trang: hàng nút bên phải phần đầu (Sửa / Chia sẻ / Xóa). */
  actions?: ReactNode
  /** Thẻ: dấu "Ghi bù" màu đào cạnh ngày. */
  backfill?: boolean
  /** Trang: hàng cuối sau đường chấm (dấu Đã lưu + "Sửa lần cuối…"). Thẻ: chữ nhỏ cuối thẻ (vd. "Mở để viết thêm"). */
  footer?: ReactNode
  /** Ngày `YYYY-MM-DD`: bọc vòng icon trong <DayMorph> để nối sang trang ngày. */
  morphDate?: string
  /** Nhấc lên khi di chuột (thẻ đặt trong <Link>/<button>). */
  interactive?: boolean
  ariaLabel?: string
  className?: string
}

/**
 * Thẻ nhật ký ngày (B11-DayCard, B7-Day): một trang sổ (NotebookPage: lỗ đục, lề hồng, ruy băng cờ) có dòng kẻ vở;
 * vòng main icon nổi có bóng. Dùng ở mọi nơi hiện một ngày. Phần tử gốc là <article>; muốn bấm được thì bọc trong
 * <Link> (đặt `interactive`).
 */
export function EntryCard({
  variant = 'card',
  iconSetId,
  score,
  subIcon,
  flagColor,
  dateLabel,
  dateParts,
  statusLine,
  title,
  titleAs,
  excerpt,
  emptyText = 'Chưa viết gì cho ngày này.',
  keywords = [],
  renderKeyword,
  photoCount = 0,
  photo,
  actions,
  backfill,
  footer,
  morphDate,
  interactive,
  ariaLabel,
  className,
}: EntryCardProps) {
  const dark = useDarkMode()
  const page = variant === 'page'
  const label = score ? scoreLabel(iconSetId, score) : null
  const ring = (
    <span
      role={score ? 'img' : undefined}
      aria-label={score ? `Điểm ${score}, ${label}` : undefined}
      className={cn(
        'relative flex shrink-0 items-center justify-center rounded-full border-[1.5px] border-stroke bg-card shadow-[3px_3px_0_var(--ink-shadow)]',
        page ? 'size-[68px] md:size-[92px]' : 'size-11',
      )}
    >
      {score ? (
        page ? (
          <>
            <ScoreIcon iconSetId={iconSetId} score={score} size={48} className="md:hidden" />
            <ScoreIcon iconSetId={iconSetId} score={score} size={64} className="max-md:hidden" />
          </>
        ) : (
          <ScoreIcon iconSetId={iconSetId} score={score} size={32} />
        )
      ) : (
        <span aria-hidden="true" className="size-[70%] rounded-full border-[1.5px] border-dashed border-ink-soft" />
      )}
      {score && subIcon ? (
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-2 -bottom-1.5 flex items-center justify-center rounded-full border-[1.5px] border-stroke bg-card leading-none',
            page ? 'size-[30px] text-xl md:size-[38px] md:text-[26px]' : 'size-[22px] text-[11px]',
          )}
        >
          {subIcon}
        </span>
      ) : null}
    </span>
  )
  const ringNode = morphDate ? <DayMorph date={morphDate}>{ring}</DayMorph> : ring
  const flag = flagColor ? flagHex(flagColor, dark) : null
  const chips = keywords.map((k) =>
    renderKeyword ? (
      <li key={k}>{renderKeyword(k)}</li>
    ) : (
      <li key={k}>
        <KeywordChip size="sm">{k}</KeywordChip>
      </li>
    ),
  )
  const lift =
    interactive &&
    'transition-transform duration-200 ease-out pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 motion-reduce:transform-none!'

  if (page) {
    const TitleTag = titleAs ?? 'h3'
    const bigTitle = TitleTag === 'h1'
    const paragraphs =
      typeof excerpt === 'string' ? excerpt.split(/\n{2,}/).map((p, i) => <p key={i} className="whitespace-pre-line">{p}</p>) : excerpt
    return (
      <NotebookPage
        as="article"
        size="page"
        label={ariaLabel}
        flag={flag}
        className={cn(
          'flex flex-col gap-4 py-5 pr-4 pl-[52px] md:gap-[22px] md:pt-[clamp(24px,4vw,36px)] md:pr-[clamp(20px,4vw,40px)] md:pb-8 md:pl-[clamp(64px,9vw,92px)]',
          lift,
          className,
        )}
      >
        <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
          <div className="flex min-w-0 items-center gap-3.5 md:gap-[18px]">
            {ringNode}
            <div className="flex min-w-0 flex-col gap-1.5">
              {dateParts ? (
                <>
                  <p className="text-label text-ink-soft md:hidden">{dateParts.weekday}</p>
                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-1 text-label text-ink-soft">
                    <span className="max-md:hidden">
                      <Blank>{dateParts.weekday}</Blank>
                    </span>
                    <span className="max-md:hidden">, ngày</span>
                    <span className="md:hidden">ngày</span>
                    <Blank wide>{dateParts.day}</Blank>
                    <span>tháng</span>
                    <Blank wide>{dateParts.month}</Blank>
                    <span>năm</span>
                    <Blank>{dateParts.year}</Blank>
                  </p>
                </>
              ) : (
                <p className="text-label text-ink-soft">{dateLabel}</p>
              )}
              {statusLine ? (
                <p className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5 text-label text-ink">{statusLine}</p>
              ) : null}
            </div>
          </div>
          {actions}
        </div>

        {bigTitle && title ? <h1 className="text-[25px] leading-8 font-bold md:text-title">{title}</h1> : null}

        <div className="flex flex-wrap items-start gap-x-7 gap-y-5">
          <div
            className={cn(
              'ruled flex min-w-0 flex-[1_1_300px] flex-col gap-[30px] bg-[position:0_-4px] pb-16 text-reading',
              !excerpt && 'text-ink-faint',
            )}
          >
            {!bigTitle && title ? <TitleTag className="text-heading text-ink">{title}</TitleTag> : null}
            {excerpt ? paragraphs : <p>{emptyText}</p>}
          </div>
          {photo}
        </div>

        {keywords.length ? (
          <ul aria-label="Từ khóa" className="flex flex-wrap gap-2">
            {chips}
          </ul>
        ) : null}
        {footer ? (
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[radial-gradient(circle,var(--line-soft)_0,var(--line-soft)_2.2px,transparent_2.6px)] bg-[length:12px_6px] bg-repeat-x pt-4 text-label">
            {footer}
          </div>
        ) : null}
      </NotebookPage>
    )
  }

  const TitleTag = titleAs ?? 'span'
  return (
    <NotebookPage
      as="article"
      size="card"
      label={ariaLabel}
      flag={flag}
      className={cn('flex flex-col gap-3 py-[18px] pr-5 pl-[62px]', lift, className)}
    >
      <div className="flex items-center gap-3.5">
        {ringNode}
        <div className="flex min-w-0 flex-col">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1.5 text-label text-ink-soft">
            {dateLabel}
            {backfill ? (
              <span className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-stroke bg-peach px-2 py-px text-label font-bold text-on-accent">
                <RotateCcw className="size-[13px]" strokeWidth={2.6} aria-hidden="true" />
                Ghi bù
              </span>
            ) : null}
          </span>
          <TitleTag className="text-[18px] leading-[26px] font-semibold text-ink [font-variation-settings:'FLAR'_60]">
            {title || label || 'Chưa chấm điểm'}
          </TitleTag>
        </div>
      </div>

      <p
        className={cn(
          'ruled line-clamp-2 min-h-14 bg-[position:0_-3px] text-body leading-7',
          excerpt ? 'text-ink' : 'text-ink-faint',
        )}
      >
        {excerpt || emptyText}
      </p>

      {keywords.length || photoCount || footer ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          {keywords.length ? <ul className="flex flex-wrap gap-1.5">{chips}</ul> : null}
          {photoCount ? (
            <span className="inline-flex items-center gap-1.5 text-label text-ink-soft">
              <ImageIcon className="size-4" aria-hidden="true" />
              {photoCount} ảnh
            </span>
          ) : null}
          {footer ? <span className="text-label text-ink-soft">{footer}</span> : null}
        </div>
      ) : null}
    </NotebookPage>
  )
}

/** Chỗ trống điền ngày, gạch chấm bên dưới. */
function Blank({ children, wide }: { children: ReactNode; wide?: boolean }) {
  return (
    <span
      className={cn(
        'border-b-2 border-dotted border-ink-faint px-1.5 text-center text-body leading-[22px] font-bold text-ink nums',
        wide && 'min-w-[34px]',
      )}
    >
      {children}
    </span>
  )
}

/**
 * Ảnh đầu ngày dạng ảnh dán (B11-DayCard): khung giấy nghiêng 3°, băng dính trên đầu, chú thích "1 / 3 ảnh".
 * Không có `src` thì hiện ô có icon ảnh.
 */
export function EntryPhoto({
  src,
  alt,
  caption,
  onClick,
  className,
}: {
  src?: string | null
  alt: string
  caption?: ReactNode
  onClick?: () => void
  className?: string
}) {
  const body = (
    <>
      <span
        aria-hidden="true"
        className="absolute top-[7px] left-1/2 -ml-[13px] h-1.5 w-[26px] -rotate-[8deg] rounded-[3px] border-[1.5px] border-stroke bg-tape"
      />
      {src ? (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="block aspect-[112/92] w-full rounded-[6px] border-[1.5px] border-stroke object-cover"
        />
      ) : (
        <span className="flex aspect-[112/92] w-full items-center justify-center rounded-[6px] border-[1.5px] border-stroke bg-lavender-soft text-ink-soft">
          <ImageIcon className="size-7" aria-hidden="true" />
        </span>
      )}
      {caption ? (
        <figcaption className="flex items-center justify-center gap-1.5 text-label text-ink-soft">
          <ImageIcon className="size-4" aria-hidden="true" />
          {caption}
        </figcaption>
      ) : null}
    </>
  )
  const frame = cn(
    'relative mt-1.5 mr-1 flex w-[150px] flex-none rotate-3 flex-col gap-1.5 rounded-[12px] border-[1.5px] border-stroke bg-card px-2.5 pt-2.5 pb-2 shadow-md',
    className,
  )
  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={alt} className={cn(frame, 'lift cursor-pointer text-left')}>
        <figure className="contents">{body}</figure>
      </button>
    )
  }
  return <figure className={frame}>{body}</figure>
}

/**
 * Ảnh đầu ngày khi có nhiều ảnh (B7-Day): ảnh dán phía trước, hai tờ lót xoay lệch phía sau (chỉ khi `total` > 1).
 * Bấm mở trình xem ảnh.
 */
export function EntryPhotoStack({
  src,
  total,
  onOpen,
  alt = `Xem ảnh, ${total} ảnh`,
  className,
}: {
  src?: string | null
  total: number
  onOpen: () => void
  alt?: string
  className?: string
}) {
  return (
    <div className={cn('relative mt-2 mr-2 mb-2 w-[150px] flex-none self-start', className)}>
      {total > 1
        ? ['-rotate-5', 'rotate-7'].map((r) => (
            <span key={r} aria-hidden="true" className={cn('absolute inset-0 rounded-[12px] border-[1.5px] border-stroke bg-card', r)} />
          ))
        : null}
      <EntryPhoto src={src} alt={alt} caption={`1 / ${total} ảnh`} onClick={onOpen} className="m-0 rotate-2" />
    </div>
  )
}
