import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { tierLimits } from '@/lib/limits'
import { countsTowardLimit, planAdd, serverRejection, type UploadTile } from './usePhotoUploads'

const max = tierLimits().photos.per_day_max
const jpg = (name: string, size = 1000) => new File([new Uint8Array(size)], name, { type: 'image/jpeg' })
const done = (n: number): UploadTile[] =>
  Array.from({ length: n }, (_, i) => ({ key: `p${i}`, status: 'done', photo: { id: `p${i}`, label: `[Ảnh ${i + 1}]` } }))

function keys() {
  let i = 0
  return () => `k${++i}`
}

describe('planAdd', () => {
  it('tệp hợp lệ thành ô đang tải, tệp hỏng thành ô báo lỗi', () => {
    const heic = new File(['x'], 'IMG.heic', { type: '' })
    const gif = new File(['x'], 'a.gif', { type: 'image/gif' })
    const plan = planAdd(done(1), [jpg('a.jpg'), heic, gif], keys())
    expect(plan.started).toHaveLength(2)
    expect(plan.tiles.map((t) => t.status)).toEqual(['done', 'uploading', 'uploading', 'rejected'])
    expect(plan.tiles[3]).toMatchObject({ status: 'rejected', reason: 'type', name: 'a.gif' })
  })

  it(`không vượt ${max} ảnh mỗi trang; ô báo lỗi không tính vào số ảnh`, () => {
    const start: UploadTile[] = [...done(max - 1), { key: 'bad', status: 'rejected', name: 'a.gif', reason: 'type' }]
    expect(start.filter(countsTowardLimit)).toHaveLength(max - 1)
    const plan = planAdd(start, [jpg('a.jpg'), jpg('b.jpg'), jpg('c.jpg')], keys())
    expect(plan.started).toHaveLength(1)
    expect(plan.skipped).toBe(2)
    expect(plan.tiles.filter(countsTowardLimit)).toHaveLength(max)
  })
})

describe('serverRejection', () => {
  it('hết dung lượng và đủ ảnh là máy chủ từ chối; lỗi khác vẫn là lỗi để thử lại', () => {
    expect(serverRejection(new ApiError(422, 'STORAGE_QUOTA', 'x'))).toBe('quota')
    expect(serverRejection(new ApiError(422, 'ENTRY_LIMIT_PHOTOS', 'x'))).toBe('photo_limit')
    expect(serverRejection(new ApiError(429, 'RATE_LIMITED', 'x'))).toBeNull()
    expect(serverRejection(new Error('Lỗi mạng khi tải ảnh'))).toBeNull()
  })

  it('ô bị máy chủ từ chối không tính vào số ảnh của trang', () => {
    expect(countsTowardLimit({ key: 'k', status: 'rejected', name: 'a.jpg', reason: 'quota' })).toBe(false)
  })
})
