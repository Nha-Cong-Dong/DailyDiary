import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, Link2, Link2Off, SlidersHorizontal } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { MoodMark } from '@/components/diary/MoodMark'
import { Toast } from '@/components/diary/Toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel, timeIn } from '@/lib/date'
import { useProfile } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Fold } from './components/Fold'
import { displayUrl, numericDate, pageNumbers, PER_PAGE, partSummary, SHOW_ALL_BELOW, shapeOfListItem, type ShareListItem } from './shares'
import { useCopyLink } from './useCopyLink'
import { useRevokeShare, useShares } from './useShares'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring'

/** Trang "Trang đang chia sẻ" trong Hồ sơ: sao chép, chỉnh phần chia sẻ, tắt link. */
export function SharedList() {
  const { data, isPending, isError } = useShares()
  const revoke = useRevokeShare()
  const { copied, toast, copy, flash } = useCopyLink()
  const [page, setPage] = useState(1)
  const [confirming, setConfirming] = useState<string | null>(null)
  // Link vừa tắt ở trang đang xem: giữ chỗ (gập lại) để danh sách không nhảy, tới khi chuyển trang.
  const [goneHere, setGoneHere] = useState<ShareListItem[]>([])

  const active = data ?? []
  const live = [...active, ...goneHere.filter((g) => !active.some((a) => a.entry_date === g.entry_date))].sort((a, b) =>
    a.entry_date < b.entry_date ? 1 : -1,
  )
  // Ít link thì hiện hết; chỉ phân trang khi danh sách dài.
  const perPage = live.length < SHOW_ALL_BELOW ? Math.max(live.length, 1) : PER_PAGE
  const pages = Math.max(1, Math.ceil(live.length / perPage))
  const current = Math.min(page, pages)
  const slice = live.slice((current - 1) * perPage, current * perPage)
  const gone = new Set(goneHere.map((g) => g.entry_date))

  function go(n: number) {
    setPage(n)
    setGoneHere([])
    setConfirming(null)
    document.getElementById('shares-top')?.scrollIntoView?.({ block: 'start' })
  }

  function turnOff(item: ShareListItem) {
    revoke.mutate(item.entry_date, {
      onSuccess: () => {
        setGoneHere((g) => [...g, item])
        setConfirming(null)
        flash(`Đã tắt link trang ${numericDate(item.entry_date)}`)
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      <Link
        to="/profile"
        className={cn('press inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] pr-3 pl-2 text-sm font-medium hover:[&_svg]:-translate-x-0.5 [&_svg]:transition-transform', focusRing)}
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        Hồ sơ &amp; cài đặt
      </Link>
      <div id="shares-top" className="flex scroll-mt-6 animate-rise flex-col gap-1.5">
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">Trang đang chia sẻ</h1>
        <p className="text-[15px] leading-6 text-muted-foreground">
          Mỗi link chỉ mở đúng một trang, với những phần bạn đã chọn.{' '}
          <span aria-live="polite" className="font-semibold text-foreground">
            {active.length ? `${active.length} trang đang mở link.` : ''}
          </span>
        </p>
      </div>

      {isPending ? (
        <p role="status" className="text-muted-foreground">
          Đang tải…
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>Chưa tải được danh sách. Thử tải lại trang nhé.</AlertDescription>
        </Alert>
      ) : active.length === 0 && goneHere.length === 0 ? (
        <EmptyShares />
      ) : (
        <>
          <ul key={current} className="flex flex-col">
            {slice.map((item, i) => (
              <li key={item.entry_date}>
                <Fold open={!gone.has(item.entry_date)}>
                  <div className="pt-1 pr-2">
                    <ShareCard
                      item={item}
                      delay={0.05 + i * 0.07}
                      copied={copied === item.entry_date}
                      onCopy={() => copy(item.url, item.entry_date)}
                      confirming={confirming === item.entry_date}
                      onAsk={() => setConfirming((c) => (c === item.entry_date ? null : item.entry_date))}
                      onCancel={() => setConfirming(null)}
                      onTurnOff={() => turnOff(item)}
                      busy={revoke.isPending}
                    />
                  </div>
                </Fold>
              </li>
            ))}
          </ul>
          {active.length === 0 ? <EmptyShares /> : null}
          {active.length > 0 && live.length > perPage ? (
            <nav aria-label="Phân trang" className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span aria-live="polite" className="text-[13px] leading-5 text-muted-foreground tabular-nums">
                Hiển thị {(current - 1) * perPage + 1}–{Math.min(current * perPage, live.length)} trong {live.length} trang · Trang{' '}
                {current}/{pages}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <PageButton label="Trang trước" disabled={current <= 1} onClick={() => go(current - 1)}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </PageButton>
                {pageNumbers(current, pages).map((n, i) =>
                  n === 0 ? (
                    <span key={`gap-${i}`} aria-hidden="true" className="min-w-6 text-center text-muted-foreground">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      aria-label={`Trang ${n}`}
                      aria-current={n === current ? 'page' : undefined}
                      onClick={() => go(n)}
                      className={cn(
                        'inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] px-1.5 text-sm tabular-nums transition-[transform,background-color] duration-180 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-0.5 active:scale-[.97]',
                        n === current
                          ? 'border-primary bg-primary font-bold text-primary-foreground shadow-[2px_2px_0_var(--score-3)]'
                          : 'border-border bg-card font-medium',
                        focusRing,
                      )}
                    >
                      {n}
                    </button>
                  ),
                )}
                <PageButton label="Trang sau" disabled={current >= pages} onClick={() => go(current + 1)}>
                  <ChevronRight className="size-4" aria-hidden="true" />
                </PageButton>
              </div>
            </nav>
          ) : null}
        </>
      )}
      <Toast>{toast}</Toast>
    </div>
  )
}

function PageButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  if (disabled) {
    return (
      <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-border text-faint">
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn('press inline-flex size-10 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] border-line bg-card', focusRing)}
    >
      {children}
    </button>
  )
}

function EmptyShares() {
  return (
    <div className="flex animate-pop flex-col items-center gap-3 rounded-[24px] border-[1.5px] border-dashed border-border px-6 py-12 text-center">
      <span className="inline-flex animate-[bob_3.2s_ease-in-out_infinite] items-center justify-center rounded-full border-[1.5px] border-line bg-card p-4">
        <Link2 className="size-8" aria-hidden="true" />
      </span>
      <p className="mt-2 font-heading text-xl leading-7 font-bold">Chưa chia sẻ trang nào</p>
      <p className="max-w-[360px] text-[15px] leading-6 text-muted-foreground">
        Mọi trang đều riêng tư. Mở một trang và bấm Chia sẻ khi bạn muốn.
      </p>
      <Link
        to="/timeline"
        className={cn('lift mt-2 inline-flex h-11 items-center rounded-[12px] border-[1.5px] border-line bg-card px-[18px] text-[15px] font-semibold shadow-ink-sm', focusRing)}
      >
        Đến Dòng thời gian
      </Link>
    </div>
  )
}

type ShareCardProps = {
  item: ShareListItem
  delay: number
  copied: boolean
  onCopy: () => void
  confirming: boolean
  onAsk: () => void
  onCancel: () => void
  onTurnOff: () => void
  busy: boolean
}

function ShareCard({ item, delay, copied, onCopy, confirming, onAsk, onCancel, onTurnOff, busy }: ShareCardProps) {
  const { iconSetId, timeZone } = useProfile()
  const dark = useDarkMode()
  const ids = useId()
  const { shown, hidden } = partSummary(item, shapeOfListItem(item))
  const url = item.url
  const since = new Date(item.created_at)
  const sinceDate = new Intl.DateTimeFormat('vi-VN', { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).format(since)
  const e = { ...item, score: item.score as Score }

  return (
    <article
      aria-labelledby={`${ids}-title`}
      className="group/card mb-[18px] animate-rise overflow-hidden rounded-[20px] border-[1.5px] border-line bg-card shadow-ink transition-[transform,box-shadow] duration-250 hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--ink-shadow)]"
      style={{ animationDelay: `${delay}s` }}
    >
      {e.flag_color ? (
        <div aria-hidden="true" className="h-2 border-b-[1.5px] border-line" style={{ backgroundColor: flagHex(e.flag_color, dark) }} />
      ) : null}
      <div className="grid grid-cols-[56px_minmax(0,1fr)] gap-[18px] px-6 py-5 max-sm:grid-cols-1 max-sm:px-4">
        <span
          role="img"
          aria-label={`Điểm ${e.score}, ${scoreLabel(iconSetId, e.score)}`}
          className="flex size-14 items-center justify-center rounded-full border-[1.5px] border-line bg-background group-hover/card:[&>span>svg]:animate-wiggle"
        >
          <MoodMark iconSetId={iconSetId} score={e.score} subIcon={e.sub_icon} size={40} />
        </span>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-[13px] leading-5 text-muted-foreground">{longDateLabel(item.entry_date)}</span>
            <Link id={`${ids}-title`} to={`/day/${item.entry_date}`} className={cn('link-underline self-start font-heading text-[19px] leading-7 font-bold', focusRing)}>
              {e.title ?? 'Chỉ chấm điểm'}
            </Link>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-xs leading-[18px] font-semibold text-muted-foreground">Người nhận thấy</span>
            <ul className="flex flex-wrap gap-1.5">
              {shown.map((p) => (
                <li key={p} className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-line bg-secondary px-2.5 py-0.5 text-xs leading-[18px] font-medium">
                  <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                  {p}
                </li>
              ))}
            </ul>
            <span className="text-xs leading-[18px] text-muted-foreground">
              {hidden.length ? `Đang ẩn: ${hidden.join(', ')}` : 'Người nhận thấy mọi phần'}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex h-10 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[12px] border-[1.5px] border-line bg-background px-3 text-sm">
              <Link2 className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <span className="truncate select-all">{displayUrl(url)}</span>
            </div>
            <Button variant="outline" size="sm" className="press h-10 rounded-[12px] border-line pr-3.5 pl-3" onClick={onCopy}>
              {copied ? <Check className="size-4 animate-stamp" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
              {copied ? 'Đã chép' : 'Sao chép'}
            </Button>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2.5 border-t-[1.5px] border-dashed border-border pt-3">
            <span className="text-xs leading-[18px] text-muted-foreground">
              Bật lúc {timeIn(timeZone, since)}, {sinceDate}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to={`/day/${item.entry_date}`}
                state={{ share: true }}
                className={cn('press inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-line px-3 text-[13px] font-semibold', focusRing)}
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Chỉnh phần chia sẻ
              </Link>
              <button
                type="button"
                aria-expanded={confirming}
                onClick={onAsk}
                className={cn(
                  'press inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-[1.5px] border-destructive px-3 text-[13px] font-semibold text-destructive',
                  focusRing,
                )}
              >
                <Link2Off className="size-4" aria-hidden="true" />
                Tắt link
              </button>
            </div>
          </div>
          {confirming ? (
            <div role="alert" className="flex animate-pop flex-wrap items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-destructive bg-destructive-soft px-4 py-3.5">
              <span className="flex-[1_1_260px] text-sm leading-[22px]">Tắt link này? Ai đang giữ link sẽ không mở được nữa.</span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="h-[38px] bg-card" onClick={onCancel}>
                  Giữ lại
                </Button>
                <Button variant="destructive-solid" size="sm" className="h-[38px]" disabled={busy} onClick={onTurnOff}>
                  Tắt link
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
