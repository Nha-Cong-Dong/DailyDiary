import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { iconSets } from '@/lib/catalog'
import { ScoreIcon } from './ScoreIcon'
import { ScorePicker } from './ScorePicker'

describe('ScorePicker', () => {
  it('đánh dấu điểm đang chọn và báo điểm mới khi bấm', () => {
    const onChange = vi.fn()
    render(<ScorePicker iconSetId="sprout" value={4} onChange={onChange} />)
    expect(screen.getByRole('button', { name: 'Điểm 4, Hé nở' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Điểm 2, Mầm' }))
    expect(onChange).toHaveBeenCalledWith(2)
  })
})

describe('ScoreIcon', () => {
  it('mỗi bộ icon trong shared/icons.json có hình vẽ riêng', () => {
    const markups = iconSets.map((set) => render(<ScoreIcon iconSetId={set.id} score={3} />).container.innerHTML)
    expect(new Set(markups).size).toBe(iconSets.length)
  })
})
