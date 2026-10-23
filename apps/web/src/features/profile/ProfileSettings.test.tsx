import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProfilePage } from '@/routes/ProfilePage'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'

// Bản điện thoại (thiết kế B10): thẻ hồ sơ gọn, bấm Sửa mở bảng "Sửa hồ sơ".
describe('Hồ sơ trên điện thoại', () => {
  it('Sửa mở bảng sửa hồ sơ; Hủy bỏ thay đổi, Lưu gửi PATCH /me rồi đóng bảng', async () => {
    const me = makeMe()
    const calls = mockApi(me)
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)

    fireEvent.click(await screen.findByRole('button', { name: 'Sửa' }))
    let sheet = await screen.findByRole('dialog', { name: 'Sửa hồ sơ' })
    fireEvent.change(within(sheet).getByLabelText('Tên hiển thị'), { target: { value: 'Tên bỏ đi' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Hủy' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.some((c) => c.method === 'PATCH')).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: 'Sửa' }))
    sheet = await screen.findByRole('dialog', { name: 'Sửa hồ sơ' })
    fireEvent.change(within(sheet).getByLabelText('Tên hiển thị'), { target: { value: 'An Nguyễn' } })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Lưu' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ display_name: 'An Nguyễn' })
    expect(screen.getByText('Đã lưu tên hiển thị.')).toBeInTheDocument()
  })

  it('mục Màu cờ riêng liệt kê màu đã thêm; bấm gỡ gửi danh sách còn lại', async () => {
    const me = makeMe({ custom_flag_colors: ['#3A7BD5', '#112233'] })
    const calls = mockApi(me)
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)

    expect(await screen.findByText(/Màu cờ riêng · 2\//)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Gỡ màu #3A7BD5' }))
    await waitFor(() =>
      expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ custom_flag_colors: ['#112233'] }),
    )
    await waitFor(() => expect(screen.queryByRole('button', { name: 'Gỡ màu #3A7BD5' })).toBeNull())
  })

  it('mục Chia sẻ là một dòng dẫn tới các trang đang chia sẻ', async () => {
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', makeMe())
    expect(await screen.findByRole('link', { name: /Trang đang chia sẻ/ })).toHaveAttribute('href', '/profile/shares')
  })
})
