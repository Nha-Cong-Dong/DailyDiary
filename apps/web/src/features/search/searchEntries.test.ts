import { describe, expect, it } from 'vitest'
import type { DemoEntry } from '@/lib/demo'
import { NO_FILTERS, searchEntries, topKeywords } from './searchEntries'

const entry = (date: string, over: Partial<DemoEntry>): DemoEntry => ({
  entry_date: date,
  score: 3,
  sub_icon: null,
  flag_color: null,
  title: null,
  content: null,
  keywords: [],
  photos: [],
  created_at: `${date}T14:00:00.000Z`,
  updated_at: `${date}T14:00:00.000Z`,
  ...over,
})

const DATA = [
  entry('2026-10-18', { title: 'Chiều mưa đọc sách', score: 4, keywords: ['mưa'], photos: [{ id: 'a', label: '' }] }),
  entry('2026-10-05', { content: 'Mua được hai cuốn giá rẻ', keywords: ['đọc sách'] }),
  entry('2026-03-14', { title: 'Đi dạo dưới mưa phùn', score: 5, keywords: ['mưa', 'Linh'] }),
  entry('2025-11-02', { content: 'Lên Đà Lạt chơi với Linh', keywords: ['Linh'] }),
]
const TODAY = '2026-10-20'

describe('searchEntries', () => {
  it('tìm trên tiêu đề, nội dung, từ khóa; mới nhất trước', () => {
    const r = searchEntries(DATA, 'linh', NO_FILTERS, TODAY)
    expect(r.results.map((e) => e.entry_date)).toEqual(['2026-03-14', '2025-11-02'])
  })

  it('gõ không dấu khớp cả có dấu; gõ có dấu thì so đúng dấu', () => {
    expect(searchEntries(DATA, 'mua', NO_FILTERS, TODAY).matched).toBe(3)
    expect(searchEntries(DATA, 'mưa', NO_FILTERS, TODAY).matched).toBe(2)
    expect(searchEntries(DATA, 'da lat', NO_FILTERS, TODAY).matched).toBe(1)
  })

  it('bộ lọc điểm, thời gian, có ảnh; vẫn đếm số trang khớp trước khi lọc', () => {
    const r = searchEntries(DATA, 'mưa', { scores: [4], period: 'month', withPhotos: true }, TODAY)
    expect(r.results.map((e) => e.entry_date)).toEqual(['2026-10-18'])
    expect(r.matched).toBe(2)
    expect(searchEntries(DATA, 'linh', { ...NO_FILTERS, period: 'year' }, TODAY).results).toHaveLength(1)
    expect(searchEntries(DATA, '   ', NO_FILTERS, TODAY).results).toHaveLength(0)
  })

  it('từ khóa hay dùng, gộp không dấu', () => {
    expect(topKeywords(DATA, 2)).toEqual(['Linh', 'mưa'])
  })
})
