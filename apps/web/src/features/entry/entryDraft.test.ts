import { describe, expect, it } from 'vitest'
import { demoEntry } from '@/lib/demo'
import { applyDraft, changedFields, dateTimeLabel, daysBetween, draftOf, fieldsLabel, isBackfilled } from './entryDraft'

const entry = demoEntry('2026-10-16')!

describe('bản nháp khi sửa trang', () => {
  it('liệt kê đúng các trường đã đổi, theo thứ tự trên màn', () => {
    const base = draftOf(entry)
    expect(changedFields(base, { ...base })).toEqual([])
    const next = { ...base, content: 'Khác', title: 'Khác', photos: base.photos.slice(1) }
    expect(changedFields(base, next)).toEqual(['title', 'content', 'photos'])
    expect(fieldsLabel(['title', 'content', 'photos'])).toBe('tiêu đề, nội dung và ảnh')
    expect(fieldsLabel(['score'])).toBe('điểm')
  })

  it('đổi rồi đổi lại thì không còn là thay đổi', () => {
    const base = draftOf(entry)
    expect(changedFields(base, { ...base, keywords: [...base.keywords] })).toEqual([])
  })

  it('lưu: chuỗi rỗng thành null, chuẩn hóa NFC, cập nhật updated_at, giữ created_at', () => {
    const now = new Date('2026-10-18T14:15:00Z')
    const decomposed = 'Hà Nội'
    const saved = applyDraft(entry, { ...draftOf(entry), title: '  ', content: decomposed }, now)
    expect(saved.title).toBeNull()
    expect(saved.content).toBe('Hà Nội')
    expect(saved.updated_at).toBe(now.toISOString())
    expect(saved.created_at).toBe(entry.created_at)
    expect(saved.entry_date).toBe('2026-10-16')
  })
})

describe('ngày và ghi bù', () => {
  it('đếm số ngày lịch', () => {
    expect(daysBetween('2026-10-16', '2026-10-18')).toBe(2)
    expect(daysBetween('2026-02-28', '2026-03-01')).toBe(1)
    expect(daysBetween('2026-10-18', '2026-10-18')).toBe(0)
  })

  it('ghi bù khi trang được tạo sau ngày của nó, theo múi giờ hồ sơ', () => {
    // 23:59 giờ Việt Nam ngày 14 vẫn là ghi đúng ngày; 06:00 sáng ngày 15 (còn là 14 theo UTC) là ghi bù.
    expect(isBackfilled({ entry_date: '2026-10-14', created_at: '2026-10-14T16:59:00Z' }, 'Asia/Ho_Chi_Minh')).toBe(false)
    expect(isBackfilled({ entry_date: '2026-10-14', created_at: '2026-10-14T23:00:00Z' }, 'Asia/Ho_Chi_Minh')).toBe(true)
    // Los Angeles: 20:00 ngày 14 giờ địa phương = 03:00 UTC ngày 15, vẫn đúng ngày.
    expect(isBackfilled({ entry_date: '2026-10-14', created_at: '2026-10-15T03:00:00Z' }, 'America/Los_Angeles')).toBe(false)
  })

  it('nhãn giờ theo múi giờ hồ sơ', () => {
    expect(dateTimeLabel('Asia/Ho_Chi_Minh', '2026-10-16T14:20:00Z')).toBe('21:20, 16/10/2026')
    expect(dateTimeLabel('Asia/Ho_Chi_Minh', '2026-10-18T14:15:00Z', false)).toBe('21:15, 18/10')
  })
})
