import { KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { Avatar } from '@/components/layout/Avatar'
import { flagHex, scoreLabel } from '@/lib/catalog'
import { longDateLabel } from '@/lib/date'
import type { DemoEntry } from '@/lib/demo'
import { useDarkMode } from '@/lib/theme'
import { hasContent, shapeOf, type ShareSettings } from '../shares'
import { Fold } from './Fold'

// Ô ảnh giữ chỗ cùng tông với PhotoTile, khi trang chưa có link xem ảnh (dữ liệu mẫu).
const TINTS = ['bg-[#E7DCEB]', 'bg-[#F6E3D6]', 'bg-[#DCE6D5]']

type SharePreviewProps = {
  entry: DemoEntry
  settings: ShareSettings
  authorName: string
  avatarUrl: string | null
  iconSetId: string
}

/** Thẻ xem trước trong hộp thoại Chia sẻ: phần nào tắt thì gập lại ngay khi gạt công tắc. */
export function SharePreview({ entry, settings, authorName, avatarUrl, iconSetId }: SharePreviewProps) {
  const dark = useDarkMode()
  const shape = shapeOf(entry)
  const s = settings
  const showScore = s.show_score
  const showSub = s.show_sub_icon && !!entry.sub_icon
  const picked = entry.photos.map((p, i) => ({ ...p, tint: TINTS[i % TINTS.length] })).filter((p) => s.photo_ids.includes(p.id))
  const empty = !hasContent(s, shape)

  return (
    <div aria-live="polite" className="flex flex-col py-1">
      <Fold open={s.show_name}>
        <p className="flex items-center gap-2 pb-3 text-[13px] leading-5">
          <Avatar name={authorName} src={avatarUrl} size={28} />
          <span>
            <strong className="font-semibold">{authorName}</strong> chia sẻ một trang nhật ký
          </span>
        </p>
      </Fold>
      <div className="overflow-hidden rounded-[18px] border-[1.5px] border-line bg-card shadow-ink-sm">
        <Fold open={s.show_flag && !!entry.flag_color}>
          <div
            className="h-11 border-b-[1.5px] border-line"
            style={entry.flag_color ? { backgroundColor: flagHex(entry.flag_color, dark) } : undefined}
          />
        </Fold>
        <div className="px-[18px] pt-1 pb-[18px]">
          <Fold open={showScore || showSub}>
            <div className="flex pt-3">
              {showScore ? (
                <span className="flex size-[52px] animate-stamp items-center justify-center rounded-full border-[1.5px] border-line bg-background">
                  <MoodMark iconSetId={iconSetId} score={entry.score} subIcon={showSub ? entry.sub_icon : null} size={36} />
                </span>
              ) : showSub ? (
                <span className="flex size-11 animate-pop items-center justify-center rounded-full border-[1.5px] border-line bg-background text-2xl leading-none">
                  {entry.sub_icon}
                </span>
              ) : null}
            </div>
          </Fold>
          <p className="mt-3 text-xs leading-[18px] text-muted-foreground">
            {longDateLabel(entry.entry_date)}
            {showScore ? ` · Điểm ${entry.score} · ${scoreLabel(iconSetId, entry.score)}` : ''}
          </p>
          <Fold open={s.show_title && !!entry.title}>
            <p className="pt-1 font-heading text-lg leading-[26px] font-bold">{entry.title}</p>
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
                  className={`relative flex aspect-[4/3] animate-pop items-center justify-center overflow-hidden rounded-[10px] border-[1.5px] border-line text-[11px] text-[#6A6255] ${p.tint}`}
                >
                  {p.thumbUrl ? <img src={p.thumbUrl} alt="" className="absolute inset-0 size-full object-cover" /> : p.label}
                </span>
              ))}
            </div>
          </Fold>
          {empty ? (
            <p className="mt-3 animate-pop rounded-[12px] border-[1.5px] border-dashed border-border px-3.5 py-3 text-[13px] leading-5 text-muted-foreground">
              Người nhận chỉ thấy ngày viết. Bật thêm phần muốn chia sẻ.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  )
}
