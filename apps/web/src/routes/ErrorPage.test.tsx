import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { ErrorPage } from './ErrorPage'
import { NotFoundPage } from './NotFoundPage'
import { makeMe, renderWithMe } from '@/test/withMe'

function renderThrowing(thrown: unknown) {
  const Boom = () => {
    throw thrown
  }
  const router = createMemoryRouter([{ path: '/', ErrorBoundary: ErrorPage, Component: Boom }])
  render(<RouterProvider router={router} />)
}

afterEach(() => vi.restoreAllMocks())

describe('ErrorPage', () => {
  it('lỗi khi dựng trang: màn "Jotly đang gặp trục trặc", không lộ nội dung lỗi', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderThrowing(new Error('nội dung bí mật'))
    expect(screen.getByRole('heading', { name: 'Jotly đang gặp trục trặc' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Thử lại' })).toBeInTheDocument()
    expect(screen.queryByText(/nội dung bí mật/)).not.toBeInTheDocument()
  })

  it('lỗi API thì kèm mã HTTP', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    renderThrowing(new ApiError(503, 'UNAVAILABLE', 'Máy chủ bận'))
    expect(screen.getByText('Mã lỗi: 503')).toBeInTheDocument()
  })

  it('router báo 404 thì hiện màn không tìm thấy', async () => {
    const router = createMemoryRouter([{ path: '/', ErrorBoundary: ErrorPage }], { initialEntries: ['/khong-co'] })
    render(<RouterProvider router={router} />)
    expect(await screen.findByRole('heading', { name: 'Không tìm thấy trang này' })).toBeInTheDocument()
  })
})

describe('NotFoundPage', () => {
  it('đã đăng nhập: nằm trong khung app, có lối về Hôm nay và Dòng thời gian', () => {
    renderWithMe([{ path: '*', Component: NotFoundPage }], '/khong-co', makeMe())
    expect(screen.getByText('LỖI 404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về Hôm nay' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link', { name: 'Mở Dòng thời gian' })).toHaveAttribute('href', '/timeline')
    expect(screen.getByRole('link', { name: 'Hồ sơ của Minh An' })).toBeInTheDocument()
  })

  it('chưa đăng nhập: khung công khai, không có avatar hay thanh điều hướng app', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { code: 'UNAUTHENTICATED', message: 'x' } }), { status: 401 }),
    )
    renderWithMe([{ path: '*', Component: NotFoundPage }], '/khong-co', null)
    expect(await screen.findByText('LỖI 404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Jotly, trang chủ' })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: /Hồ sơ của/ })).not.toBeInTheDocument()
  })
})
