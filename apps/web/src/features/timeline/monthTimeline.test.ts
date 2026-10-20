import { describe, expect, it } from 'vitest'
import type { Score } from '@/lib/catalog'
import type { DemoEntry } from '@/lib/demo'
import { addMonths, buildMonth, cutAfterEntries, decimal, monthBounds } from './monthTimeline'

function entry(date: string, score: Score, extra: Partial<DemoEntry> = {}): DemoEntry {
  return {
    entry_date: date,
    score,
    sub_icon: null,
    flag_color: null,
    title: null,
    content: null,
    keywords: [],
    photos: [],
    created_at: `${date}T14:00:00Z`,
    updated_at: `${date}T14:00:00Z`,
    ...extra,
  }
}

describe('tháng của Dòng thời gian', () => {
  it('gộp ngày bỏ trống liền nhau, hôm nay chưa ghi không tính là bỏ trống', () => {
    const entries = [entry('2026-10-01', 3), entry('2026-10-02', 4), entry('2026-10-05', 5)]
    const t = buildMonth('2026-10', entries, '2026-10-07', '2025-09-01')
    expect(t.lastDay).toBe(7)
    expect(t.recorded).toBe(3)
    expect(t.missed).toBe(3) // 3, 4 và 6
    expect(t.countable).toBe(7)
    expect(t.items.map((i) => (i.kind === 'gap' ? `gap ${i.from}-${i.to}` : `${i.kind} ${i.day}`))).toEqual([
      'open 7',
      'gap 6-6',
      'entry 5',
      'gap 3-4',
      'entry 2',
      'entry 1',
    ])
    // Bấm ngày 3 thì cuộn tới đoạn trống 3–4.
    expect(t.items[t.anchorOf.get(3)!]).toMatchObject({ kind: 'gap', from: 3, to: 4 })
  })

  it('chuỗi hiện tại tính tới hôm qua khi hôm nay chưa ghi; chuỗi dài nhất trong tháng', () => {
    const entries = ['01', '02', '03', '05', '06'].map((d) => entry(`2026-10-${d}`, 4))
    const t = buildMonth('2026-10', entries, '2026-10-07', '2025-09-01')
    expect(t.currentStreak).toBe(2)
    expect(t.longestStreak).toBe(3)
    expect(t.average).toBe(4)
    expect(decimal(3.65)).toBe('3,6')
  })

  it('tháng đã qua tính đủ ngày; ngày trước khi dùng Jotly không tính là bỏ trống', () => {
    const t = buildMonth('2025-09', [entry('2025-09-20', 2)], '2026-10-07', '2025-09-15')
    expect(t.lastDay).toBe(30)
    expect(t.countable).toBe(16)
    expect(t.missed).toBe(15)
    expect(t.days[0].kind).toBe('pre')
    expect(t.items.at(-1)).toMatchObject({ kind: 'gap', from: 15, to: 19 })
  })

  it('tháng 2 năm nhuận có 29 ngày', () => {
    expect(buildMonth('2028-02', [], '2028-03-01', '2028-01-01').days).toHaveLength(29)
  })

  it('đếm ảnh, sub icon hay dùng và từ khóa trong tháng', () => {
    const entries = [
      entry('2026-10-01', 3, { sub_icon: '☕', keywords: ['cà phê'], photos: [{ id: 'a', label: '' }] }),
      entry('2026-10-02', 4, { sub_icon: '☕', keywords: ['cà phê', 'mưa'] }),
      entry('2026-10-03', 5, { sub_icon: '🌸', keywords: ['mưa', 'Linh'], photos: [{ id: 'b', label: '' }, { id: 'c', label: '' }] }),
    ]
    const t = buildMonth('2026-10', entries, '2026-10-03', '2025-09-01')
    expect(t.photos).toBe(3)
    expect(t.photoDays).toBe(2)
    expect(t.topSubIcon).toEqual({ icon: '☕', count: 2 })
    expect(t.keywords.map((k) => k.label)).toEqual(['cà phê', 'mưa', 'Linh'])
  })

  it('chỉ hiện 7 trang đầu (kèm đoạn trống xen giữa); phần còn lại đếm là bị ẩn', () => {
    const entries = Array.from({ length: 10 }, (_, i) => entry(`2026-10-${String(i * 2 + 1).padStart(2, '0')}`, 3))
    const t = buildMonth('2026-10', entries, '2026-10-19', '2025-09-01')
    const { cut, hidden } = cutAfterEntries(t.items, 7)
    expect(t.items.slice(0, cut).filter((i) => i.kind === 'entry')).toHaveLength(7)
    expect(hidden).toBe(3)
  })

  it('chuyển tháng qua ranh giới năm; giới hạn từ tháng bắt đầu dùng tới tháng hiện tại', () => {
    expect(addMonths('2026-01', -1)).toBe('2025-12')
    expect(addMonths('2025-12', 1)).toBe('2026-01')
    expect(monthBounds('2025-09-01', '2026-10-21')).toEqual({ min: '2025-09', max: '2026-10' })
  })
})
