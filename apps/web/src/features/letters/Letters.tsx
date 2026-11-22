import { ArrowLeft, Lock, Mail, Send, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { components } from '@/api/schema'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { tierLimits } from '@/lib/limits'
import { useMe } from '@/lib/profile'
import { browserTimeZone, todayIn } from '@/lib/date'
import { intlLocale, useT } from '@/lib/i18n'
import { cn } from '@/lib/utils'
import { useCreateLetter, useDeleteLetter, useLetters } from './useLetters'

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

/**
 * Thư gửi tương lai (GĐ2 giữ chân): ghi thư, hẹn ngày mở (tối đa 1 thư/ngày). Thư còn niêm phong
 * không hiện nội dung; đến ngày mở thì nội dung hiện ra.
 */
export function Letters() {
  const t = useT()
  const { data, isPending, isError } = useLetters()
  const letters = data ?? []

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      <Link
        to="/profile"
        className={cn('press back-nudge inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] pr-3 pl-2 text-sm font-medium', focusRing)}
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        {t('letters:back')}
      </Link>
      <div className="flex scroll-mt-6 animate-rise flex-col gap-1.5">
        <h1 className="text-title">{t('letters:title')}</h1>
        <p className="text-body text-ink-soft">{t('letters:intro')}</p>
      </div>

      <NewLetterForm />

      {isPending ? (
        <p role="status" className="text-ink-soft">
          {t('letters:loading')}
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t('letters:loadError')}</AlertDescription>
        </Alert>
      ) : letters.length === 0 ? (
        <div className="flex animate-pop flex-col items-center gap-3 rounded-[24px] border-[1.5px] border-dashed border-line-soft px-6 py-12 text-center">
          <span className="inline-flex items-center justify-center rounded-full border-[1.5px] border-stroke bg-card p-4">
            <Mail className="size-8" aria-hidden="true" />
          </span>
          <p className="mt-2 text-body text-ink-soft">{t('letters:empty')}</p>
        </div>
      ) : (
        <ul className="flex flex-col">
          {letters.map((letter, i) => (
            <LetterRow key={letter.id} letter={letter} delay={0.05 + i * 0.06} />
          ))}
        </ul>
      )}
    </div>
  )
}

/** Form ghi thư: nội dung + ngày mở (ngày sau hôm nay); lỗi API hiện ngay dưới form. */
function NewLetterForm() {
  const t = useT()
  const { data: me } = useMe()
  const limits = tierLimits(me?.account_tier ?? 'beta')
  const timeZone = me?.timezone ?? browserTimeZone()
  const create = useCreateLetter()
  const [content, setContent] = useState('')
  const today = todayIn(timeZone)
  const [revealDate, setRevealDate] = useState('')
  const [error, setError] = useState<string | null>(null)

  function submit(e: FormEvent) {
    e.preventDefault()
    if (!content.trim() || !revealDate || revealDate <= today || create.isPending) return
    create.mutate(
      { content: content.trim(), reveal_date: revealDate },
      {
        onError: (err) => setError(err.message),
        onSuccess: () => {
          setContent('')
          setRevealDate('')
          setError(null)
        },
      },
    )
  }

  return (
    <form onSubmit={submit} className="animate-rise rounded-[16px] border-[1.5px] border-stroke bg-card p-4 shadow-sm sm:p-5">
      <h2 className="text-heading font-semibold">{t('letters:newTitle')}</h2>
      <p className="mt-1 text-label text-ink-soft">{t('letters:newHint')}</p>
      <div className="mt-4 flex flex-col gap-4 sm:flex-row">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <label htmlFor="letter-content" className="text-label font-medium">
            {t('letters:contentLabel')}
          </label>
          <Textarea
            id="letter-content"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder={t('letters:contentPlaceholder')}
            rows={4}
            maxLength={limits.entry.content_max}
          />
        </div>
        <div className="flex shrink-0 flex-col gap-4 sm:w-44">
          <div className="flex flex-col gap-1.5">
            <label htmlFor="letter-date" className="text-label font-medium">
              {t('letters:dateLabel')}
            </label>
            <input
              id="letter-date"
              type="date"
              value={revealDate}
              min={today}
              onChange={(e) => setRevealDate(e.target.value)}
              className={cn(
                'h-10 rounded-[12px] border-[1.5px] border-stroke bg-paper px-3 text-body nums',
                focusRing,
              )}
            />
          </div>
          <Button type="submit" disabled={!content.trim() || !revealDate || revealDate <= today || create.isPending} className="h-10">
            <Send aria-hidden="true" /> {t('letters:send')}
          </Button>
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between gap-3 text-label">
        <span className="text-ink-soft">{t('letters:onePerDay')}</span>
        <span className="nums text-ink-soft">{content.length}/{limits.entry.content_max}</span>
      </div>
      {error ? (
        <Alert variant="destructive" className="mt-3">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
    </form>
  )
}

function LetterRow({ letter, delay }: { letter: components['schemas']['LetterOut']; delay: number }) {
  const t = useT()
  const del = useDeleteLetter()
  const [confirming, setConfirming] = useState(false)
  const [gone, setGone] = useState(false)
  const sealed = letter.status === 'sealed'
  const locale = intlLocale()
  const dateLabel = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(`${letter.reveal_date}T00:00:00Z`),
  )

  if (gone) return null
  return (
    <li
      className="animate-rise rounded-[16px] border-[1.5px] border-stroke bg-card p-4 shadow-sm sm:p-5"
      style={{ animationDelay: `${delay}s` }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex h-9 items-center gap-1.5 rounded-full border-[1.5px] px-3 text-label font-semibold',
              sealed ? 'border-stroke bg-paper text-ink-soft' : 'border-stroke bg-secondary text-ink',
            )}
          >
            {sealed ? <Lock className="size-3.5" aria-hidden="true" /> : <Mail className="size-3.5" aria-hidden="true" />}
            {sealed ? t('letters:sealedUntil', { date: dateLabel }) : t('letters:openedOn', { date: dateLabel })}
          </span>
        </div>
        {sealed ? (
          <button
            type="button"
            aria-expanded={confirming}
            onClick={() => setConfirming((c) => !c)}
            className={cn(
              'press inline-flex h-9 items-center gap-1.5 rounded-[10px] border-[1.5px] border-stroke px-3 text-label font-semibold',
              focusRing,
            )}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            {t('letters:delete')}
          </button>
        ) : null}
      </div>
      {letter.content ? (
        <p className="mt-3 whitespace-pre-wrap text-body leading-[26px]">{letter.content}</p>
      ) : null}
      {confirming ? (
        <div role="alert" className="mt-3 flex animate-pop flex-wrap items-center justify-between gap-3 rounded-[14px] border-[1.5px] border-danger bg-danger-soft px-4 py-3.5">
          <span className="flex-[1_1_240px] text-label leading-5">{t('letters:deleteConfirm')}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9 bg-card" onClick={() => setConfirming(false)}>
              {t('letters:cancel')}
            </Button>
            <Button
              variant="destructive-solid"
              size="sm"
              className="h-9"
              disabled={del.isPending}
              onClick={() =>
                del.mutate(letter.id, {
                  onSuccess: () => setGone(true),
                })
              }
            >
              {t('letters:deleteConfirmAction')}
            </Button>
          </div>
        </div>
      ) : null}
    </li>
  )
}
