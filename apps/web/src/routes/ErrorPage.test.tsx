import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '@/api/client'
import { ErrorPage } from './ErrorPage'
import { NotFoundPage } from './NotFoundPage'

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
  it('có lối về Hôm nay và Dòng thời gian', () => {
    const router = createMemoryRouter([{ path: '/', Component: NotFoundPage }])
    render(<RouterProvider router={router} />)
    expect(screen.getByText('LỖI 404')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Về Hôm nay' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link', { name: 'Mở Dòng thời gian' })).toHaveAttribute('href', '/timeline')
  })
})
