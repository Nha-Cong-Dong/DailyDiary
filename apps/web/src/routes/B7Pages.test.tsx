import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DayPage } from '@/routes/DayPage'
import { PixelsPage } from '@/routes/PixelsPage'
import { ProfilePage } from '@/routes/ProfilePage'
import { SearchPage } from '@/routes/SearchPage'
import { getThemePreference } from '@/lib/theme'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'

// Các màn thiết kế B7; "hôm nay" theo múi giờ trong hồ sơ (để Việt Nam cho cố định).
function renderAt(routes: RouteObject[], entry: string | { pathname: string; state?: unknown }) {
  return renderWithMe(routes, entry, makeMe())
}

describe('Chi tiết một ngày', () => {
  it('ngày không có thật thì báo lỗi rõ ràng', async () => {
    renderAt([{ path: '/day/:date', Component: DayPage }], '/day/2026-02-30')
    expect(await screen.findByRole('heading', { name: 'Ngày không hợp lệ' })).toBeInTheDocument()
  })

  it('hiện trang mẫu; xóa cần xác nhận, báo khôi phục được 30 ngày và có Hoàn tác', async () => {
    renderAt([{ path: '/day/:date', Component: DayPage }], '/day/2026-10-18')
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    expect(screen.getByText(/ghi đúng ngày/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Chia sẻ' })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: 'Xóa nhật ký ngày này' }))
    const dialog = await screen.findByRole('alertdialog')
    expect(within(dialog).getByText(/Khôi phục được trong 30 ngày/)).toBeInTheDocument()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Xóa nhật ký' }))
    expect(await screen.findByText(/Đã xóa trang ngày 18\/10/)).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
  })
})

describe('Tìm kiếm', () => {
  it('nhận từ khóa qua state của router (không qua URL) và tô sáng kết quả', async () => {
    renderAt([{ path: '/search', Component: SearchPage }], { pathname: '/search', state: { q: 'Linh' } })
    expect(await screen.findByText(/kết quả cho “Linh”/)).toBeInTheDocument()
    expect(screen.getAllByText('Linh', { selector: 'mark' }).length).toBeGreaterThan(0)
    expect(window.location.search).toBe('')
  })
})

describe('Year in Pixels cả năm', () => {
  it('bấm một ô thì khung "Ngày đã chọn" hiện trang đó; phím mũi tên sang ngày bên cạnh', async () => {
    renderAt([{ path: '/pixels', Component: PixelsPage }], '/pixels')
    const cell = await screen.findByRole('button', { name: '18 tháng 10, điểm 4' })
    fireEvent.click(cell)
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    fireEvent.keyDown(cell, { key: 'ArrowLeft' })
    expect(screen.getByRole('button', { name: '17 tháng 10, điểm 3' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Hồ sơ & cài đặt', () => {
  it('lưu tên và múi giờ qua PATCH /me, đổi chế độ màu, xóa tài khoản cần gõ XÓA', async () => {
    const me = makeMe()
    const calls = mockApi(me)
    renderWithMe([{ path: '/profile', Component: ProfilePage }], '/profile', me)
    const name = await screen.findByLabelText('Tên hiển thị')
    fireEvent.change(name, { target: { value: 'An Nguyễn' } })
    fireEvent.click(screen.getByRole('button', { name: 'Lưu thay đổi' }))
    expect(await screen.findByText('Đã lưu')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'PATCH')?.body).toEqual({ display_name: 'An Nguyễn' })

    fireEvent.change(screen.getByLabelText('Múi giờ'), { target: { value: 'Asia/Tokyo' } })
    expect(screen.getByText(/Múi giờ mới áp dụng từ ngày đang viết/)).toBeInTheDocument()
    await waitFor(() => expect(me.timezone).toBe('Asia/Tokyo'))

    fireEvent.click(screen.getByRole('radio', { name: 'Tối' }))
    expect(getThemePreference()).toBe('dark')
    fireEvent.click(screen.getByRole('radio', { name: 'Theo hệ thống' }))
    expect(getThemePreference()).toBe('system')

    fireEvent.click(screen.getByRole('button', { name: /Xóa tài khoản/ }))
    const dialog = await screen.findByRole('alertdialog')
    const confirm = within(dialog).getByRole('button', { name: 'Xóa vĩnh viễn' })
    expect(confirm).toBeDisabled()
    fireEvent.change(within(dialog).getByLabelText(/để xác nhận/), { target: { value: 'xóa' } })
    expect(confirm).toBeEnabled()
  })
})
