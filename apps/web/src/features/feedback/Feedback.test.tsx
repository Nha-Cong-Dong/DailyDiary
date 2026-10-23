import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { tierLimits } from '@/lib/limits'
import { ProfilePage } from '@/routes/ProfilePage'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'

describe('Góp ý (F-09)', () => {
  it('mở từ Hồ sơ, gửi POST /feedback, hiện lời cảm ơn; đóng lại thì form trống', async () => {
    const me = makeMe()
    const calls = mockApi(me)
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)
    fireEvent.click(await screen.findByRole('button', { name: 'Gửi góp ý' }))

    const dialog = await screen.findByRole('dialog', { name: 'Góp ý cho Jotly' })
    expect(within(dialog).getByText(/an@example\.com/)).toBeInTheDocument() // báo trước góp ý kèm email
    const send = within(dialog).getByRole('button', { name: 'Gửi góp ý' })
    expect(send).toBeDisabled()
    const box = within(dialog).getByLabelText('Nội dung góp ý')
    expect(box).toHaveAttribute('maxLength', String(tierLimits().feedback.message_max))
    fireEvent.change(box, { target: { value: '  Mình muốn có nhắc viết lúc 21 giờ  ' } })
    fireEvent.click(send)

    expect(await within(dialog).findByText('Cảm ơn bạn!')).toBeInTheDocument()
    expect(calls.find((c) => c.path === '/feedback')).toMatchObject({
      method: 'POST',
      body: { message: 'Mình muốn có nhắc viết lúc 21 giờ' },
    })
    // Nút chữ "Đóng" (hộp thoại còn nút ✕ cùng tên ở góc).
    fireEvent.click(within(dialog).getAllByRole('button', { name: 'Đóng' }).find((b) => b.textContent === 'Đóng')!)
    fireEvent.click(screen.getByRole('button', { name: 'Gửi góp ý' }))
    expect(within(await screen.findByRole('dialog')).getByLabelText('Nội dung góp ý')).toHaveValue('')
  })

  it('menu tài khoản mở thẳng form góp ý (state { feedback: true }, không lên URL)', async () => {
    const me = makeMe()
    mockApi(me)
    renderWithMe([{ path: '/profile', Component: ProfilePage }], { pathname: '/profile', state: { feedback: true } }, me)
    expect(await screen.findByRole('dialog', { name: 'Góp ý cho Jotly' })).toBeInTheDocument()
    expect(window.location.search).toBe('')
  })
})
