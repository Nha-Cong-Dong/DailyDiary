import { screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { googleLoginUrl } from '@/api/client'
import { ME_KEY } from '@/lib/profile'
import { makeMe, renderWithMe } from '@/test/withMe'
import { Login } from './Login'
import { RequireAuth } from './RequireAuth'

const routes = [
  { path: '/login', Component: Login },
  { path: '/onboarding', element: <p>Lần đầu</p> },
  { Component: RequireAuth, children: [{ path: '/today', element: <p>Hôm nay</p> }] },
]

function mock401() {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

describe('RequireAuth', () => {
  it('chưa đăng nhập (401) thì đưa sang trang đăng nhập', async () => {
    mock401()
    renderWithMe(routes, '/today', null)
    expect(await screen.findByRole('heading', { name: 'Đăng nhập vào Jotly' })).toBeInTheDocument()
  })

  it('đã đăng nhập nhưng chưa xong lần đầu thì đưa sang /onboarding', async () => {
    renderWithMe(routes, '/today', makeMe({ onboarded: false }))
    expect(await screen.findByText('Lần đầu')).toBeInTheDocument()
  })

  it('máy chủ lỗi (không phải 401) thì hiện màn trục trặc, có nút thử lại', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'INTERNAL', message: 'Lỗi' } }), {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    renderWithMe(routes, '/today', null)
    expect(await screen.findByRole('heading', { name: 'Jotly đang gặp trục trặc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.getByText('Mã lỗi: 503')).toBeInTheDocument()
  })

  it('phiên hết hạn khi đang dùng thì trang đăng nhập nhắc lại tài khoản', async () => {
    const { client } = renderWithMe(routes, '/today', makeMe())
    expect(await screen.findByText('Hôm nay')).toBeInTheDocument()
    mock401()
    await client.invalidateQueries({ queryKey: ME_KEY })
    expect(await screen.findByRole('heading', { name: 'Phiên đăng nhập đã hết hạn' })).toBeInTheDocument()
    expect(screen.getByText('an@example.com')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Đăng nhập lại với Google/ })).toBeInTheDocument()
  })

  it('đã xong lần đầu thì vào được trang', async () => {
    renderWithMe(routes, '/today', makeMe())
    expect(await screen.findByText('Hôm nay')).toBeInTheDocument()
  })
})

describe('Trang đăng nhập', () => {
  it('nút Google là link điều hướng thẳng tới API, kèm múi giờ trình duyệt; hiện lỗi từ ?error=', async () => {
    mock401()
    renderWithMe(routes, '/login?error=email_unverified', null)
    const link = await screen.findByRole('link', { name: /Thử lại với Google/ })
    expect(link.getAttribute('href')).toMatch(/\/auth\/google\/login\?tz=/)
    expect(screen.getByText(/chưa được xác minh/)).toBeInTheDocument()
    expect(googleLoginUrl('Asia/Ho_Chi_Minh')).toBe('http://localhost:8000/auth/google/login?tz=Asia%2FHo_Chi_Minh')
  })

  it('đã đăng nhập thì không ở lại trang đăng nhập', async () => {
    renderWithMe(routes, '/login', makeMe())
    expect(await screen.findByText('Hôm nay')).toBeInTheDocument()
  })
})
