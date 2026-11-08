import { describe, expect, it } from 'vitest'
import { setLanguage } from '@/lib/i18n'
import { ApiError, toApiError } from './client'

const body = (code: string, message: string) => ({ error: { code, message } })

describe('ApiError.message theo ngôn ngữ giao diện', () => {
  it('tiếng Việt: giữ thông báo của máy chủ', () => {
    expect(new ApiError(404, 'ENTRY_NOT_FOUND', 'Ngày này chưa có nhật ký').message).toBe('Ngày này chưa có nhật ký')
  })

  it('English: dịch theo mã, điền lại số giới hạn; đổi ngôn ngữ thì cùng một lỗi đổi chữ', async () => {
    const err = toApiError(new Response(null, { status: 422 }), body('ENTRY_LIMIT_PHOTOS', 'Mỗi ngày tối đa 8 ảnh'))
    expect(err.message).toBe('Mỗi ngày tối đa 8 ảnh')
    await setLanguage('en')
    expect(err.message).toBe('Up to 8 photos per day')
    expect(toApiError(new Response(null, { status: 409 }), body('ENTRY_CONFLICT', 'x')).message).toBe(
      'This page was just edited somewhere else',
    )
  })

  it('mã lạ giữ thông báo gốc; không có thông báo thì dùng câu chung của ngôn ngữ đang dùng', async () => {
    await setLanguage('en')
    expect(new ApiError(400, 'SOMETHING_NEW', 'Lỗi mới').message).toBe('Lỗi mới')
    const bare = toApiError(new Response(null, { status: 500 }), undefined)
    expect(bare.message).toBe('Something went wrong. Please try again.')
    await setLanguage('vi')
    expect(bare.message).toBe('Có lỗi xảy ra, vui lòng thử lại')
  })
})
