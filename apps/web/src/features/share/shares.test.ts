import { describe, expect, it } from 'vitest'
import { demoEntry } from '@/lib/demo'
import { availableParts, defaultSettings, hasContent, pageNumbers, partSummary, publicView, shapeOf } from './shares'

const day = demoEntry('2026-10-18')!

describe('chọn phần chia sẻ', () => {
  it('chỉ có công tắc cho phần trang có; tên và điểm luôn có', () => {
    const plain = { ...day, sub_icon: null, flag_color: null, keywords: [], photos: [] }
    expect(availableParts(shapeOf(plain))).toEqual(['name', 'score', 'title', 'content'])
    expect(availableParts(shapeOf(day))).toEqual(['name', 'score', 'sub_icon', 'flag', 'title', 'content', 'keywords'])
  })

  it('mặc định riêng tư trước: tắt tên, từ khóa, ảnh', () => {
    const s = defaultSettings()
    expect([s.show_name, s.show_keywords, s.photo_ids.length]).toEqual([false, false, 0])
  })

  it('chỉ bật tên thì chưa có gì để chia sẻ; thêm một ảnh là đủ', () => {
    const none = { ...defaultSettings(), show_score: false, show_sub_icon: false, show_flag: false, show_title: false, show_content: false }
    expect(hasContent({ ...none, show_name: true }, shapeOf(day))).toBe(false)
    expect(hasContent({ ...none, photo_ids: [day.photos[0].id] }, shapeOf(day))).toBe(true)
  })

  it('tóm tắt "Người nhận thấy" / "Đang ẩn", kèm số ảnh', () => {
    const s = { ...defaultSettings(), photo_ids: [day.photos[0].id, day.photos[1].id] }
    const { shown, hidden } = partSummary(s, shapeOf(day))
    expect(shown).toEqual(['Điểm & icon', 'Sub icon', 'Màu cờ', 'Tiêu đề', 'Nội dung', '2/3 ảnh'])
    expect(hidden).toEqual(['Tên', 'Từ khóa'])
  })
})

describe('trang người nhận xem', () => {
  it('phần không chọn vắng mặt hẳn (như exclude_unset của API); ảnh chỉ có số lượng', () => {
    const s = { ...defaultSettings(), show_content: false, photo_ids: [day.photos[2].id] }
    const v = publicView(day, s, 'Minh An', 'sprout')
    expect(Object.keys(v).sort()).toEqual(['entry_date', 'flag_color', 'icon_set_id', 'photo_count', 'score', 'sub_icon', 'title'])
    expect(v.title).toBe('Chiều mưa đọc sách')
    expect(v.photo_count).toBe(1)
  })

  it('ẩn điểm thì không lộ cả bộ icon', () => {
    const v = publicView(day, { ...defaultSettings(), show_score: false }, 'Minh An', 'sprout')
    expect('score' in v || 'icon_set_id' in v).toBe(false)
  })
})

describe('phân trang', () => {
  it('rút gọn bằng dấu ba chấm khi nhiều trang', () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(pageNumbers(5, 12)).toEqual([1, 0, 4, 5, 6, 0, 12])
    expect(pageNumbers(1, 12)).toEqual([1, 2, 0, 12])
  })
})
