import { describe, expect, it } from 'vitest'
import { recentDaysFrom } from './useRecentDays'

const row = (entry_date: string, score: 1 | 2 | 3 | 4 | 5, sub_icon: string | null = null) => ({ entry_date, score, sub_icon })

describe('recentDaysFrom', () => {
  it('lấy các ngày đã ghi trong tháng, trước hôm nay, và tóm tắt tháng tới hôm qua', () => {
    const rows = [
      row('2026-09-30', 5), // tháng trước: không thuộc Dải tháng 10
      row('2026-10-01', 3),
      row('2026-10-15', 2, '🧊'),
      row('2026-10-18', 4, '😌'),
      row('2026-10-21', 5), // hôm nay: màn Hôm nay tự chấm, không đếm ở đây
    ]
    const data = recentDaysFrom(rows, '2026-10-21')
    expect(Object.keys(data.days).sort()).toEqual(['2026-10-01', '2026-10-15', '2026-10-18'])
    expect(data.days['2026-10-18']).toEqual({ score: 4, sub_icon: '😌' })
    expect(data.monthRecorded).toBe(3)
    expect(data.monthScoreSum).toBe(9)
  })
})
