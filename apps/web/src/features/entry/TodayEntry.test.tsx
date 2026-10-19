import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { TodayEntry } from './TodayEntry'

function renderToday() {
  const router = createMemoryRouter([{ path: '/', Component: TodayEntry }])
  return render(<RouterProvider router={router} />)
}

describe('TodayEntry', () => {
  it('chấm điểm trước, phần "Thêm chút nữa?" chỉ mở ra sau khi đã chọn điểm', () => {
    renderToday()
    expect(screen.queryByRole('heading', { name: 'Thêm chút nữa?' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Điểm 4, Hé nở' }))
    expect(screen.getByRole('heading', { name: 'Thêm chút nữa?' })).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Đã chấm điểm lúc')
    expect(screen.getByRole('status')).toHaveTextContent('chưa lưu')
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
