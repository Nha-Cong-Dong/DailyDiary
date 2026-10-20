import { fromZonedTime } from 'date-fns-tz'
import { defaultIconSetId } from '@/lib/catalog'
import type { DateString } from '@/lib/date'
import { DEMO_TIME_ZONE, demoEntry } from '@/lib/demo'
import { publicView, shareUrl, type PublicShare, type ShareLink, type ShareListItem, type ShareSettings } from './shares'

/**
 * DỮ LIỆU MẪU cho các màn Chia sẻ (thiết kế B8), chỉ dùng khi chạy dev tới khi có API.
 * Lưu trong bộ nhớ của tab: tải lại trang là về trạng thái ban đầu.
 */
const DEMO_AUTHOR = 'Minh An'

const at = (date: DateString, hhmm: string) => fromZonedTime(`${date}T${hhmm}:00`, DEMO_TIME_ZONE).toISOString()

function seed(date: DateString, token: string, time: string, parts: Partial<ShareSettings>): ShareLink {
  return {
    entry_date: date,
    token,
    show_name: false,
    show_score: true,
    show_sub_icon: false,
    show_flag: false,
    show_title: true,
    show_content: false,
    show_keywords: false,
    photo_ids: [],
    ...parts,
    url: shareUrl(token),
    created_at: at(date, time),
    updated_at: at(date, time),
  }
}

const photoIds = (date: DateString, n: number) => Array.from({ length: n }, (_, i) => `${date}-${i + 1}`)
const ALL = { show_name: true, show_sub_icon: true, show_flag: true, show_content: true }

function initial(): Map<DateString, ShareLink> {
  const links = [
    seed('2026-10-18', 'k7Qm2xPaR4vT9cLwn2Hs8e', '21:40', { ...ALL, photo_ids: photoIds('2026-10-18', 2) }),
    seed('2026-10-16', 'Hp3Lx8QeWq5Zb3TyN6dKs1', '21:50', { show_content: true, photo_ids: photoIds('2026-10-16', 2) }),
    seed('2026-10-11', 'Vc8Rt2LmQx4Hn7PaZ3wKe9', '10:30', { show_flag: true }),
    seed('2026-10-04', 'Ty6Gb1NsXe5Mq8LdC2rWp4', '22:15', { ...ALL }),
    seed('2026-09-14', 'Fa9Kw3ZpLt7Rc2VnH5yQm8', '20:05', { ...ALL, show_keywords: true, photo_ids: photoIds('2026-09-14', 6) }),
    seed('2026-05-11', 'Dm4Px8CqWs2Yk6TbR9nLh3', '09:40', { show_content: true }),
    seed('2026-03-14', 'Lr2Nq7VbHt5Xs9MkP3cWa6', '22:10', { show_content: true, photo_ids: photoIds('2026-03-14', 4) }),
  ]
  return new Map(links.map((l) => [l.entry_date, l]))
}

let store = initial()

/** Đặt lại dữ liệu mẫu (dùng trong test). */
export function resetDemoShares() {
  store = initial()
}

function newToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function demoGetShare(date: DateString): ShareLink | null {
  return store.get(date) ?? null
}

/** Lưu phần chia sẻ; chưa có link thì tạo link mới (token mới). */
export function demoSaveShare(date: DateString, settings: ShareSettings): ShareLink {
  const now = new Date().toISOString()
  const prev = store.get(date)
  const token = prev?.token ?? newToken()
  const link: ShareLink = {
    ...settings,
    entry_date: date,
    token,
    url: shareUrl(token),
    created_at: prev?.created_at ?? now,
    updated_at: now,
  }
  store.set(date, link)
  return link
}

/** Tắt link: token cũ không mở được nữa. */
export function demoRevokeShare(date: DateString) {
  store.delete(date)
}

export function demoListShares(): ShareListItem[] {
  return [...store.values()]
    .sort((a, b) => (a.entry_date < b.entry_date ? 1 : -1))
    .flatMap((link) => {
      const e = demoEntry(link.entry_date)
      if (!e) return []
      return [
        {
          ...link,
          score: e.score,
          sub_icon: e.sub_icon,
          flag_color: e.flag_color,
          title: e.title,
          photo_count: e.photos.length,
          has_content: !!e.content,
          keyword_count: e.keywords.length,
        },
      ]
    })
}

export function demoPublicShare(token: string): PublicShare | null {
  const link = [...store.values()].find((l) => l.token === token)
  const entry = link ? demoEntry(link.entry_date) : null
  if (!link || !entry) return null
  return publicView(entry, link, DEMO_AUTHOR, defaultIconSetId)
}
