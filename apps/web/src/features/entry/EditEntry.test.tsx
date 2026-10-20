import { act, fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithMe } from '@/test/withMe'
import { EditEntry } from './EditEntry'
import { clearLocalDays } from './localDays'

function Edit() {
  return <EditEntry date="2026-10-16" />
}

function renderEdit() {
  return renderWithMe(
    [
      { path: '/day/:date/edit', Component: Edit },
      { path: '/day/:date', element: <h1>Trang ngày</h1> },
    ],
    '/day/2026-10-16/edit',
  )
}

beforeEach(() => {
  // Chỉ giả Date: "hôm nay" là 18/10/2026 giờ Việt Nam; hẹn giờ vẫn chạy thật.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-18T14:15:00Z'))
})
afterEach(() => {
  vi.useRealTimers()
  clearLocalDays()
})

// Màn nhiều icon SVG: dành thêm thời gian khi cả bộ test chạy song song.
describe('Sửa một trang cũ', () => {
  it('báo đang sửa trang của ngày trước; đổi điểm có Hoàn tác', async () => {
    renderEdit()
    expect(await screen.findByRole('heading', { name: 'Sửa trang' })).toBeInTheDocument()
    expect(screen.getByText(/Bạn đang sửa trang của 2 ngày trước/)).toBeInTheDocument()
    expect(screen.getByText('Chưa có thay đổi')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Lưu thay đổi' })).toBeDisabled()

    fireEvent.click(screen.getByRole('button', { name: 'Điểm 3, Nụ' }))
    expect(screen.getByText(/Đã đổi từ 5 · Nở rộ sang 3 · Nụ/)).toBeInTheDocument()
    expect(screen.getByText('1 thay đổi chưa lưu')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(screen.getByText('Chưa có thay đổi')).toBeInTheDocument()
  })

  it('Hủy thay đổi hỏi lại, nêu đúng trường sẽ mất, rồi đưa về bản đã lưu', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Tối nấu ăn' } })
    fireEvent.change(screen.getByLabelText('Nội dung'), { target: { value: 'Khác' } })
    fireEvent.click(screen.getByRole('button', { name: 'Hủy thay đổi' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText('Thay đổi ở tiêu đề và nội dung chưa được lưu và sẽ mất.')).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bỏ thay đổi' }))
    expect(screen.getByLabelText('Tiêu đề')).toHaveValue('Tan làm sớm')
  })

  it('lưu thì báo đã lưu, ghi thêm ngày sửa vào dòng Sửa lần cuối', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Tối nấu ăn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(screen.getByText('Đã lưu thay đổi cho trang 16/10')).toBeInTheDocument()
    expect(screen.getByText(/Sửa lần cuối 21:15, 18\/10, 2 ngày sau/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Xem trang' })).toBeInTheDocument()
  })

  it('rời trang khi còn thay đổi thì hỏi trước', async () => {
    renderEdit()
    fireEvent.change(await screen.findByLabelText('Tiêu đề'), { target: { value: 'Khác' } })
    fireEvent.click(screen.getByRole('link', { name: /Trang 16\/10/ }))
    const dialog = await screen.findByRole('alertdialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Tiếp tục sửa' }))
    expect(screen.getByRole('heading', { name: 'Sửa trang' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('link', { name: /Trang 16\/10/ }))
    fireEvent.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Bỏ và rời trang' }))
    expect(await screen.findByRole('heading', { name: 'Trang ngày' })).toBeInTheDocument()
  })

  it('ảnh HEIC và ảnh quá lớn hiện ô báo lỗi, không tính vào số ảnh', async () => {
    const { container } = renderEdit()
    await screen.findByRole('heading', { name: 'Sửa trang' })
    expect(screen.getByText('2/10')).toBeInTheDocument()
    const input = container.querySelector<HTMLInputElement>('input[type="file"]')!
    const heic = new File(['x'], 'IMG.heic', { type: 'image/heic' })
    const big = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'to.jpg', { type: 'image/jpeg' })
    await act(async () => {
      fireEvent.change(input, { target: { files: [heic, big] } })
    })
    expect(screen.getByText('Ảnh HEIC')).toBeInTheDocument()
    expect(screen.getByText('Ảnh quá lớn')).toBeInTheDocument()
    expect(screen.getByText('2/10')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Bỏ ảnh IMG.heic' }))
    expect(screen.queryByText('Ảnh HEIC')).not.toBeInTheDocument()
  })
})
