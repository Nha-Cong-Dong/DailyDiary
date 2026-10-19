import { useSyncExternalStore } from 'react'
import { defaultIconSetId } from './catalog'
import { browserTimeZone } from './date'

/**
 * Hồ sơ tạm trong bộ nhớ trình duyệt, để các màn thiết kế B6 (Lần đầu, Hôm nay) chạy được khi chưa có
 * GET/PATCH /me (Bước 3). Chỉ sống trong phiên tab, không lưu đi đâu. Bước 3 thay bằng dữ liệu thật từ API.
 */
export type Profile = {
  displayName: string
  /** Email Google; không sửa được trong app. */
  email: string
  /** Ảnh đại diện; null thì hiện chữ viết tắt. Ảnh chọn ở Hồ sơ chỉ là URL xem trước trong trình duyệt. */
  avatarUrl: string | null
  /** Bộ icon vẽ cho mọi ngày (users.icon_set_id). */
  iconSetId: string
  timeZone: string
}

let profile: Profile = {
  displayName: 'Bạn',
  email: 'ban@gmail.com',
  avatarUrl: null,
  iconSetId: defaultIconSetId,
  timeZone: browserTimeZone(),
}
const listeners = new Set<() => void>()

export function getProfile(): Profile {
  return profile
}

export function updateProfile(patch: Partial<Profile>) {
  profile = { ...profile, ...patch }
  listeners.forEach((l) => l())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useProfile(): Profile {
  return useSyncExternalStore(subscribe, getProfile, getProfile)
}

/** "Minh An" → "MA"; một chữ → chữ cái đầu. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]]
  return picked.map((w) => w[0]!.toLocaleUpperCase('vi')).join('')
}
