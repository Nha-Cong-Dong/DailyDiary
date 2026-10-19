import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { YearPreview } from './YearPreview'

describe('YearPreview', () => {
  it('bấm một mức điểm ở chú thích thì làm mờ các ngày khác, bấm lại thì bỏ lọc', () => {
    render(<YearPreview />)
    const five = screen.getByRole('button', { name: 'Chỉ xem ngày điểm 5' })
    fireEvent.click(five)
    expect(five).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByTitle('16/10 · điểm 5').style.filter).toBe('')
    expect(screen.getByTitle('15/10 · điểm 2').style.filter).toContain('grayscale')

    fireEvent.click(five)
    expect(five).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByTitle('15/10 · điểm 2').style.filter).toBe('')
  })
})
