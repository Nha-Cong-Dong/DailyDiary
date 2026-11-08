import { ArrowLeft, Check, ChevronLeft, ChevronRight, Copy, Link2, Link2Off, SlidersHorizontal } from 'lucide-react'
import { useId, useState, type ReactNode } from 'react'
import { Link } from 'react-router'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Toast } from '@/components/diary/Toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { flagHex, scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel, timeIn } from '@/lib/date'
import { intlLocale, useT } from '@/lib/i18n'
import { useProfile } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { Fold } from './components/Fold'
import { NotebookPage } from '@/components/diary/NotebookPage'
import { displayUrl, numericDate, pageNumbers, PER_PAGE, partSummary, SHOW_ALL_BELOW, shapeOfListItem, type ShareListItem } from './shares'
import { useCopyLink } from './useCopyLink'
import { useRevokeShare, useShares } from './useShares'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

/** Trang "Trang đang chia sẻ" trong Hồ sơ (B8-Shared): sao chép, chỉnh phần chia sẻ, tắt link. */
export function SharedList() {
  const t = useT()
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
        flash(t('share:list.turnedOff', { date: numericDate(item.entry_date) }))
      },
    })
  }

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      <Link
        to="/profile"
        className={cn('press back-nudge inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] pr-3 pl-2 text-sm font-medium', focusRing)}
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        {t('share:list.back')}
      </Link>
      <div id="shares-top" className="flex scroll-mt-6 animate-rise flex-col gap-1.5">
        <h1 className="text-title">{t('share:list.title')}</h1>
        <p className="text-body text-ink-soft">
          {t('share:list.intro')}{' '}
          <span aria-live="polite" className="font-semibold text-ink">
            {active.length ? t('share:list.activeCount', { count: active.length }) : ''}
          </span>
        </p>
      </div>

      {isPending ? (
        <p role="status" className="text-ink-soft">
          {t('share:list.loading')}
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t('share:list.loadError')}</AlertDescription>
        </Alert>
      ) : active.length === 0 && goneHere.length === 0 ? (
        <EmptyShares />
      ) : (
        <>
          <ul key={current} className="flex flex-col">
            {slice.map((item, i) => (
              <li key={item.entry_date}>
                <Fold open={!gone.has(item.entry_date)}>
                  <div className="pt-1.5 pr-2">
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
            <nav aria-label={t('share:list.pagination')} className="flex flex-wrap items-center justify-between gap-3 pt-1">
              <span aria-live="polite" className="text-[13px] leading-5 text-ink-soft nums">
                {t('share:list.range', {
                  from: (current - 1) * perPage + 1,
                  to: Math.min(current * perPage, live.length),
                  total: live.length,
                  current,
                  pages,
                })}
              </span>
              <div className="flex flex-wrap items-center gap-1.5">
                <PageButton label={t('share:list.prevPage')} disabled={current <= 1} onClick={() => go(current - 1)}>
                  <ChevronLeft className="size-4" aria-hidden="true" />
                </PageButton>
                {pageNumbers(current, pages).map((n, i) =>
                  n === 0 ? (
                    <span key={`gap-${i}`} aria-hidden="true" className="min-w-6 text-center text-ink-soft">
                      …
                    </span>
                  ) : (
                    <button
                      key={n}
                      type="button"
                      aria-label={t('share:list.pageN', { n })}
                      aria-current={n === current ? 'page' : undefined}
                      onClick={() => go(n)}
                      className={cn(
                        'press inline-flex h-10 min-w-10 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] px-1.5 text-sm nums',
                        n === current
                          ? 'border-primary bg-primary font-bold text-on-primary shadow-[2px_2px_0_var(--peach)]'
                          : 'border-line-soft bg-card font-medium',
                        focusRing,
                      )}
                    >
                      {n}
                    </button>
                  ),
                )}
                <PageButton label={t('share:list.nextPage')} disabled={current >= pages} onClick={() => go(current + 1)}>
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
      <span aria-hidden="true" className="inline-flex size-10 items-center justify-center rounded-[12px] border-[1.5px] border-dashed border-line-soft text-ink-faint">
        {children}
      </span>
    )
  }
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn('press inline-flex size-10 cursor-pointer items-center justify-center rounded-[12px] border-[1.5px] border-stroke bg-card', focusRing)}
    >
      {children}
    </button>
  )
}

