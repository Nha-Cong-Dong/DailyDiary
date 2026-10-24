import { describe, expect, it } from 'vitest'
import { tierLimits } from './limits'
import { storageUsage, usagePercent } from './usage'

const MB = 1024 * 1024
const { quota_bytes, warn_ratio } = tierLimits().storage
const at = (used_bytes: number) => storageUsage({ used_bytes, quota_bytes, warn_ratio })

describe('storageUsage', () => {
  it('nhãn "X MB / hạn mức", chưa có ảnh thì 0', () => {
    expect(at(0)).toMatchObject({ ratio: 0, warn: false, full: false, label: `0 MB / ${quota_bytes / MB} MB` })
    expect(at(12.34 * MB).label).toBe(`12,3 MB / ${quota_bytes / MB} MB`)
    // Đã có ảnh mà chưa tới 0,1 MB thì không ghi "0 MB".
    expect(at(30_000).label).toBe(`< 0,1 MB / ${quota_bytes / MB} MB`)
  })

  it(`cảnh báo từ đúng ngưỡng ${warn_ratio * 100}%, phần trăm làm tròn xuống`, () => {
    const threshold = Math.ceil(quota_bytes * warn_ratio)
    expect(at(threshold - 1).warn).toBe(false)
    expect(usagePercent(at(threshold - 1))).toBe(warn_ratio * 100 - 1)
    expect(at(threshold)).toMatchObject({ warn: true, full: false })
    expect(usagePercent(at(threshold))).toBe(warn_ratio * 100)
  })

  it('chạm hoặc vượt hạn mức thì hết dung lượng; thanh tiến độ chặn ở 100%', () => {
    expect(at(quota_bytes)).toMatchObject({ warn: true, full: true, ratio: 1 })
    expect(at(quota_bytes + 5 * MB)).toMatchObject({ full: true, ratio: 1 })
    expect(usagePercent(at(quota_bytes + 5 * MB))).toBe(100)
  })
})
