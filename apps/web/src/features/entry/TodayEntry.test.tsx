import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { renderWithMe } from '@/test/withMe'
import { TodayEntry } from './TodayEntry'

function renderToday() {
  return renderWithMe([{ path: '/', Component: TodayEntry }], '/')
}

describe('TodayEntry', () => {
  it('chấm điểm trước, phần "Thêm chút nữa?" chỉ mở ra sau khi đã chọn điểm', () => {
    renderToday()
    expect(screen.queryByRole('heading', { name: 'Thêm chút nữa?' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Điểm 4, Hé nở' }))
    expect(screen.getByRole('heading', { name: 'Thêm chút nữa?' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Đã ghi lại hôm nay lúc')
  })

  it('thêm từ khóa bằng Enter và báo trùng không phân biệt dấu', () => {
    renderToday()
    fireEvent.click(screen.getByRole('button', { name: 'Điểm 3, Nụ' }))
    fireEvent.click(screen.getByRole('button', { name: '+ Từ khóa' }))
    const input = screen.getByLabelText('Từ khóa mới')
    fireEvent.change(input, { target: { value: 'Đà Lạt' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByRole('button', { name: 'Bỏ từ khóa Đà Lạt' })).toBeInTheDocument()

    fireEvent.change(input, { target: { value: 'da lat' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(screen.getByText('Từ khóa này đã có trong ngày')).toBeInTheDocument()
  })
})
