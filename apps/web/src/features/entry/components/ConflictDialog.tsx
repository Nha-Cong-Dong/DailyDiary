import { BottomSheet, SheetActions } from '@/components/diary/BottomSheet'
import { Button } from '@/components/ui/button'
import { scoreLabel } from '@/lib/catalog'
import { useProfile } from '@/lib/profile'
import type { DraftFields } from '@/lib/storage'
import type { Conflict } from '../useAutosave'
import { dateTimeLabel } from '../entryDraft'
import { useT } from '@/lib/i18n'

function Version({ heading, fields, meta }: { heading: string; fields: DraftFields | null; meta: string }) {
  const t = useT()
  const { iconSetId } = useProfile()
  const first = fields?.content.split(/\n+/)[0]?.trim()
  return (
    <section className="flex min-w-0 flex-1 flex-col gap-1.5 rounded-[16px] border-[1.5px] border-stroke bg-paper p-4">
      <h3 className="font-sans text-[13px] leading-5 font-semibold text-ink-soft">{heading}</h3>
      {fields ? (
        <>
          <p className="text-[13px] leading-5 text-ink-soft tabular-nums">
            {t('entry:scoreLine', { score: fields.score, label: scoreLabel(iconSetId, fields.score as 1 | 2 | 3 | 4 | 5) })}
          </p>
          <p className="font-heading text-[17px] leading-6 font-bold">{fields.title.trim() || t('entry:conflict.untitled')}</p>
          {first ? <p className="line-clamp-3 text-sm leading-[22px] text-ink-soft">{first}</p> : null}
        </>
      ) : (
        <p className="text-sm leading-[22px] text-ink-soft">{t('entry:conflict.deleted')}</p>
      )}
      <p className="mt-auto pt-1 text-xs leading-[18px] text-ink-soft tabular-nums">{meta}</p>
    </section>
  )
}

/** Hai tab (hoặc hai máy) cùng sửa một trang: chọn giữ bản đang gõ ở đây hay dùng bản vừa lưu ở nơi khác (F-06). */
export function ConflictDialog({
  conflict,
  onKeepMine,
  onTakeTheirs,
}: {
  conflict: Conflict | null
  onKeepMine: () => void
  onTakeTheirs: () => void
}) {
  const t = useT()
  const { timeZone } = useProfile()
  const theirs = conflict?.theirs ?? null
  return (
    <BottomSheet
      open={conflict !== null}
      // Phải chọn một bản: Esc hay chạm ra ngoài không đóng.
      onOpenChange={() => {}}
      layout="responsive"
      role="alertdialog"
      title={t('entry:conflict.title')}
      description={t('entry:conflict.description')}
      showDescription
      className="md:max-w-[min(640px,calc(100%-2rem))]"
    >
      {conflict ? (
        <div className="flex flex-col gap-3 md:flex-row">
          <Version heading={t('entry:conflict.mine')} fields={conflict.mine} meta={t('entry:conflict.mineMeta')} />
          <Version
            heading={t('entry:conflict.theirs')}
            fields={theirs ? { ...theirs, title: theirs.title ?? '', content: theirs.content ?? '' } : null}
            meta={theirs ? t('entry:conflict.theirsMeta', { time: dateTimeLabel(timeZone, theirs.updated_at, false) }) : ''}
          />
        </div>
      ) : null}
      <SheetActions>
        <Button variant="outline" onClick={onTakeTheirs}>
          {t('entry:conflict.takeTheirs')}
        </Button>
        <Button onClick={onKeepMine}>{t('entry:conflict.keepMine')}</Button>
      </SheetActions>
    </BottomSheet>
  )
}
