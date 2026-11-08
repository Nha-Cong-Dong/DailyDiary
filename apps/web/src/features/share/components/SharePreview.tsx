import { KeywordChip } from '@/components/diary/KeywordChip'
import { PHOTO_TINTS } from '@/components/diary/photoTints'
import { ScoreIcon } from '@/components/diary/ScoreIcon'
import { Avatar } from '@/components/layout/Avatar'
import { flagHex, scoreLabel } from '@/lib/catalog'
import { longDateLabel } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useDarkMode } from '@/lib/theme'
import { cn } from '@/lib/utils'
import { hasContent, shapeOf, type ShareSettings } from '../shares'
import { Fold } from './Fold'
import { NotebookPage } from '@/components/diary/NotebookPage'
import { useT } from '@/lib/i18n'
import { rich } from '@/lib/rich'

type SharePreviewProps = {
  entry: DemoEntry
  settings: ShareSettings
  authorName: string
  avatarUrl: string | null
  iconSetId: string
}

/** Thẻ xem trước trong hộp thoại Chia sẻ (B8-Share): trang sổ nhỏ, phần nào tắt thì gập lại ngay khi gạt công tắc. */
export function SharePreview({ entry, settings, authorName, avatarUrl, iconSetId }: SharePreviewProps) {
  const t = useT()
  const dark = useDarkMode()
  const shape = shapeOf(entry)
  const s = settings
  const showScore = s.show_score
  const showSub = s.show_sub_icon && !!entry.sub_icon
  const picked = entry.photos.map((p, i) => ({ ...p, tint: PHOTO_TINTS[i % PHOTO_TINTS.length] })).filter((p) => s.photo_ids.includes(p.id))
  const empty = !hasContent(s, shape)

  return (
    <div aria-live="polite" className="flex flex-col py-1">
      <Fold open={s.show_name}>
        <p className="flex items-center gap-2 pb-3 text-[13px] leading-5">
          <Avatar name={authorName} src={avatarUrl} size={28} />
          <span>
            {rich(t('share:preview.sharedBy', { name: authorName }), { b: (c) => <strong className="font-semibold">{c}</strong> })}
          </span>
        </p>
      </Fold>
      <NotebookPage
        size="preview"
        flag={entry.flag_color ? flagHex(entry.flag_color, dark) : null}
        flagVisible={s.show_flag}
        bodyClassName="pt-1 pr-[18px] pb-[18px] pl-[46px]"
      >
        <Fold open={showScore || showSub}>
          <div className="flex pt-3">
            {showScore ? (
              <span className="relative flex size-[52px] animate-stamp items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper">
                <ScoreIcon iconSetId={iconSetId} score={entry.score} size={36} />
                {showSub ? (
                  <span
                    aria-hidden="true"
                    className="absolute -right-2 -bottom-1 flex size-6 animate-pop items-center justify-center rounded-full border-[1.5px] border-stroke bg-card text-sm leading-none"
                  >
                    {entry.sub_icon}
                  </span>
                ) : null}
              </span>
            ) : showSub ? (
              <span className="flex size-11 animate-pop items-center justify-center rounded-full border-[1.5px] border-stroke bg-paper text-2xl leading-none">
                {entry.sub_icon}
              </span>
            ) : null}
          </div>
        </Fold>
        <p className="mt-3 text-[13px] leading-[18px] text-ink-soft">
          {longDateLabel(entry.entry_date)}
          {showScore ? ` · ${t('share:scoreLine', { score: entry.score, label: scoreLabel(iconSetId, entry.score) })}` : ''}
        </p>
        <Fold open={s.show_title && !!entry.title}>
          <p className="pt-1 text-lg leading-[26px] font-bold [font-variation-settings:'FLAR'_60]">{entry.title}</p>
        </Fold>
        <Fold open={s.show_content && !!entry.content}>
          <p className="ruled line-clamp-3 pt-1.5 text-sm leading-6">{entry.content}</p>
        </Fold>
        <Fold open={s.show_keywords && entry.keywords.length > 0}>
          <div className="flex flex-wrap gap-1.5 pt-2.5">
            {entry.keywords.map((k) => (
              <KeywordChip key={k} size="sm">
                {k}
              </KeywordChip>
            ))}
          </div>
        </Fold>
        <Fold open={picked.length > 0}>
          <div className="grid grid-cols-3 gap-2 pt-3">
            {picked.map((p) => (
              <span
                key={p.id}
                className={cn(
                  'relative flex aspect-[4/3] animate-pop items-center justify-center overflow-hidden rounded-[10px] border-[1.5px] border-stroke text-[11px] text-ink-soft',
                  p.tint,
                )}
              >
                {p.thumbUrl ? <img src={p.thumbUrl} alt="" className="absolute inset-0 size-full object-cover" /> : p.label}
              </span>
            ))}
          </div>
        </Fold>
        {empty ? (
          <p className="mt-3 animate-pop rounded-[12px] border-[1.5px] border-dashed border-line-soft px-3.5 py-3 text-[13px] leading-5 text-ink-soft">
            {t('share:preview.onlyDate')}
          </p>
        ) : null}
      </NotebookPage>
    </div>
  )
}
