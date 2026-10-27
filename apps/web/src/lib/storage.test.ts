import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearDrafts,
  clearDraftsFor,
  deleteDraft,
  draftUserKey,
  loadDraft,
  resetStorageForTests,
  saveDraft,
  type DraftFields,
} from './storage'

const fields: DraftFields = { score: 4, sub_icon: null, flag_color: null, title: 'Mưa', content: 'Ở nhà.', keywords: ['mưa'] }

beforeEach(() => {
  globalThis.indexedDB = new IDBFactory()
  resetStorageForTests()
})
afterEach(() => vi.unstubAllGlobals())

describe('storage (nháp IndexedDB)', () => {
  it('lưu, đọc, xóa nháp theo người dùng và ngày', async () => {
    const alice = await draftUserKey('alice@example.com')
    const bob = await draftUserKey('bob@example.com')
    await saveDraft(alice, '2026-10-18', fields, null)
    expect((await loadDraft(alice, '2026-10-18'))?.fields).toEqual(fields)
    expect(await loadDraft(bob, '2026-10-18')).toBeNull()
    await deleteDraft(alice, '2026-10-18')
    expect(await loadDraft(alice, '2026-10-18')).toBeNull()
  })

  it('mã người dùng là SHA-256 của email chữ thường, không chứa email', async () => {
    const key = await draftUserKey(' Alice@Example.com ')
    expect(key).toMatch(/^[0-9a-f]{64}$/)
    expect(key).toBe(await draftUserKey('alice@example.com'))
  })

  it('đăng xuất xóa hết nháp của người đó, giữ nháp người khác', async () => {
    const alice = await draftUserKey('alice@example.com')
    const bob = await draftUserKey('bob@example.com')
    await saveDraft(alice, '2026-10-17', fields, null)
    await saveDraft(alice, '2026-10-18', fields, '2026-10-18T14:00:00.000Z')
    await saveDraft(bob, '2026-10-18', fields, null)
    await clearDraftsFor('alice@example.com')
    expect(await loadDraft(alice, '2026-10-17')).toBeNull()
    expect(await loadDraft(alice, '2026-10-18')).toBeNull()
    expect(await loadDraft(bob, '2026-10-18')).not.toBeNull()
    await clearDrafts(bob)
    expect(await loadDraft(bob, '2026-10-18')).toBeNull()
  })

  it('IndexedDB lỗi hoặc không có (chế độ riêng tư): mọi hàm chạy êm, chỉ không có nháp', async () => {
    vi.stubGlobal('indexedDB', {
      open: () => {
        throw new Error('blocked')
      },
    })
    resetStorageForTests()
    const key = await draftUserKey('alice@example.com')
    await expect(saveDraft(key, '2026-10-18', fields, null)).resolves.toBeUndefined()
    await expect(loadDraft(key, '2026-10-18')).resolves.toBeNull()
    await expect(clearDrafts(key)).resolves.toBeUndefined()
    vi.stubGlobal('indexedDB', undefined)
    resetStorageForTests()
    await expect(loadDraft(key, '2026-10-18')).resolves.toBeNull()
  })
})
