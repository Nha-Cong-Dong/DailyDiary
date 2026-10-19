import { fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { getProfile } from '@/lib/profile'
import { Onboarding } from './Onboarding'

describe('Onboarding', () => {
  it('đi qua 3 bước, ghi tên, bộ icon, múi giờ vào hồ sơ rồi chuyển tới /today', () => {
    const router = createMemoryRouter(
      [
        { path: '/onboarding', Component: Onboarding },
        { path: '/today', element: <p>Trang hôm nay</p> },
      ],
      { initialEntries: ['/onboarding'] },
    )
    render(<RouterProvider router={router} />)

    const name = screen.getByLabelText('Tên hiển thị')
    fireEvent.change(name, { target: { value: '   ' } })
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    expect(screen.getByText('Tên không được để trống')).toBeInTheDocument()

    fireEvent.change(name, { target: { value: '  Minh An ' } })
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    expect(screen.getByText('Bước 2/3')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Hoa anh đào/ }))
    fireEvent.click(screen.getByRole('button', { name: /Tiếp tục/ }))
    expect(screen.getByText('Bước 3/3')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Múi giờ'), { target: { value: 'America/Los_Angeles' } })
    fireEvent.click(screen.getByRole('button', { name: /Bắt đầu viết/ }))

    expect(screen.getByText('Trang hôm nay')).toBeInTheDocument()
    expect(getProfile()).toMatchObject({ displayName: 'Minh An', iconSetId: 'sakura', timeZone: 'America/Los_Angeles' })
  })
})
