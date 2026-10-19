import { describe, expect, it } from 'vitest'
import { flagColors, subIcons } from './catalog'
import { DEMO_ENTRIES, DEMO_JOINED, demoEntry, demoYears } from './demo'

describe('dữ liệu mẫu', () => {
  it('chỉ dùng sub icon và màu cờ có trong shared/', () => {
    const hexes = flagColors.map((f) => f.hex)
    for (const e of DEMO_ENTRIES) {
      if (e.sub_icon) expect(subIcons).toContain(e.sub_icon)
      if (e.flag_color) expect(hexes).toContain(e.flag_color)
    }
  })

  it('mỗi ngày tối đa một trang, không có ngày trước khi bắt đầu dùng', () => {
    const dates = DEMO_ENTRIES.map((e) => e.entry_date)
    expect(new Set(dates).size).toBe(dates.length)
    expect(dates.every((d) => d >= DEMO_JOINED)).toBe(true)
    expect(demoYears()).toEqual([2025, 2026])
    expect(demoEntry('2026-10-18')?.title).toBe('Chiều mưa đọc sách')
  })
})
