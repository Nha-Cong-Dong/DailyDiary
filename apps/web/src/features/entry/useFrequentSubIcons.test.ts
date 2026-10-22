import { describe, expect, it } from 'vitest'
import { frequentSubIcons } from './useFrequentSubIcons'

const catalog = ['☀️', '🌧️', '☕', '📚', '🌸', '🍀', '🎧', '🍜', '🧊', '😌']

describe('frequentSubIcons', () => {
  it('xếp theo số lần dùng, hòa nhau giữ thứ tự danh mục, bỏ icon lạ và null', () => {
    const used = ['🌸', '☕', '🌸', null, '🦄', '📚', '☕', '🌸']
    expect(frequentSubIcons(used, catalog, 4)).toEqual(['🌸', '☕', '📚', '☀️'])
  })

  it('chưa có dữ liệu thì lấy đầu danh mục', () => {
    expect(frequentSubIcons([], catalog, 3)).toEqual(['☀️', '🌧️', '☕'])
  })
})
