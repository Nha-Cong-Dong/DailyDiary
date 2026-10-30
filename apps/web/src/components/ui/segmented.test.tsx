import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { Segmented } from './segmented'

const OPTIONS = [
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
  { value: 'system', label: 'Theo hệ thống' },
] as const

function Harness() {
  const [value, setValue] = useState<'light' | 'dark' | 'system'>('light')
  return <Segmented options={OPTIONS} value={value} onChange={setValue} label="Chế độ màu" />
}

describe('Segmented', () => {
  it('là một radio group; bấm một mục thì chọn mục đó', () => {
    render(<Harness />)
    expect(screen.getByRole('radiogroup', { name: 'Chế độ màu' })).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: 'Sáng' })).toBeChecked()
    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(screen.getByRole('radio', { name: 'Tối' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Sáng' })).not.toBeChecked()
  })

  it('chỉ mục đang chọn nằm trong thứ tự Tab; mũi tên, Home, End đổi lựa chọn và chuyển focus', () => {
    render(<Harness />)
    const light = screen.getByRole('radio', { name: 'Sáng' })
    expect(light).toHaveAttribute('tabindex', '0')
    expect(screen.getByRole('radio', { name: 'Tối' })).toHaveAttribute('tabindex', '-1')

    light.focus()
    fireEvent.keyDown(light, { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Tối' })).toBeChecked()
    expect(screen.getByRole('radio', { name: 'Tối' })).toHaveFocus()

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Tối' }), { key: 'End' })
    expect(screen.getByRole('radio', { name: 'Theo hệ thống' })).toBeChecked()

    // Mũi tên phải ở mục cuối quay về mục đầu.
    fireEvent.keyDown(screen.getByRole('radio', { name: 'Theo hệ thống' }), { key: 'ArrowRight' })
    expect(screen.getByRole('radio', { name: 'Sáng' })).toBeChecked()

    fireEvent.keyDown(screen.getByRole('radio', { name: 'Sáng' }), { key: 'ArrowLeft' })
    expect(screen.getByRole('radio', { name: 'Theo hệ thống' })).toBeChecked()
  })
})
