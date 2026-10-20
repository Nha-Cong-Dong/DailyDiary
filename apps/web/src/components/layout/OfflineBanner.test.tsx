import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { BACK_ONLINE_MS, OfflineBanner } from './OfflineBanner'

function setOnline(value: boolean) {
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(value)
  act(() => {
    window.dispatchEvent(new Event(value ? 'online' : 'offline'))
  })
}

function renderBanner() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <OfflineBanner />
    </QueryClientProvider>,
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('OfflineBanner', () => {
  it('có mạng thì không hiện gì', () => {
    renderBanner()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('mất mạng thì báo ngoại tuyến; có mạng lại thì báo rồi tự ẩn', () => {
    vi.useFakeTimers()
    renderBanner()
    setOnline(false)
    expect(screen.getByRole('status')).toHaveTextContent('Bạn đang ngoại tuyến.')
    expect(screen.getByRole('button', { name: 'Thử kết nối lại' })).toBeInTheDocument()

    setOnline(true)
    expect(screen.getByRole('status')).toHaveTextContent('Đã có mạng lại.')
    act(() => {
      vi.advanceTimersByTime(BACK_ONLINE_MS)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
