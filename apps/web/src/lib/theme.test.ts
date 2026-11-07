import { describe, expect, it } from 'vitest'
import { isNightHour, msUntilNextSwitch, resolveDark } from './theme'

const at = (h: number, m = 0) => new Date(2026, 10, 6, h, m)

describe('chế độ Theo giờ', () => {
  it('tối từ 20:00 đến trước 05:00', () => {
    expect(isNightHour(at(19, 59))).toBe(false)
    expect(isNightHour(at(20))).toBe(true)
    expect(isNightHour(at(4, 59))).toBe(true)
    expect(isNightHour(at(5))).toBe(false)
    expect(resolveDark('hour', at(23))).toBe(true)
    expect(resolveDark('light', at(23))).toBe(false)
  })

  it('hẹn giờ tới mốc đổi kế tiếp', () => {
    expect(msUntilNextSwitch(at(19, 30))).toBe(30 * 60_000)
    expect(msUntilNextSwitch(at(4))).toBe(60 * 60_000)
    expect(msUntilNextSwitch(at(22))).toBe(7 * 60 * 60_000)
  })
})
