import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithMe } from '@/test/withMe'
import { Login } from './Login'
import { LOGIN_ERRORS, UNKNOWN_LOGIN_ERROR } from './loginState'

const routes = [{ path: '/login', Component: Login }]

beforeEach(() => {
  // Chưa đăng nhập: GET /me trả 401.
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập' } }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
})

afterEach(() => vi.restoreAllMocks())

describe('Trang đăng nhập', () => {
  it('mặc định: tiêu đề, nút Google, không có lỗi', async () => {
    renderWithMe(routes, '/login', null)
    expect(await screen.findByRole('heading', { name: 'Đăng nhập vào Jotly' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Tiếp tục với Google/ })).toBeInTheDocument()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(Object.entries(LOGIN_ERRORS))('?error=%s hiện đúng thông báo và nút thử lại', async (code, message) => {
    renderWithMe(routes, `/login?error=${code}`, null)
    expect(await screen.findByRole('heading', { name: 'Chưa đăng nhập được' })).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent(message)
    expect(screen.getByRole('link', { name: /Thử lại với Google/ })).toBeInTheDocument()
  })

  it('lỗi không kèm câu phụ an ủi; khung lỗi tự nói cần làm gì', async () => {
    renderWithMe(routes, '/login?error=oauth', null)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(screen.queryByText(/Không sao|Lần này chưa vào được/)).not.toBeInTheDocument()
  })

  it('mã lỗi lạ thì hiện thông báo chung', async () => {
    renderWithMe(routes, '/login?error=xyz', null)
    expect(await screen.findByRole('alert')).toHaveTextContent(UNKNOWN_LOGIN_ERROR)
  })

  it('bấm nút Google thì hiện "Đang chờ Google"; Hủy dừng chuyển trang', async () => {
    const stop = vi.fn()
    window.stop = stop
    renderWithMe(routes, '/login', null)
    const link = await screen.findByRole('link', { name: /Tiếp tục với Google/ })
    // jsdom không chuyển trang thật; chặn mặc định để test chỉ xem phần giao diện.
    link.addEventListener('click', (e) => e.preventDefault())
    fireEvent.click(link)
    expect(screen.getByRole('heading', { name: 'Đang đăng nhập' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Đang chờ Google')
    fireEvent.click(screen.getByRole('button', { name: 'Hủy' }))
    expect(stop).toHaveBeenCalled()
    expect(screen.getByRole('heading', { name: 'Đăng nhập vào Jotly' })).toBeInTheDocument()
  })
})
