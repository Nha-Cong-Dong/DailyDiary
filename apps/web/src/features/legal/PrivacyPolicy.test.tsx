import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Login } from '@/features/auth/Login'
import { tierLimits } from '@/lib/limits'
import { renderWithMe } from '@/test/withMe'
import { CONTACT_EMAIL, PrivacyPolicy } from './PrivacyPolicy'

beforeEach(() => {
  // Chưa đăng nhập: GET /me trả 401 (trang chính sách là trang công khai).
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: '' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
})

afterEach(() => vi.restoreAllMocks())

describe('Chính sách quyền riêng tư (đặc tả 4.1)', () => {
  it('xem được khi chưa đăng nhập: tiêu đề, email liên hệ, số ngày thùng rác lấy từ limits.json', async () => {
    renderWithMe([{ path: '/privacy', Component: PrivacyPolicy }], '/privacy', null)
    expect(await screen.findByRole('heading', { level: 1, name: 'Chính sách quyền riêng tư' })).toBeInTheDocument()
    for (const link of screen.getAllByRole('link', { name: CONTACT_EMAIL })) {
      expect(link).toHaveAttribute('href', `mailto:${CONTACT_EMAIL}`)
    }
    expect(screen.getByText(new RegExp(`thùng rác ${tierLimits().entry.restore_days} ngày`))).toBeInTheDocument()
  })

  it('trang đăng nhập dẫn tới /privacy', async () => {
    renderWithMe(
      [
        { path: '/login', Component: Login },
        { path: '/privacy', Component: PrivacyPolicy },
      ],
      '/login',
      null,
    )
    fireEvent.click(await screen.findByRole('link', { name: 'Chính sách quyền riêng tư' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Chính sách quyền riêng tư' })).toBeInTheDocument()
  })
})
