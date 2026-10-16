import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HealthStatus } from './HealthStatus'

function renderWithQuery() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <HealthStatus />
    </QueryClientProvider>,
  )
}

describe('HealthStatus', () => {
  it('hiện "API: ok" khi backend trả status ok', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ status: 'ok', db: 'ok' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }),
    )
    renderWithQuery()
    expect(await screen.findByText('API: ok')).toBeInTheDocument()
    // Đăng nhập bằng cookie (bước 3) cần mọi request gửi kèm cookie.
    const request = fetchSpy.mock.calls[0][0] as Request
    expect(request.credentials).toBe('include')
  })

  it('hiện cảnh báo khi không gọi được API', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Failed to fetch'))
    renderWithQuery()
    expect(await screen.findByRole('alert')).toHaveTextContent('không kết nối được')
  })
})
