import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DayPage } from '@/routes/DayPage'
import { SharedListPage } from '@/routes/SharedListPage'
import { SharePage } from '@/routes/SharePage'
import { renderWithMe } from '@/test/withMe'
import { resetDemoShares } from './demoShares'

const SEEDED = 'k7Qm2xPaR4vT9cLwn2Hs8e' // link mẫu của trang 18/10

beforeEach(() => {
  resetDemoShares()
  Object.defineProperty(navigator, 'clipboard', { value: { writeText: vi.fn(async () => {}) }, configurable: true })
})

describe('Hộp thoại Chia sẻ', () => {
  it('trang đang chia sẻ có chip; mở hộp thoại thấy link và xem trước theo từng phần', async () => {
    renderWithMe([{ path: '/day/:date', Component: DayPage }], '/day/2026-10-18')
    fireEvent.click(await screen.findByRole('button', { name: 'Đang chia sẻ' }))
    const dialog = await screen.findByRole('dialog', { name: 'Chia sẻ trang 18/10/2026' })
    expect(within(dialog).getByText(new RegExp(`/s/${SEEDED}$`))).toBeInTheDocument()

    // Tắt Tiêu đề: thẻ xem trước gập phần tiêu đề lại (ẩn khỏi trình đọc màn hình).
    const preview = within(dialog).getByRole('complementary', { name: 'Xem trước' })
    expect(within(preview).getByText('Chiều mưa đọc sách')).toBeVisible()
    fireEvent.click(within(dialog).getByRole('switch', { name: 'Tiêu đề' }))
    expect(within(preview).queryByText('Chiều mưa đọc sách', { ignore: '[aria-hidden=true] *' })).toBeNull()

    fireEvent.click(within(dialog).getByRole('button', { name: 'Sao chép' }))
    expect(await screen.findByText('Đã sao chép link')).toBeInTheDocument()
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(`${window.location.origin}/s/${SEEDED}`)
  })

  it('bỏ hết thì không sao chép được; tắt link rồi bật lại tạo link mới', async () => {
    renderWithMe([{ path: '/day/:date', Component: DayPage }], '/day/2026-10-18')
    fireEvent.click(await screen.findByRole('button', { name: 'Chia sẻ' }))
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bỏ hết' }))
    expect(within(dialog).getByText('Bật ít nhất một phần để có thể chia sẻ.')).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: 'Sao chép' })).toBeDisabled()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Chọn tất cả' }))

    const link = within(dialog).getByRole('switch', { name: 'Link chia sẻ' })
    fireEvent.click(link)
    expect(await within(dialog).findByText(/Đã tắt · link cũ không mở được nữa/)).toBeInTheDocument()
    expect(within(dialog).getByText('Bật link chia sẻ để tạo link')).toBeInTheDocument()
    fireEvent.click(link)
    const url = await within(dialog).findByText(/\/s\//)
    expect(url.textContent).not.toContain(SEEDED)
  })

  it('trang chưa chia sẻ: link tắt, mặc định không chia sẻ tên', async () => {
    renderWithMe([{ path: '/day/:date', Component: DayPage }], '/day/2026-10-17')
    fireEvent.click(await screen.findByRole('button', { name: 'Chia sẻ' }))
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByRole('switch', { name: 'Link chia sẻ' })).toHaveAttribute('aria-checked', 'false')
    expect(within(dialog).getByRole('switch', { name: 'Tên của bạn' })).toHaveAttribute('aria-checked', 'false')
    expect(screen.queryByRole('button', { name: 'Đang chia sẻ' })).toBeNull()
  })
})

describe('Trang người nhận xem', () => {
  it('chỉ hiện phần được chọn, không cho lập chỉ mục', async () => {
    renderWithMe([{ path: '/s/:token', Component: SharePage }], `/s/${SEEDED}`, null)
    expect(await screen.findByRole('heading', { name: 'Chiều mưa đọc sách' })).toBeInTheDocument()
    expect(screen.getByText('Minh An chia sẻ một trang nhật ký')).toBeInTheDocument()
    expect(screen.queryByText('trà gừng')).toBeNull() // từ khóa không được chọn
    expect(screen.getAllByRole('button', { name: /Mở ảnh/ })).toHaveLength(2)
    expect(document.head.querySelector('meta[name="robots"]')?.getAttribute('content')).toContain('noindex')
  })

  it('link sai hoặc đã tắt: "Trang này không mở được"', async () => {
    renderWithMe([{ path: '/s/:token', Component: SharePage }], '/s/khong-co', null)
    expect(await screen.findByRole('heading', { name: 'Trang này không mở được' })).toBeInTheDocument()
  })
})

describe('Trang đang chia sẻ', () => {
  it('5 link mỗi trang; tắt link cần xác nhận rồi báo đã tắt', async () => {
    renderWithMe([{ path: '/profile/shares', Component: SharedListPage }], '/profile/shares')
    expect(await screen.findByText('7 trang đang mở link.')).toBeInTheDocument()
    expect(screen.getAllByRole('article')).toHaveLength(5)
    expect(screen.getByText(/Hiển thị 1–5 trong 7 trang/)).toBeInTheDocument()

    const first = screen.getAllByRole('article')[0]
    expect(within(first).getByText('Đang ẩn: Từ khóa')).toBeInTheDocument()
    fireEvent.click(within(first).getByRole('button', { name: 'Tắt link' }))
    const alert = within(first).getByRole('alert')
    fireEvent.click(within(alert).getByRole('button', { name: 'Tắt link' }))
    expect(await screen.findByText('Đã tắt link trang 18/10/2026')).toBeInTheDocument()
    await waitFor(() => expect(screen.getByText('6 trang đang mở link.')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Trang 2' }))
    expect(await screen.findByText(/Hiển thị 6–6 trong 6 trang/)).toBeInTheDocument()
  })
})