function EmptyShares() {
  const t = useT()
  return (
    <div className="flex animate-pop flex-col items-center gap-3 rounded-[24px] border-[1.5px] border-dashed border-line-soft px-6 py-12 text-center">
      <span className="inline-flex items-center justify-center rounded-full border-[1.5px] border-stroke bg-card p-4">
        <Link2 className="size-8" aria-hidden="true" />
      </span>
      <p className="mt-2 text-[22px] leading-[30px] font-bold [font-variation-settings:'FLAR'_60]">{t('share:list.emptyTitle')}</p>
      <p className="max-w-[360px] text-body text-ink-soft">{t('share:list.emptyBody')}</p>
      <Link
        to="/timeline"
        className={cn(
          'lift-sm mt-2 inline-flex h-11 items-center rounded-[12px] border-[1.5px] border-stroke bg-card px-[18px] text-body font-semibold shadow-sm',
          focusRing,
        )}
      >
        {t('share:list.toTimeline')}
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
  const t = useT()
  const { iconSetId, timeZone } = useProfile()
  const dark = useDarkMode()
  const ids = useId()
  const { shown, hidden } = partSummary(item, shapeOfListItem(item))
  const url = item.url
  const since = new Date(item.created_at)
  const sinceDate = new Intl.DateTimeFormat(intlLocale(), { timeZone, day: 'numeric', month: 'numeric', year: 'numeric' }).format(since)
  const e = { ...item, score: item.score as Score }

  return (
    <NotebookPage
      size="list"
      as="article"
      labelledBy={`${ids}-title`}
      flag={e.flag_color ? flagHex(e.flag_color, dark) : null}
      className="mb-[18px] animate-rise transition-[transform,box-shadow] duration-(--dur-fast) ease-out motion-reduce:transform-none! pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-lg"
      style={{ animationDelay: `${delay}s` }}
      bodyClassName="grid grid-cols-[56px_minmax(0,1fr)] gap-[18px] py-5 pr-6 pl-[72px] max-sm:grid-cols-1 max-sm:gap-3.5 max-sm:pr-4"
    >
      <span
        role="img"
        aria-label={t('share:scoreAria', { score: e.score, label: scoreLabel(iconSetId, e.score) })}
        className="relative flex size-14 items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper"
      >
        <ScoreIcon iconSetId={iconSetId} score={e.score} size={40} />
        {e.sub_icon ? (
          <span
            aria-hidden="true"
            className="absolute -right-2 -bottom-1 flex size-7 items-center justify-center rounded-full border-[1.5px] border-stroke bg-card text-[15px] leading-none"
          >
            {e.sub_icon}
          </span>
        ) : null}
      </span>
      <div className="flex min-w-0 flex-col gap-3">
        <div className="flex flex-col gap-0.5">
          <span className="text-[13px] leading-5 text-ink-soft">{longDateLabel(item.entry_date)}</span>
          <Link
            id={`${ids}-title`}
            to={`/day/${item.entry_date}`}
            className={cn("link-underline self-start text-[22px] leading-[30px] font-bold [font-variation-settings:'FLAR'_60]", focusRing)}
          >
            {e.title ?? t('share:list.scoreOnly')}
          </Link>
        </div>
        <div className="flex flex-col gap-1.5">
          <span className="text-label text-ink-soft">{t('share:list.recipientsSee')}</span>
          <ul className="flex flex-wrap gap-1.5">
            {shown.map((p) => (
              <li
                key={p}
                className="inline-flex items-center gap-1 rounded-full border-[1.5px] border-stroke bg-secondary px-2.5 py-0.5 text-[13px] leading-[18px] font-medium"
              >
                <Check className="size-3" strokeWidth={3} aria-hidden="true" />
                {p}
              </li>
            ))}
          </ul>
          <span className="text-[13px] leading-[18px] text-ink-soft">
            {hidden.length ? t('share:list.hidden', { parts: hidden.join(', ') }) : t('share:list.seeAll')}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <div className="flex h-10 min-w-0 flex-[1_1_220px] items-center gap-2 rounded-[12px] border-[1.5px] border-stroke bg-paper px-3 text-sm">
            <Link2 className="size-4 shrink-0 text-ink-soft" aria-hidden="true" />
            <span className="truncate select-all">{displayUrl(url)}</span>
          </div>
          <Button variant="outline" className="h-10 rounded-[12px] pr-3.5 pl-3 text-sm" onClick={onCopy}>
            {copied ? <Check className="size-4 animate-stamp" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            {copied ? t('share:copiedShort') : t('share:copy')}
          </Button>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t-[1.5px] border-dashed border-line-soft pt-3">
          <span className="text-[13px] leading-[18px] text-ink-soft">
            {t('share:list.since', { time: timeIn(timeZone, since), date: sinceDate })}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/day/${item.entry_date}`}
              state={{ share: true }}
              className={cn('press inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-stroke px-3 text-[13px] font-semibold', focusRing)}
            >
              <SlidersHorizontal className="size-4" aria-hidden="true" />
              {t('share:list.editParts')}
            </Link>
            <button
              type="button"
              aria-expanded={confirming}
              onClick={onAsk}
              className={cn(
                'press inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-[10px] border-[1.5px] border-danger px-3 text-[13px] font-semibold text-danger',
                focusRing,
              )}
            >
              <Link2Off className="size-4" aria-hidden="true" />
              {t('share:list.turnOff')}
            </button>
          </div>
        </div>
        {confirming ? (
          <div role="alert" className="flex animate-pop flex-wrap items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-danger bg-danger-soft px-4 py-3.5">
            <span className="flex-[1_1_260px] text-sm leading-[22px]">{t('share:list.confirmOff')}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="h-[38px] bg-card" onClick={onCancel}>
                {t('share:list.keep')}
              </Button>
              <Button variant="destructive-solid" size="sm" className="h-[38px]" disabled={busy} onClick={onTurnOff}>
                {t('share:list.turnOff')}
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </NotebookPage>
  )
}
