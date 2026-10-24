import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { tierLimits } from '@/lib/limits'
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

// Mục 4.5 của đặc tả: hạn mức ảnh theo cấp tài khoản, cảnh báo khi đạt warn_ratio (80%).
describe('Dung lượng ảnh trong Hồ sơ', () => {
  const MB = 1024 * 1024
  const { quota_bytes, warn_ratio } = tierLimits().storage

  it('hiện "Dung lượng ảnh: X MB / 500 MB" và thanh tiến độ; dưới ngưỡng thì không cảnh báo', async () => {
    const me = makeMe()
    mockApi(me, {}, { usedBytes: 50 * MB })
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)

    const bar = await screen.findByRole('progressbar', { name: `Dung lượng ảnh: 50 MB / ${quota_bytes / MB} MB` })
    expect(bar).toHaveAttribute('aria-valuenow', String(Math.floor((50 * MB * 100) / quota_bytes)))
    expect(screen.queryByText(/dung lượng ảnh\. Bỏ bớt/)).toBeNull()
    expect(screen.getByText(/Ảnh đại diện không tính/)).toBeInTheDocument()
  })

  it(`đạt ${warn_ratio * 100}% thì cảnh báo; hết hạn mức thì báo ảnh mới không tải lên được`, async () => {
    const me = makeMe()
    const storage = { usedBytes: Math.ceil(quota_bytes * warn_ratio) }
    mockApi(me, {}, storage)
    const { client } = renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)

    expect(await screen.findByText(`Đã dùng ${warn_ratio * 100}% dung lượng ảnh. Bỏ bớt ảnh trong các trang cũ để còn chỗ cho ảnh mới.`)).toBeInTheDocument()
    expect(screen.getByRole('progressbar').firstElementChild).toHaveAttribute('data-warn', 'true')

    storage.usedBytes = quota_bytes
    await act(() => client.invalidateQueries({ queryKey: ['entries', 'data-summary'] }))
    expect(await screen.findByText(/Đã hết dung lượng ảnh: ảnh mới sẽ không tải lên được/)).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })

  it('ngay dưới ngưỡng (79,9%) vẫn chưa cảnh báo, không làm tròn lên 80%', async () => {
    const me = makeMe()
    mockApi(me, {}, { usedBytes: Math.floor(quota_bytes * warn_ratio) - 1 })
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)

    const bar = await screen.findByRole('progressbar', { name: /Dung lượng ảnh: / })
    expect(bar).toHaveAttribute('aria-valuenow', String(warn_ratio * 100 - 1))
    expect(bar.firstElementChild).not.toHaveAttribute('data-warn')
  })
})
