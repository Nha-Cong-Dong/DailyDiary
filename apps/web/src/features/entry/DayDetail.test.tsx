import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'
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

function withEntry() {
  return mockApi(makeMe(), {
    '2026-10-18': makeEntry('2026-10-18', { title: 'Chiều mưa đọc sách', content: 'Mưa từ trưa.', sub_icon: '😌' }),
  })
}
afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

describe('Chi tiết một ngày trên điện thoại (B10)', () => {
  it('thanh trên có ngày, Sửa; Xóa ở cuối trang mở bảng trượt', async () => {
    phoneWidth()
    const calls = withEntry()
    renderWithMe([{ path: '/day/:date', Component: Day }], '/day/2026-10-18', makeMe())
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    expect(screen.getByText('18/10/2026')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sửa trang này' })).toHaveAttribute('href', '/today')
    expect(screen.getByRole('link', { name: 'Về Dòng thời gian' })).toHaveAttribute('href', '/timeline')

    // Xóa không hỏi lại (B2): trang vào thùng rác ngay, thông báo có nút Hoàn tác.
    fireEvent.click(screen.getByRole('button', { name: 'Xóa trang này' }))
    const toast = await screen.findByText(/Đã chuyển trang ngày 18\/10 vào thùng rác/)
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
    expect(calls.at(-1)).toMatchObject({ method: 'DELETE', path: '/entries/2026-10-18' })
    expect(screen.getByRole('button', { name: 'Khôi phục trang' })).toBeInTheDocument()

    // Hoàn tác trong thông báo nổi: POST restore, trang hiện lại.
    fireEvent.click(within(toast.closest('[role="status"]') as HTMLElement).getByRole('button', { name: 'Hoàn tác' }))
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    expect(calls.at(-1)).toMatchObject({ method: 'POST', path: '/entries/2026-10-18/restore' })
  })
})

describe('Chi tiết một ngày', () => {
  it('ngày chưa ghi (API 404) thì mời ghi bù', async () => {
    mockApi(makeMe())
    renderWithMe([{ path: '/day/:date', Component: Day }], '/day/2026-10-18', makeMe())
    expect(await screen.findByText('Ngày này chưa ghi.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Viết cho hôm nay' })).toBeInTheDocument()
  })
})
