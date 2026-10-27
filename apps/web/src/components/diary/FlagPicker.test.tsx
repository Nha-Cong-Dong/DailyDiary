import { fireEvent, screen, waitFor } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { flagColors } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'
import { FlagPicker } from './FlagPicker'

let picked: string | null = null

function Harness({ initial = null }: { initial?: string | null }) {
  const [value, setValue] = useState<string | null>(initial)
  return (
    <FlagPicker
      value={value}
      onChange={(hex) => {
        picked = hex
        setValue(hex)
      }}
      form
    />
  )
}

function renderPicker(me = makeMe(), initial: string | null = null) {
  picked = null
  const calls = mockApi(me)
  renderWithMe([{ path: '/', Component: () => <Harness initial={initial} /> }], '/', me)
  return calls
}

/** Bảng pha màu của hệ thống: chọn xong thì input phát sự kiện `change`. */
function pickFromColorDialog(hex: string) {
  const input = document.querySelector<HTMLInputElement>('input[type="color"]')!
  input.value = hex
  input.dispatchEvent(new Event('change'))
}

describe('FlagPicker: màu cờ riêng', () => {
  it('ô + thêm màu vào hồ sơ (PATCH /me) và chọn luôn màu đó', async () => {
    const calls = renderPicker()
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm màu cờ riêng' }))
    pickFromColorDialog('#3a7bd5')
    expect(picked).toBe('#3A7BD5')
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ custom_flag_colors: ['#3A7BD5'] }),
    )
    expect(await screen.findByRole('button', { name: 'Cờ màu riêng #3A7BD5' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('chọn trúng màu có sẵn thì chỉ chọn, không thêm vào danh sách', async () => {
    const calls = renderPicker()
    fireEvent.click(await screen.findByRole('button', { name: 'Thêm màu cờ riêng' }))
    pickFromColorDialog(flagColors[2]!.hex.toLowerCase())
    expect(picked).toBe(flagColors[2]!.hex.toUpperCase())
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false)
  })

  it('đủ số màu tối đa thì ẩn ô +', async () => {
    const max = tierLimits('beta').profile.custom_flag_colors_max
    const full = Array.from({ length: max }, (_, i) => `#0000${i.toString(16).padStart(2, '0').toUpperCase()}`)
    renderPicker(makeMe({ custom_flag_colors: full }))
    expect(await screen.findByRole('button', { name: `Cờ màu riêng ${full[0]}` })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Thêm màu cờ riêng' })).toBeNull()
  })

  it('trang mang màu đã gỡ khỏi danh sách vẫn hiện màu đó đang chọn', async () => {
    renderPicker(makeMe(), '#ABCDEF')
    expect(await screen.findByRole('button', { name: 'Cờ màu riêng #ABCDEF' })).toHaveAttribute('aria-pressed', 'true')
  })
})
