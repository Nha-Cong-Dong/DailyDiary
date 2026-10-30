import { describe, expect, it } from 'vitest'
import {
  addDays,
  dayProgress,
  daysEndingAt,
  daysInMonth,
  daysInYear,
  durationLabel,
  editedOnTheDay,
  isValidDate,
  longDateLabel,
  minutesLeftToday,
  todayIn,
  weekdayShort,
} from './date'

const VN = 'Asia/Ho_Chi_Minh'
const LA = 'America/Los_Angeles'

describe('todayIn (theo múi giờ hồ sơ, không theo máy)', () => {
  it('23:59 và 00:01 giờ Việt Nam rơi đúng ngày', () => {
    expect(todayIn(VN, new Date('2026-10-18T16:59:00Z'))).toBe('2026-10-18') // 23:59 +07
    expect(todayIn(VN, new Date('2026-10-18T17:01:00Z'))).toBe('2026-10-19') // 00:01 +07
  })

  it('06:00 sáng Việt Nam (vẫn là hôm trước theo UTC) vẫn là hôm nay', () => {
    expect(todayIn(VN, new Date('2026-10-18T23:00:00Z'))).toBe('2026-10-19')
  })

  it('múi giờ âm: Los Angeles còn ở ngày hôm trước', () => {
    expect(todayIn(LA, new Date('2026-10-19T03:00:00Z'))).toBe('2026-10-18')
  })
})

describe('minutesLeftToday', () => {
  it('21:04 giờ Việt Nam còn 2 giờ 56 phút', () => {
    const m = minutesLeftToday(VN, new Date('2026-10-18T14:04:00Z'))
    expect(m).toBe(176)
    expect(durationLabel(m)).toBe('2 giờ 56 phút')
  })

  it('23:59 còn 1 phút; giờ mùa hè ở Los Angeles vẫn tính tới nửa đêm địa phương', () => {
    expect(minutesLeftToday(VN, new Date('2026-10-18T16:59:00Z'))).toBe(1)
    expect(minutesLeftToday(LA, new Date('2026-07-01T06:00:00Z'))).toBe(60) // 23:00 PDT
  })
})

describe('dayProgress (Dải 24 giờ)', () => {
  it('23:59 và 00:01 giờ Việt Nam: gần hết ngày, rồi sang ngày mới', () => {
    expect(dayProgress(VN, new Date('2026-10-18T16:59:00Z'))).toEqual({ elapsed: 1439, total: 1440 })
    expect(dayProgress(VN, new Date('2026-10-18T17:01:00Z'))).toEqual({ elapsed: 1, total: 1440 })
  })

  it('06:00 sáng Việt Nam (vẫn là hôm trước theo UTC) đã qua 6 giờ của hôm nay', () => {
    expect(dayProgress(VN, new Date('2026-10-18T23:00:00Z'))).toEqual({ elapsed: 360, total: 1440 })
  })

  it('múi giờ âm: ngày đổi giờ ở Los Angeles dài 25 giờ (tháng 11) và 23 giờ (tháng 3)', () => {
    // 01/11/2026: lùi giờ lúc 02:00 PDT; 12:00 trưa giờ địa phương (PST, -08) là 20:00Z, đã qua 13 giờ thật.
    expect(dayProgress(LA, new Date('2026-11-01T20:00:00Z'))).toEqual({ elapsed: 780, total: 1500 })
    // 08/03/2026: tiến giờ lúc 02:00 PST; ngày chỉ có 23 giờ.
    expect(dayProgress(LA, new Date('2026-03-08T20:00:00Z')).total).toBe(1380)
  })
})

describe('phép tính ngày lịch', () => {
  it('cộng ngày qua cuối tháng, năm nhuận', () => {
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29')
    expect(addDays('2026-02-28', 1)).toBe('2026-03-01')
    expect(daysEndingAt('2026-10-18', 7)).toEqual([
      '2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18',
    ])
  })

  it('nhãn thứ và ngày tiếng Việt', () => {
    expect(weekdayShort('2026-10-18')).toBe('CN')
    expect(weekdayShort('2026-10-12')).toBe('T2')
    expect(longDateLabel('2026-10-18')).toBe('Chủ nhật · 18 tháng 10, 2026')
  })
})

describe('ngày hợp lệ, độ dài tháng, nhãn ghi đúng ngày', () => {
  it('từ chối ngày không có thật', () => {
    expect(isValidDate('2026-02-30')).toBe(false)
    expect(isValidDate('2026-2-3')).toBe(false)
    expect(isValidDate('2028-02-29')).toBe(true)
  })

  it('năm nhuận có 366 ngày (Year in Pixels có 366 ô)', () => {
    expect(daysInYear(2028)).toBe(366)
    expect(daysInYear(2026)).toBe(365)
    expect(daysInMonth(2028, 2)).toBe(29)
  })

  it('sửa lúc 23:59 cùng ngày là "ghi đúng ngày"; 00:01 hôm sau là "cập nhật muộn"', () => {
    expect(editedOnTheDay('2026-10-18', '2026-10-18T16:59:00Z', VN)).toBe(true)
    expect(editedOnTheDay('2026-10-18', '2026-10-18T17:01:00Z', VN)).toBe(false)
    // Los Angeles: 03:00 UTC ngày 19 vẫn là tối 18 giờ địa phương.
    expect(editedOnTheDay('2026-10-18', '2026-10-19T03:00:00Z', LA)).toBe(true)
  })
})
