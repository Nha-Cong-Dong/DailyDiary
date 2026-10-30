import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Stamp } from './Stamp'
import { Toast } from './Toast'

afterEach(() => {
  vi.useRealTimers()
})

describe('Toast', () => {
  it('hiện nội dung và nút hành động; bấm nút thì gọi hành động', () => {
    const undo = vi.fn()
    render(<Toast action={{ label: 'Hoàn tác', onClick: undo }}>Đã chuyển vào thùng rác</Toast>)
    expect(screen.getByRole('status')).toHaveTextContent('Đã chuyển vào thùng rác')
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(undo).toHaveBeenCalledOnce()
  })

  it('khi nơi gọi xóa nội dung, giữ lại một lúc để trượt ra rồi mới gỡ khỏi trang', () => {
    vi.useFakeTimers()
    const { rerender } = render(<Toast>Đã sao chép link</Toast>)
    rerender(<Toast>{null}</Toast>)
    // Đang trượt ra: vẫn còn trên trang nhưng không bấm được.
    expect(screen.getByRole('status')).toHaveTextContent('Đã sao chép link')
    expect(screen.getByRole('status')).toHaveClass('pointer-events-none')
    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('không có nội dung từ đầu thì không vẽ gì', () => {
    render(<Toast>{null}</Toast>)
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})

describe('Stamp', () => {
  it('luôn có chữ, không chỉ dựa vào màu', () => {
    render(<Stamp tone="trash">Trong thùng rác, còn 23 ngày</Stamp>)
    expect(screen.getByText('Trong thùng rác, còn 23 ngày')).toBeInTheDocument()
  })
})
