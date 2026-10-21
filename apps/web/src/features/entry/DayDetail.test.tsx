import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeMe, renderWithMe } from '@/test/withMe'
import { DayDetail } from './DayDetail'

function Day() {
  return <DayDetail date="2026-10-18" />
}

// Giả bề ngang điện thoại (dưới 768 px) cho các nhánh dùng matchMedia.
function phoneWidth() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn((query: string) => ({
      matches: query.includes('max-width'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  )
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T14:15:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Chi tiết một ngày trên điện thoại (B10)', () => {
  it('thanh trên có ngày, Sửa; Xóa ở cuối trang mở bảng trượt', async () => {
    phoneWidth()
    renderWithMe([{ path: '/day/:date', Component: Day }], '/day/2026-10-18', makeMe())
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    expect(screen.getByText('18/10/2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sửa trang này' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link', { name: 'Về Dòng thời gian' })).toHaveAttribute('href', '/timeline')

    fireEvent.click(screen.getByRole('button', { name: 'Xóa trang này' }))
    const sheet = await screen.findByRole('alertdialog', { name: 'Xóa nhật ký ngày 18/10?' })
    const [first, second] = within(sheet).getAllByRole('button')
    expect(first).toHaveTextContent('Xóa nhật ký')
    expect(second).toHaveTextContent('Giữ lại')
    fireEvent.click(first)
    expect(await screen.findByText(/Đã xóa trang ngày 18\/10/)).toBeInTheDocument()
  })
})
