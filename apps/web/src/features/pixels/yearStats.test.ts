import { describe, expect, it } from 'vitest'
import { decodeYear } from './usePixels'
import { yearStats } from './yearStats'

describe('yearStats', () => {
  it('năm nhuận có 366 ô thật; ô trước ngày bắt đầu và sau hôm nay được đánh dấu riêng', () => {
    const s = yearStats(2028, [], '2028-12-31', '2028-01-01')
    const real = s.grid.flat().filter((c) => c.kind !== 'none')
    expect(real).toHaveLength(366)
    const s2 = yearStats(2026, [], '2026-10-18', '2026-03-01')
    expect(s2.grid[1][27].kind).toBe('pre') // 28/2
    expect(s2.grid[9][18].kind).toBe('future') // 19/10
    expect(s2.grid[1][29].kind).toBe('none') // 30/2
    expect(s2.pastDays).toBe(232) // 1/3 → 18/10
  })

  it('chuỗi dài nhất, chuỗi hiện tại (hôm nay chưa ghi vẫn tính tới hôm qua), trung bình, tháng tươi nhất', () => {
    const days = [
      { entry_date: '2026-10-14', score: 5 as const },
      { entry_date: '2026-10-15', score: 5 as const },
      { entry_date: '2026-10-16', score: 3 as const },
      { entry_date: '2026-10-17', score: 3 as const },
      { entry_date: '2026-09-01', score: 1 as const },
    ]
    const s = yearStats(2026, days, '2026-10-18', '2026-09-01')
    expect(s.longestStreak).toBe(4)
    expect(s.currentStreak).toBe(4)
    expect(s.recorded).toBe(5)
    expect(s.average).toBeCloseTo(3.4)
    expect(s.bestMonth).toBe(9) // tháng 10
    expect(s.distribution).toEqual([1, 0, 2, 0, 2])
  })
})

describe('giải dạng gọn của GET /pixels', () => {
  it('ký tự thứ i là ngày thứ i của năm, kể cả 29/2 năm nhuận', () => {
    const scores = '2' + '0'.repeat(58) + '5' + '0'.repeat(305) + '3' // 366 ký tự
    const { days, flags } = decodeYear(2024, scores, { '59': '#E3A4A8' })
    expect(days).toEqual([
      { entry_date: '2024-01-01', score: 2 },
      { entry_date: '2024-02-29', score: 5 },
      { entry_date: '2024-12-31', score: 3 },
    ])
    expect(flags).toEqual({ '2024-02-29': '#E3A4A8' })
  })
})
