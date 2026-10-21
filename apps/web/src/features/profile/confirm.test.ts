import { describe, expect, it } from 'vitest'
import { isConfirmWord, isSameEmail } from './confirm'

describe('xác nhận xóa', () => {
  it('"XÓA" có dấu, không dấu, hoa thường đều được', () => {
    for (const t of ['XÓA', 'xóa', 'xoa', ' Xoa ']) expect(isConfirmWord(t)).toBe(true)
    expect(isConfirmWord('xoá đi')).toBe(false)
  })
  it('email phải khớp, không phân biệt hoa thường', () => {
    expect(isSameEmail(' An@Gmail.com ', 'an@gmail.com')).toBe(true)
    expect(isSameEmail('an@gmail.co', 'an@gmail.com')).toBe(false)
    expect(isSameEmail('', '')).toBe(false)
  })
})
