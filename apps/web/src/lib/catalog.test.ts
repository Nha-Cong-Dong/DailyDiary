import { describe, expect, it } from 'vitest'
import { defaultIconSetId, findIconSet, flagColors, flagHex, flagName, iconSets, scoreLabel } from './catalog'

describe('catalog', () => {
  it('mỗi bộ icon có đủ 5 mức và bộ mặc định tồn tại', () => {
    expect(iconSets.map((s) => s.id)).toContain(defaultIconSetId)
    for (const set of iconSets) {
      expect(set.levels.map((l) => l.score)).toEqual([1, 2, 3, 4, 5])
    }
  })

  it('id bộ icon lạ thì quay về bộ mặc định', () => {
    expect(findIconSet('khong-co').id).toBe(defaultIconSetId)
    expect(scoreLabel('sprout', 5)).toBe('Nở rộ')
  })

  it('đổi màu cờ sang bản tối theo mã hex đã lưu, không phân biệt hoa thường', () => {
    const lavender = flagColors.find((c) => c.id === 'lavender')!
    expect(flagHex(lavender.hex.toLowerCase(), true)).toBe(lavender.hex_dark)
    expect(flagHex(lavender.hex, false)).toBe(lavender.hex)
  })

  it('màu tùy chỉnh: bản tối trừ 25 mỗi kênh (không âm), tên là "Màu riêng"', () => {
    expect(flagHex('#3a7bd5', true)).toBe('#2162BC')
    expect(flagHex('#100A30', true)).toBe('#000017')
    expect(flagHex('#3a7bd5', false)).toBe('#3a7bd5')
    expect(flagName('#3A7BD5')).toBe('Màu riêng')
    expect(flagName(flagColors[0]!.hex.toLowerCase())).toBe(flagColors[0]!.name)
    expect(flagName(null)).toBeNull()
  })
})
