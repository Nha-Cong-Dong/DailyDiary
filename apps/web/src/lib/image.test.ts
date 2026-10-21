import { describe, expect, it } from 'vitest'
import { checkPhoto, isHeic, megabytesLabel, photoAccept, photoFormatsLabel } from './image'
import { tierLimits } from './limits'

const max = tierLimits().photos.source_max_bytes
const file = (name: string, type: string, size = 1000) => ({ name, type, size })

describe('checkPhoto', () => {
  it('nhận JPEG, PNG, WebP trong giới hạn của shared/limits.json', () => {
    expect(checkPhoto(file('a.jpg', 'image/jpeg'))).toEqual({ ok: true })
    expect(checkPhoto(file('a.png', 'image/png', max))).toEqual({ ok: true })
    expect(checkPhoto(file('a.webp', 'image/webp'))).toEqual({ ok: true })
  })

  it('nhận HEIC/HEIF (thiết kế B9-Upload), kể cả khi trình duyệt để trống type', () => {
    expect(checkPhoto(file('IMG_1.HEIC', 'image/heic'))).toEqual({ ok: true })
    expect(checkPhoto(file('IMG_2.heic', ''))).toEqual({ ok: true })
    expect(checkPhoto(file('IMG_3.HEIF', ''))).toEqual({ ok: true })
    expect(checkPhoto(file('live.heic', 'image/heic-sequence'))).toEqual({ ok: true })
    expect(isHeic(file('IMG_2.heic', ''))).toBe(true)
    expect(isHeic(file('a.jpg', 'image/jpeg'))).toBe(false)
  })

  it('tệp không có type và đuôi lạ thì bị từ chối', () => {
    expect(checkPhoto(file('ghichu', ''))).toEqual({ ok: false, reason: 'type' })
  })

  it('từ chối định dạng khác và ảnh quá lớn', () => {
    expect(checkPhoto(file('a.gif', 'image/gif'))).toEqual({ ok: false, reason: 'type' })
    expect(checkPhoto(file('a.pdf', 'application/pdf'))).toEqual({ ok: false, reason: 'type' })
    expect(checkPhoto(file('a.jpg', 'image/jpeg', max + 1))).toEqual({ ok: false, reason: 'size' })
  })
})

describe('nhãn định dạng', () => {
  it('accept, tên định dạng và MB lấy từ limits', () => {
    expect(photoAccept()).toContain('image/jpeg')
    expect(photoAccept()).toContain('.jpg')
    expect(photoAccept()).toContain('.heic')
    expect(photoFormatsLabel()).toBe('JPG, PNG, HEIC, WebP')
    expect(megabytesLabel(10485760)).toBe('10 MB')
    expect(megabytesLabel(1572864)).toBe('1,5 MB')
  })
})
