import { describe, expect, it } from 'vitest'
import { isNightHour } from './theme'

// Giờ theo đồng hồ của máy (new Date(năm, tháng, ngày, giờ, phút) là giờ địa phương).
const at = (h: number, m = 0) => new Date(2026, 9, 30, h, m)

describe('isNightHour (chế độ "Theo giờ")', () => {
  it('tối từ 20:00 đến trước 05:00, sáng thời gian còn lại', () => {
    expect(isNightHour(at(19, 59))).toBe(false)
    expect(isNightHour(at(20, 0))).toBe(true)
    expect(isNightHour(at(23, 59))).toBe(true)
    expect(isNightHour(at(0, 1))).toBe(true)
    expect(isNightHour(at(4, 59))).toBe(true)
    expect(isNightHour(at(5, 0))).toBe(false)
    expect(isNightHour(at(12, 0))).toBe(false)
  })
})
