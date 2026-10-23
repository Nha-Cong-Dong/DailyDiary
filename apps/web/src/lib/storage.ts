import { openDB, type DBSchema, type IDBPDatabase } from 'idb'

/**
 * Nháp nhật ký trong IndexedDB của trình duyệt (F-06): F5, mất mạng hay đóng tab giữa chừng vẫn không mất chữ.
 * - Khóa theo người dùng (`userKey` = SHA-256 của email, /me không trả id) + ngày, để hai tài khoản trên cùng
 *   trình duyệt không thấy nháp của nhau. Xóa hết khi đăng xuất và khi xóa dữ liệu / tài khoản.
 * - Mọi lỗi IndexedDB (chế độ riêng tư, bị chặn, hết chỗ) đều nuốt êm: app vẫn chạy, chỉ mất lớp nháp.
 * - Nháp là nội dung nhật ký: không ghi ra console, log hay analytics.
 */
export type DraftFields = {
  score: number
  sub_icon: string | null
  flag_color: string | null
  title: string
  content: string
  keywords: string[]
}

export type Draft = {
  key: string
  userKey: string
  date: string
  fields: DraftFields
  /** `updated_at` của bản máy chủ mà nháp dựa vào; null = ngày đó chưa có trang. */
  baseUpdatedAt: string | null
  savedAt: string
}

interface JotlyDB extends DBSchema {
  drafts: { key: string; value: Draft; indexes: { 'by-user': string } }
}

const DB_NAME = 'jotly'
let dbPromise: Promise<IDBPDatabase<JotlyDB> | null> | null = null

function db(): Promise<IDBPDatabase<JotlyDB> | null> {
  if (!dbPromise) {
    dbPromise =
      typeof indexedDB === 'undefined'
        ? Promise.resolve(null)
        : openDB<JotlyDB>(DB_NAME, 1, {
            upgrade(d) {
              d.createObjectStore('drafts', { keyPath: 'key' }).createIndex('by-user', 'userKey')
            },
          }).catch(() => null)
  }
  return dbPromise
}

/** Chỉ dùng trong test: mở lại kết nối (sau khi thay `indexedDB` giả). */
export function resetStorageForTests() {
  dbPromise = null
}

async function safe<T>(fallback: T, run: (d: IDBPDatabase<JotlyDB>) => Promise<T>): Promise<T> {
  try {
    const d = await db()
    return d ? await run(d) : fallback
  } catch {
    return fallback
  }
}

const keyOf = (userKey: string, date: string) => `${userKey}:${date}`

const userKeys = new Map<string, Promise<string>>()

/** Mã người dùng cho kho nháp: SHA-256 của email (chữ thường). Không lưu email gốc vào IndexedDB. */
export function draftUserKey(email: string): Promise<string> {
  const normalized = email.trim().toLowerCase()
  let key = userKeys.get(normalized)
  if (!key) {
    key = crypto.subtle
      .digest('SHA-256', new TextEncoder().encode(normalized))
      .then((buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join(''))
    userKeys.set(normalized, key)
  }
  return key
}

export function loadDraft(userKey: string, date: string): Promise<Draft | null> {
  return safe(null, async (d) => (await d.get('drafts', keyOf(userKey, date))) ?? null)
}

export function saveDraft(userKey: string, date: string, fields: DraftFields, baseUpdatedAt: string | null): Promise<void> {
  const draft: Draft = { key: keyOf(userKey, date), userKey, date, fields, baseUpdatedAt, savedAt: new Date().toISOString() }
  return safe(undefined, async (d) => {
    await d.put('drafts', draft)
  })
}

export function deleteDraft(userKey: string, date: string): Promise<void> {
  return safe(undefined, (d) => d.delete('drafts', keyOf(userKey, date)))
}

/** Xóa mọi nháp của một người (đăng xuất, xóa dữ liệu, xóa tài khoản). */
export function clearDrafts(userKey: string): Promise<void> {
  return safe(undefined, async (d) => {
    const tx = d.transaction('drafts', 'readwrite')
    const keys = await tx.store.index('by-user').getAllKeys(userKey)
    await Promise.all([...keys.map((k) => tx.store.delete(k)), tx.done])
  })
}

/** Xóa nháp theo email (dùng khi chỉ có hồ sơ trong tay). */
export async function clearDraftsFor(email: string | null | undefined): Promise<void> {
  if (email) await clearDrafts(await draftUserKey(email))
}
