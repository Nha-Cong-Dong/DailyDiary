import type { PhotoItem } from '@/components/diary/PhotoViewer'
import type { Score } from '@/lib/catalog'
import { dayOfMonth, timeIn, todayIn, type DateString } from '@/lib/date'
import type { DayEntry, EntryWrite } from './entries'

/** Các trường sửa được của một trang (F-01). */
export type EntryDraft = {
  score: Score
  sub_icon: string | null
  flag_color: string | null
  title: string
  content: string
  keywords: string[]
  photos: PhotoItem[]
}

export type DraftField = keyof EntryDraft

const FIELDS: DraftField[] = ['score', 'sub_icon', 'flag_color', 'title', 'content', 'keywords', 'photos']
const LABEL: Record<DraftField, string> = {
  score: 'điểm',
  sub_icon: 'sub icon',
  flag_color: 'cờ hiệu',
  title: 'tiêu đề',
  content: 'nội dung',
  keywords: 'từ khóa',
  photos: 'ảnh',
}

export function draftOf(entry: DayEntry): EntryDraft {
  return {
    score: entry.score,
    sub_icon: entry.sub_icon,
    flag_color: entry.flag_color,
    title: entry.title ?? '',
    content: entry.content ?? '',
    keywords: entry.keywords,
    photos: entry.photos,
  }
}

function same(field: DraftField, a: EntryDraft, b: EntryDraft): boolean {
  if (field === 'photos') return a.photos.map((p) => p.id).join('|') === b.photos.map((p) => p.id).join('|')
  if (field === 'keywords') return a.keywords.join('|') === b.keywords.join('|')
  return a[field] === b[field]
}

/** Các trường đã khác bản đã lưu, theo thứ tự trên màn. */
export function changedFields(saved: EntryDraft, current: EntryDraft): DraftField[] {
  return FIELDS.filter((f) => !same(f, saved, current))
}

/** ["title", "content", "photos"] → "tiêu đề, nội dung và ảnh". */
export function fieldsLabel(fields: DraftField[]): string {
  const names = fields.map((f) => LABEL[f])
  return names.length > 1 ? `${names.slice(0, -1).join(', ')} và ${names.at(-1)}` : (names[0] ?? '')
}

/**
 * Thân PUT /entries/{day} từ bản nháp. `updatedAt` = bản đang sửa (null khi tạo mới).
 * Ảnh không đi qua PUT: thêm/xóa/sắp xếp bằng API ảnh riêng (uploadPhoto.ts).
 */
export function toWrite(draft: Omit<EntryDraft, 'photos'>, updatedAt: string | null): EntryWrite {
  const text = (s: string) => s.normalize('NFC').trim() || null
  return {
    score: draft.score,
    sub_icon: draft.sub_icon,
    flag_color: draft.flag_color,
    title: text(draft.title),
    content: text(draft.content),
    keywords: draft.keywords,
    ...(updatedAt ? { updated_at: updatedAt } : {}),
  }
}

/** Ghi các trường của bản nháp vào trang; chuỗi rỗng lưu thành null, nội dung chuẩn hóa NFC. */
export function applyDraft(entry: DayEntry, draft: EntryDraft, now = new Date()): DayEntry {
  const text = (s: string) => s.normalize('NFC').trim() || null
  return {
    ...entry,
    score: draft.score,
    sub_icon: draft.sub_icon,
    flag_color: draft.flag_color,
    title: text(draft.title),
    content: text(draft.content),
    keywords: draft.keywords,
    photos: draft.photos,
    updated_at: now.toISOString(),
  }
}

/** Số ngày lịch từ `date` tới `today` (0 = hôm nay). */
export function daysBetween(date: DateString, today: DateString): number {
  return Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${date}T00:00:00Z`)) / 86_400_000)
}

/**
 * Trang ghi bù: được tạo sau ngày của chính nó (created_at đổi sang múi giờ người dùng rơi vào ngày sau `entry_date`).
 * Vẫn được tô màu ở lịch và Year in Pixels, nhưng không nối lại chuỗi ngày liên tiếp (thiết kế B9).
 */
export function isBackfilled(entry: Pick<DayEntry, 'entry_date' | 'created_at'>, timeZone: string): boolean {
  return todayIn(timeZone, new Date(entry.created_at)) > entry.entry_date
}

/** "21:20, 16/10/2026" theo múi giờ hồ sơ; bỏ năm khi `withYear` là false. */
export function dateTimeLabel(timeZone: string, iso: string, withYear = true): string {
  const at = new Date(iso)
  const [y, m, d] = todayIn(timeZone, at).split('-').map(Number)
  return `${timeIn(timeZone, at)}, ${d}/${m}${withYear ? `/${y}` : ''}`
}

/** "16/10". */
export function dayMonth(date: string): string {
  return `${dayOfMonth(date)}/${Number(date.slice(5, 7))}`
}
