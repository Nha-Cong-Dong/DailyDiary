import { describe, expect, it } from 'vitest'
import { subIcons } from '@/lib/catalog'
import { OCTOBER } from './demoData'

describe('dữ liệu minh họa landing', () => {
  it('chỉ dùng sub icon có trong shared/icons.json', () => {
    for (const day of Object.values(OCTOBER)) {
      expect(subIcons).toContain(day.sub)
    }
  })
})
