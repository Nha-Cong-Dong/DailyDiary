import { describe, expect, it } from 'vitest'
import { defaultIconSetId, findIconSet, flagColors, flagHex, iconSets, scoreLabel } from './catalog'

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
    expect(flagHex('#123456', true)).toBe('#123456')
  })
})
