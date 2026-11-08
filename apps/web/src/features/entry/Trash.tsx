import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Image, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { MoodMark } from '@/components/diary/MoodMark'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { scoreLabel, type Score } from '@/lib/catalog'
import { longDateLabel, todayIn } from '@/lib/date'
import { tierLimits } from '@/lib/limits'
import { useProfile } from '@/lib/profile'
import { cn } from '@/lib/utils'
import { useT } from '@/lib/i18n'

type TrashItem = components['schemas']['TrashItemOut']

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

/** Trang đã xóa còn khôi phục được (GET /entries/trash). Key dưới ['entries'] nên xóa/khôi phục một trang thì đọc lại. */
function useTrash() {
  return useQuery<TrashItem[]>({
    queryKey: ['entries', 'trash'],
    queryFn: async () => {
      const { data, error, response } = await api.GET('/entries/trash')
      if (error || !data) throw toApiError(response, error)
      return data
    },
  })
}

function useRestore() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (date: string) => {
      const { error, response } = await api.POST('/entries/{day}/restore', { params: { path: { day: date } } })
      if (error) throw toApiError(response, error)
    },
    // Trang quay lại mọi màn: ngày, tháng, lịch, pixels, tìm kiếm, thùng rác.
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['entries'] })
      void client.invalidateQueries({ queryKey: ['calendar'] })
      void client.invalidateQueries({ queryKey: ['pixels'] })
      void client.invalidateQueries({ queryKey: ['search'] })
    },
  })
}

/** Số ngày còn lại tới hạn khôi phục (≤ 0 = hết hạn hôm nay), theo múi giờ hồ sơ. */
function daysLeft(until: string, timeZone: string, today: string): number {
  const end = todayIn(timeZone, new Date(until))
  const days = Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
  return days
}

/**
 * Thùng rác (Hồ sơ › Thùng rác, 24/10/2026; thiết kế chưa có): trang đã xóa trong `entry.restore_days` ngày,
 * khôi phục từng trang. Quá hạn thì trang bị dọn hẳn (Bước 13).
 */
export function Trash() {
  const t = useT()
  const { timeZone, iconSetId } = useProfile()
  const today = todayIn(timeZone)
  const { data, isPending, isError } = useTrash()
  const restore = useRestore()
  const [restored, setRestored] = useState<string | null>(null)
  const days = tierLimits().entry.restore_days
  const items = data ?? []
  const daysLeftLabel = (left: number) => (left <= 0 ? t('entry:trash.expiresToday') : t('entry:trash.daysLeft', { count: left }))

  return (
    <div className="mx-auto flex w-full max-w-[760px] flex-col gap-5">
      <Link
        to="/profile"
        className={cn('press inline-flex h-10 items-center gap-1.5 self-start rounded-[12px] pr-3 pl-2 text-sm font-medium', focusRing)}
      >
        <ArrowLeft className="size-[18px]" aria-hidden="true" />
        {t('entry:trash.profileBack')}
      </Link>
      <div className="flex animate-rise flex-col gap-1.5">
        <h1 className="text-[clamp(26px,3vw,32px)] leading-[1.25] font-bold">{t('entry:trash.title')}</h1>
        <p className="text-[15px] leading-6 text-ink-soft">
          {t('entry:trash.intro', { count: days })}
        </p>
      </div>

      {restored ? (
        <p role="status" className="text-sm font-medium">
          {t('entry:trash.restored', { date: longDateLabel(restored) })}{' '}
          <Link to={`/day/${restored}`} className={cn('underline underline-offset-4', focusRing)}>
            {t('entry:trash.openPage')}
          </Link>
        </p>
      ) : null}
      {restore.isError ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {t('entry:trash.restoreFailed')}
        </p>
      ) : null}

      {isPending ? (
        <p role="status" className="text-ink-soft">
          {t('entry:trash.loading')}
        </p>
      ) : isError ? (
        <Alert variant="destructive">
          <AlertDescription>{t('entry:trash.loadFailed')}</AlertDescription>
        </Alert>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-[18px] border-[1.5px] border-dashed border-line-soft p-8 text-center">
          <Trash2 className="size-8 text-ink-soft" aria-hidden="true" />
          <p className="font-semibold">{t('entry:trash.emptyTitle')}</p>
          <p className="text-sm text-ink-soft">{t('entry:trash.emptyHint', { count: days })}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li
              key={item.entry_date}
              className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[16px] border-[1.5px] border-stroke bg-card p-4 shadow-sm"
            >
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper">
                <MoodMark iconSetId={iconSetId} score={item.score as Score} size={32} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-[13px] text-ink-soft">
                  {longDateLabel(item.entry_date)} · {t('entry:scoreLine', { score: item.score, label: scoreLabel(iconSetId, item.score as Score) })}
                </span>
                <span className="truncate font-heading text-lg font-bold">{item.title ?? t('entry:scoreOnly')}</span>
                <span className="inline-flex items-center gap-2 text-[13px] text-ink-soft">
                  {item.photo_count ? (
                    <span className="inline-flex items-center gap-1">
                      <Image className="size-3.5" aria-hidden="true" /> {t('entry:trash.photoCount', { count: item.photo_count })} ·
                    </span>
                  ) : null}
                  {t('entry:trash.restorable', { left: daysLeftLabel(daysLeft(item.restore_until, timeZone, today)) })}
                </span>
              </span>
              <Button
                variant="secondary"
                size="sm"
                className="h-10 px-3.5"
                disabled={restore.isPending}
                aria-label={t('entry:trash.restoreAria', { date: longDateLabel(item.entry_date) })}
                onClick={() => restore.mutate(item.entry_date, { onSuccess: () => setRestored(item.entry_date) })}
              >
                <RotateCcw aria-hidden="true" /> {t('entry:trash.restore')}
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
