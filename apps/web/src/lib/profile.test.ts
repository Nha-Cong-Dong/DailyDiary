import { describe, expect, it } from 'vitest'
import { ApiError } from '@/api/client'
import { shouldRetryMe } from './profile'

describe('shouldRetryMe', () => {
  it('thử lại lỗi tạm thời: mất mạng, 429, 5xx', () => {
    expect(shouldRetryMe(0, new TypeError('Failed to fetch'))).toBe(true)
    expect(shouldRetryMe(0, new ApiError(429, 'RATE_LIMITED', ''))).toBe(true)
    expect(shouldRetryMe(1, new ApiError(503, 'HTTP_ERROR', ''))).toBe(true)
  })

  it('không thử lại 401/403 và dừng sau 3 lần', () => {
    expect(shouldRetryMe(0, new ApiError(401, 'UNAUTHENTICATED', ''))).toBe(false)
    expect(shouldRetryMe(0, new ApiError(403, 'CSRF_FAILED', ''))).toBe(false)
    expect(shouldRetryMe(3, new TypeError('Failed to fetch'))).toBe(false)
  })
})
