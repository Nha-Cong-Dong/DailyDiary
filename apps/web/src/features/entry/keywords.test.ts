import { describe, expect, it } from 'vitest'
import { tierLimits } from '@/lib/limits'
import { keywordNorm } from '@/lib/text'
import { addKeyword, duplicateOf } from './keywords'

describe('từ khóa', () => {
  it('so trùng không phân biệt hoa thường và dấu', () => {
    expect(keywordNorm('  Đà   Lạt ')).toBe('da lat')
    const r = addKeyword(['Đà Lạt'], 'da lat')
    expect(r).toEqual({ ok: false, error: 'Từ khóa này đã có trong ngày' })
  })

  it('giới hạn số lượng và độ dài lấy từ shared/limits.json', () => {
    const { keywords_max, keyword_len_max } = tierLimits().entry
    const full = Array.from({ length: keywords_max }, (_, i) => `k${i}`)
    expect(addKeyword(full, 'mới').ok).toBe(false)
    expect(addKeyword([], 'a'.repeat(keyword_len_max + 1)).ok).toBe(false)
    expect(addKeyword([], '   ').ok).toBe(false)
    expect(addKeyword(['mưa'], ' trà  gừng ')).toEqual({ ok: true, keywords: ['mưa', 'trà gừng'] })
  })
})

describe('duplicateOf', () => {
  it('trả từ khóa đã có khi chuỗi gõ trùng (bỏ qua hoa thường, dấu, khoảng trắng)', () => {
    expect(duplicateOf(['đọc sách', 'mưa'], '  Đọc   Sách ')).toBe('đọc sách')
    expect(duplicateOf(['đọc sách'], 'doc sach')).toBe('đọc sách')
    expect(duplicateOf(['đọc sách'], 'đọc')).toBeNull()
    expect(duplicateOf(['đọc sách'], '   ')).toBeNull()
  })
})
