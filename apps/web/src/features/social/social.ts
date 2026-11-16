import type { components } from '@/api/schema'
import type { DateString } from '@/lib/date'

/**
 * Bạn bè & sổ chung (ADR 0007, F-11). Kiểu lấy từ OpenAPI sinh (schema.d.ts);
 * giới hạn theo cấp (số bạn, số sổ, số ảnh/mục) hiện từ response backend hoặc `shared/limits.json`, không hard-code.
 */
type Schemas = components['schemas']

export type FriendCode = Schemas['FriendCodeOut']
export type Friend = Schemas['FriendOut']
export type FriendList = Schemas['FriendListOut']
export type FriendRequest = Schemas['FriendRequestOut']
export type FriendRequestList = Schemas['FriendRequestListOut']
export type Journal = Schemas['JournalOut']
export type JournalList = Schemas['JournalListOut']
export type JournalDetail = Schemas['JournalDetailOut']
export type JournalMember = Schemas['JournalMemberOut']
export type SharedEntry = Schemas['app__schemas__social__SharedEntryOut']
export type SharedEntryPage = Schemas['SharedEntryPageOut']
export type SharedEntryPhoto = Schemas['SharedEntryPhotoOut']
export type SharedEntryWrite = Schemas['SharedEntryWrite']

export type JournalId = string

/** Query keys của mục Social (khai báo một chỗ, dùng chung hook + invalidate). */
export const SOCIAL_KEY = ['social'] as const
export const friendsKey = () => [...SOCIAL_KEY, 'friends'] as const
export const requestsKey = () => [...SOCIAL_KEY, 'requests'] as const
export const journalsKey = () => [...SOCIAL_KEY, 'journals'] as const
export const journalKey = (id: JournalId) => [...SOCIAL_KEY, 'journal', id] as const
export const entriesKey = (id: JournalId, cursor?: string | null) => [...SOCIAL_KEY, 'entries', id, cursor ?? null] as const
export const friendCodeKey = () => [...SOCIAL_KEY, 'friend-code'] as const

/** "Sổ chung" theo một ngày cụ thể (để cập nhật cache mục của tôi). */
export function sharedEntryKey(journalId: JournalId, day: DateString) {
  return [...SOCIAL_KEY, 'entry', journalId, day] as const
}

/**
 * Ảnh chung (dạng `PhotoItem` của `usePhotoUploads`/`PhotoViewer`), từ `SharedEntryPhotoOut`.
 * Ảnh thu nhỏ dùng làm `thumbUrl`; ảnh lớn dùng làm `url`.
 */
export function toSharedPhoto(p: SharedEntryPhoto) {
  return {
    id: p.id,
    label: `[Ảnh]`,
    url: p.url ?? undefined,
    thumbUrl: p.thumb_url ?? p.url ?? undefined,
    width: p.width,
    height: p.height,
  }
}
