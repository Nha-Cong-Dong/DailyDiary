import { describe, expect, it } from 'vitest'
import { hasDiacritics, highlight, keywordNorm, matches, snippet } from './text'

describe('chuẩn hóa và tìm kiếm tiếng Việt', () => {
  it('khóa từ khóa: không dấu, chữ thường, gộp khoảng trắng', () => {
    expect(keywordNorm('  Đà   Lạt ')).toBe('da lat')
  })

  it('gõ không dấu thì khớp cả chữ có dấu; gõ có dấu thì so đúng dấu', () => {
    expect(hasDiacritics('mua')).toBe(false)
    expect(hasDiacritics('mưa')).toBe(true)
    expect(matches('Kẹt xe dưới mưa', 'mua')).toBe(true)
    expect(matches('Mua được hai cuốn', 'mưa')).toBe(false)
    expect(matches('Mua được hai cuốn', 'mua')).toBe(true)
  })

  it('tô sáng đúng vị trí trên chữ gốc, kể cả khi gõ không dấu', () => {
    expect(highlight('Lên Đà Lạt chơi', 'da lat')).toEqual([
      { text: 'Lên ', match: false },
      { text: 'Đà Lạt', match: true },
      { text: ' chơi', match: false },
    ])
  })

  it('emoji không làm lệch chỉ số tô sáng', () => {
    const segs = highlight('☔ Đi dạo dưới mưa phùn', 'mưa')
    expect(segs.find((s) => s.match)?.text).toBe('mưa')
  })

  it('đoạn trích cắt quanh chỗ khớp, có dấu "…"', () => {
    const text = 'Sáng dậy sớm đi chợ mua rau, trưa nấu canh, chiều trời đổ mưa to nên ở nhà đọc sách và uống trà gừng nóng'
    const s = snippet(text, 'mưa')
    expect(s.startsWith('…')).toBe(true)
    expect(s).toContain('mưa to')
  })
})
