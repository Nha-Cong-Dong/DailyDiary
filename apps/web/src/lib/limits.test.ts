import { describe, expect, it } from 'vitest'
import { limits, tierLimits } from './limits'

describe('shared limits', () => {
  it('đọc được giới hạn mặc định từ shared/limits.json', () => {
    const beta = tierLimits()
    expect(limits.default_tier).toBe('beta')
    expect(beta.entry.content_max).toBe(20000)
    expect(beta.photos.per_day_max).toBe(10)
  })
})
