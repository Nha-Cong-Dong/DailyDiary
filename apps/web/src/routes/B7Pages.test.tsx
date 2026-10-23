import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import type { RouteObject } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DayPage } from '@/routes/DayPage'
import { PixelsPage } from '@/routes/PixelsPage'
import { ProfilePage } from '@/routes/ProfilePage'
import { SearchPage } from '@/routes/SearchPage'
import { flagColors } from '@/lib/catalog'
import { getThemePreference } from '@/lib/theme'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'

// Các màn thiết kế B7; "hôm nay" theo múi giờ trong hồ sơ (để Việt Nam cho cố định).
function renderAt(routes: RouteObject[], entry: string | { pathname: string; state?: unknown }) {
  return renderWithMe(routes, entry, makeMe())
}

describe('Chi tiết một ngày', () => {
  it('ngày không có thật thì báo lỗi rõ ràng', async () => {
    renderAt([{ path: '/day/:date', Component: DayPage }], '/day/2026-02-30')
    expect(await screen.findByRole('heading', { name: 'Ngày không hợp lệ' })).toBeInTheDocument()
  })

  it('hiện trang; xóa cần xác nhận, báo khôi phục được 30 ngày và có Hoàn tác', async () => {
    mockApi(makeMe(), { '2026-10-18': makeEntry('2026-10-18', { title: 'Chiều mưa đọc sách' }) })
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
    mockApi(makeMe(), {
      '2026-10-11': makeEntry('2026-10-11', { title: 'Cà phê với Linh', content: 'Linh kể chuyện Đà Lạt.', keywords: ['Linh'] }),
    })
    renderAt([{ path: '/search', Component: SearchPage }], { pathname: '/search', state: { q: 'Linh' } })
    expect(await screen.findByText(/kết quả cho “Linh”/)).toBeInTheDocument()
    expect(screen.getAllByText('Linh', { selector: 'mark' }).length).toBeGreaterThan(0)
    expect(window.location.search).toBe('')
  })
})

describe('Year in Pixels cả năm', () => {
  it('bấm một ô thì khung "Ngày đã chọn" hiện trang đó; phím mũi tên sang ngày bên cạnh', async () => {
    mockApi(makeMe(), {
      '2026-10-17': makeEntry('2026-10-17', { score: 3 }),
      '2026-10-18': makeEntry('2026-10-18', { score: 4, title: 'Chiều mưa đọc sách' }),
    })
    renderAt([{ path: '/pixels', Component: PixelsPage }], '/pixels')
    const cell = await screen.findByRole('button', { name: '18 tháng 10, điểm 4' })
    fireEvent.click(cell)
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    fireEvent.keyDown(cell, { key: 'ArrowLeft' })
    expect(screen.getByRole('button', { name: '17 tháng 10, điểm 3' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('Year in Pixels: tô ô theo màu cờ', () => {
  it('chọn "Cờ hiệu" thì ô mang màu cờ, chú thích liệt kê cờ trong năm; lựa chọn được nhớ', async () => {
    localStorage.removeItem('jotly:pixels-color-by')
    mockApi(makeMe(), {
      '2026-10-16': makeEntry('2026-10-16', { score: 2, flag_color: '#3A7BD5' }),
      '2026-10-17': makeEntry('2026-10-17', { score: 3, flag_color: flagColors[0]!.hex }),
      '2026-10-18': makeEntry('2026-10-18', { score: 4 }),
    })
    const view = renderAt([{ path: '/pixels', Component: PixelsPage }], '/pixels')
    expect(await screen.findByRole('button', { name: '18 tháng 10, điểm 4' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('radio', { name: 'Cờ hiệu' }))
    expect(screen.getByRole('radio', { name: 'Cờ hiệu' })).toHaveAttribute('aria-checked', 'true')
    const custom = screen.getByRole('button', { name: '16 tháng 10, điểm 2, cờ Màu riêng' })
    expect(custom).toHaveStyle({ backgroundColor: '#3A7BD5' })
    expect(screen.getByRole('button', { name: '18 tháng 10, điểm 4, không cờ' })).toBeInTheDocument()
    const legend = screen.getByRole('list', { name: 'Chú thích màu cờ' })
    expect(within(legend).getByText(`${flagColors[0]!.name} · 1`)).toBeInTheDocument()
    expect(within(legend).getByText('Không cờ · 1')).toBeInTheDocument()
    expect(localStorage.getItem('jotly:pixels-color-by')).toBe('flag')

    view.unmount()
    renderAt([{ path: '/pixels', Component: PixelsPage }], '/pixels')
    expect(await screen.findByRole('radio', { name: 'Cờ hiệu' })).toHaveAttribute('aria-checked', 'true')
    fireEvent.click(screen.getByRole('radio', { name: 'Điểm' }))
    expect(localStorage.getItem('jotly:pixels-color-by')).toBeNull()
  })
})

describe('Hồ sơ & cài đặt', () => {
  it('lưu tên và múi giờ qua PATCH /me, đổi chế độ màu, xóa dữ liệu gõ XÓA, xóa tài khoản gõ email', async () => {
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

    // Không còn xuất dữ liệu (canvas, quyết định 21/10/2026).
    expect(screen.queryByText('Tải dữ liệu về')).not.toBeInTheDocument()

    // Có hai nút: dòng trên điện thoại và nút trên máy tính (CSS ẩn một trong hai; jsdom không áp CSS).
    fireEvent.click(screen.getAllByRole('button', { name: /Xóa dữ liệu|Xóa toàn bộ dữ liệu/ })[0])
    const wipe = await screen.findByRole('alertdialog', { name: 'Xóa toàn bộ dữ liệu?' })
    const confirmWipe = within(wipe).getByRole('button', { name: 'Xóa vĩnh viễn' })
    expect(confirmWipe).toBeDisabled()
    fireEvent.change(within(wipe).getByLabelText(/để xác nhận/), { target: { value: 'xoa' } })
    expect(confirmWipe).toBeEnabled()
    fireEvent.click(within(wipe).getByRole('button', { name: 'Giữ lại' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    fireEvent.click(screen.getAllByRole('button', { name: /Xóa tài khoản/ })[0])
    const account = await screen.findByRole('alertdialog', { name: 'Xóa tài khoản Jotly?' })
    const confirmAccount = within(account).getByRole('button', { name: 'Xóa tài khoản' })
    fireEvent.change(within(account).getByLabelText(/để xác nhận/), { target: { value: 'XÓA' } })
    expect(confirmAccount).toBeDisabled()
    fireEvent.change(within(account).getByLabelText(/để xác nhận/), { target: { value: ` ${me.email.toUpperCase()} ` } })
    expect(confirmAccount).toBeEnabled()
  })
})
