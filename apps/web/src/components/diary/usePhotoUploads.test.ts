import { describe, expect, it } from 'vitest'
import { tierLimits } from '@/lib/limits'
import { countsTowardLimit, planAdd, type UploadTile } from './usePhotoUploads'

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
    const heic = new File(['x'], 'IMG.heic', { type: 'image/heic' })
    const plan = planAdd(done(1), [jpg('a.jpg'), heic], keys())
    expect(plan.started).toHaveLength(1)
    expect(plan.tiles.map((t) => t.status)).toEqual(['done', 'uploading', 'rejected'])
    expect(plan.tiles[2]).toMatchObject({ status: 'rejected', reason: 'heic', name: 'IMG.heic' })
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
