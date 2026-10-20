import type { components } from '@/api/schema'
import type { DemoEntry } from '@/lib/demo'

/**
 * Chia sẻ một trang (thiết kế B8). Mỗi ngày có tối đa một link đang bật; người viết chọn từng phần người nhận được xem.
 * Tắt link = thu hồi token; bật lại tạo token mới. Tên trường theo API dự kiến (snake_case) để lúc nối API chỉ đổi queryFn.
 */
type Schemas = components['schemas']

/** Phần người viết chọn (PUT /entries/{date}/share); `photo_ids` rỗng = không chia sẻ ảnh. */
export type ShareSettings = Schemas['ShareUpdate']
export type ShareParts = Omit<ShareSettings, 'photo_ids'>

/** Link đang bật của một ngày (GET/PUT /entries/{date}/share; GET trả null khi chưa bật). `url` do backend dựng. */
export type ShareLink = Schemas['ShareOut']

/** Một dòng trong "Trang đang chia sẻ" (GET /shares): link kèm tóm tắt trang, không kèm nội dung. */
export type ShareListItem = Schemas['SharedEntryOut']

/** Trang người nhận xem (GET /public/shares/{token}): trường không được chọn VẮNG MẶT khỏi JSON. */
export type PublicShare = Schemas['PublicShareOut']

export type PartKey = 'name' | 'score' | 'sub_icon' | 'flag' | 'title' | 'content' | 'keywords'

export const PART_LABELS: Record<PartKey, string> = {
  name: 'Tên của bạn',
  score: 'Điểm & icon chính',
  sub_icon: 'Sub icon',
  flag: 'Màu cờ',
  title: 'Tiêu đề',
  content: 'Nội dung',
  keywords: 'Từ khóa',
}

/** Nhãn ngắn trong danh sách "Người nhận thấy" / "Đang ẩn". */
export const PART_SHORT: Record<PartKey, string> = {
  name: 'Tên',
  score: 'Điểm & icon',
  sub_icon: 'Sub icon',
  flag: 'Màu cờ',
  title: 'Tiêu đề',
  content: 'Nội dung',
  keywords: 'Từ khóa',
}

export const PART_KEYS: PartKey[] = ['name', 'score', 'sub_icon', 'flag', 'title', 'content', 'keywords']

export function partField(key: PartKey): keyof ShareParts {
  return `show_${key}` as keyof ShareParts
}

/** Thứ trang này có: phần nào trống (vd. không có cờ) thì không hiện công tắc. */
export type EntryShape = {
  sub_icon: boolean
  flag: boolean
  title: boolean
  content: boolean
  keywords: boolean
  photos: number
}

export function shapeOf(entry: Pick<DemoEntry, 'sub_icon' | 'flag_color' | 'title' | 'content' | 'keywords' | 'photos'>): EntryShape {
  return {
    sub_icon: !!entry.sub_icon,
    flag: !!entry.flag_color,
    title: !!entry.title,
    content: !!entry.content,
    keywords: entry.keywords.length > 0,
    photos: entry.photos.length,
  }
}

export function shapeOfListItem(e: ShareListItem): EntryShape {
  return {
    sub_icon: !!e.sub_icon,
    flag: !!e.flag_color,
    title: !!e.title,
    content: e.has_content,
    keywords: e.keyword_count > 0,
    photos: e.photo_count,
  }
}

/** Các phần có công tắc cho trang này. Tên và điểm luôn có (điểm là bắt buộc). */
export function availableParts(shape: EntryShape): PartKey[] {
  return PART_KEYS.filter((k) => k === 'name' || k === 'score' || shape[k])
}

/**
 * Mặc định khi bật link lần đầu: riêng tư trước. Tên, từ khóa và ảnh tắt; người viết bật thêm nếu muốn.
 */
export function defaultSettings(): ShareSettings {
  return {
    show_name: false,
    show_score: true,
    show_sub_icon: true,
    show_flag: true,
    show_title: true,
    show_content: true,
    show_keywords: false,
    photo_ids: [],
  }
}

/** Phần thật sự hiện cho người nhận: đã bật và trang có dữ liệu đó. */
export function shownParts(settings: ShareParts, shape: EntryShape): PartKey[] {
  return availableParts(shape).filter((k) => settings[partField(k)])
}

/** Có ít nhất một phần nội dung ngoài ngày viết và tên (ngược lại không cho sao chép link). */
export function hasContent(settings: ShareSettings, shape: EntryShape): boolean {
  return shownParts(settings, shape).some((k) => k !== 'name') || (shape.photos > 0 && settings.photo_ids.length > 0)
}

/** Nhãn "Người nhận thấy" và "Đang ẩn" cho một link. */
export function partSummary(settings: ShareSettings, shape: EntryShape): { shown: string[]; hidden: string[] } {
  const avail = availableParts(shape)
  const shown = avail.filter((k) => settings[partField(k)]).map((k) => PART_SHORT[k])
  const hidden = avail.filter((k) => !settings[partField(k)]).map((k) => PART_SHORT[k])
  if (shape.photos > 0) {
    const n = Math.min(settings.photo_ids.length, shape.photos)
    if (n > 0) shown.push(`${n}/${shape.photos} ảnh`)
    else hidden.push('Ảnh')
  }
  return { shown, hidden }
}

/**
 * Dựng trang người nhận xem từ trang gốc và phần đã chọn, giống GET /public/shares/{token}:
 * phần không chọn (hoặc trang không có) thì vắng mặt; ảnh chỉ có số lượng tới Bước 7.
 */
export function publicView(entry: DemoEntry, link: ShareSettings, authorName: string, iconSetId: string): PublicShare {
  const out: PublicShare = { entry_date: entry.entry_date }
  if (link.show_name) out.author_name = authorName
  if (link.show_score) {
    out.score = entry.score
    out.icon_set_id = iconSetId
  }
  if (link.show_sub_icon && entry.sub_icon) out.sub_icon = entry.sub_icon
  if (link.show_flag && entry.flag_color) out.flag_color = entry.flag_color
  if (link.show_title && entry.title) out.title = entry.title
  if (link.show_content && entry.content) out.content = entry.content
  if (link.show_keywords && entry.keywords.length) out.keywords = entry.keywords
  const photos = entry.photos.filter((p) => link.photo_ids.includes(p.id)).length
  if (photos) out.photo_count = photos
  return out
}

/** Link đầy đủ để sao chép: cùng origin với web app, đường dẫn /s/{token}. */
export function shareUrl(token: string, origin: string = window.location.origin): string {
  return `${origin}/s/${token}`
}

/** "jotly.app/s/abc…" để hiện trong ô link (bỏ giao thức). */
export function displayUrl(url: string): string {
  return url.replace(/^https?:\/\//, '')
}

/** Mỗi trang danh sách 5 link (thiết kế B8 · các trang đang chia sẻ). */
export const PER_PAGE = 5

/** "18/10/2026". */
export function numericDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number)
  return `${d}/${m}/${y}`
}

/** Dãy số trang: 1 … 4 5 6 … 12 (0 = dấu ba chấm). */
export function pageNumbers(page: number, pages: number): number[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1)
  const out = [1]
  if (page > 3) out.push(0)
  for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) out.push(i)
  if (page < pages - 2) out.push(0)
  out.push(pages)
  return out
}
