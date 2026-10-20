import { fireEvent, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithMe } from '@/test/withMe'
import { BackfillEntry } from './BackfillEntry'
import { clearLocalDays } from './localDays'

function renderBackfill(date: string) {
  function Page() {
    return <BackfillEntry date={date} />
  }
  return renderWithMe([{ path: '/', Component: Page }], '/')
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T14:12:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  clearLocalDays()
})

// Màn nhiều icon SVG: dành thêm thời gian khi cả bộ test chạy song song.
describe('Ghi bù ngày đã bỏ trống', () => {
  it('chấm điểm là ghi bù xong; phần thêm lưu khi bấm Lưu; xem trước như trong Dòng thời gian', async () => {
    renderBackfill('2026-10-14')
    expect(await screen.findByRole('heading', { name: 'Ngày này bạn chưa ghi' })).toBeInTheDocument()
    expect(screen.getByText('4 ngày trước')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Điểm 3, Nụ' }))
    expect(screen.getByRole('heading', { name: 'Ghi bù cho ngày 14/10' })).toBeInTheDocument()
    expect(screen.getByText(/Đã ghi bù lúc 21:12, 18\/10/)).toBeInTheDocument()
    expect(screen.getByText('Chỉ chấm điểm')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Tiêu đề'), { target: { value: 'Đi xem phim' } })
    expect(screen.getByText('Có thay đổi chưa lưu')).toBeInTheDocument()
    expect(screen.getByText('Đi xem phim', { selector: 'span' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Lưu' }))
    expect(screen.getByText('Đã lưu lúc 21:12, 18/10')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(screen.getByRole('heading', { name: 'Ngày này bạn chưa ghi' })).toBeInTheDocument()
  })

  it('ngày đã có trang thì dẫn sang xem hoặc sửa', async () => {
    renderBackfill('2026-10-16')
    expect(await screen.findByRole('heading', { name: 'Ngày 16/10 đã có trang' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Sửa trang' })).toHaveAttribute('href', '/day/2026-10-16/edit')
  })

  it('hôm nay thì không ghi bù mà viết luôn', async () => {
    renderBackfill('2026-10-18')
    expect(await screen.findByRole('link', { name: 'Viết cho hôm nay' })).toBeInTheDocument()
  })
})
