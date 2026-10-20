import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('đi qua 3 bước, gửi một PATCH /me (kèm CSRF) rồi chuyển tới /today', async () => {
    const me = makeMe({ onboarded: false, display_name: 'An' })
    const calls = mockApi(me)
    document.cookie = 'dd_csrf=token-csrf'
    renderWithMe(
      [
        { path: '/onboarding', Component: Onboarding },
        { path: '/today', element: <p>Trang hôm nay</p> },
      ],
      '/onboarding',
      me,
    )

    const name = screen.getByLabelText('Tên hiển thị')
    fireEvent.change(name, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    expect(screen.getByText('Tên không được để trống')).toBeInTheDocument()

    fireEvent.change(name, { target: { value: '  Minh An ' } })
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    fireEvent.click(screen.getByRole('button', { name: /Hoa anh đào/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    fireEvent.change(screen.getByLabelText('Múi giờ'), { target: { value: 'America/Los_Angeles' } })
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu viết/ }))

    expect(await screen.findByText('Trang hôm nay')).toBeInTheDocument()
    const patch = calls.find((c) => c.method === 'PATCH')
    expect(patch?.body).toEqual({
      display_name: 'Minh An',
      icon_set_id: 'sakura',
      timezone: 'America/Los_Angeles',
      onboarded: true,
    })
    await waitFor(() => expect(patch?.csrf).toBe('token-csrf'))
  })
})
