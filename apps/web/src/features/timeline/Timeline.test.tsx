import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { PixelsPage } from '@/routes/PixelsPage'
import { SearchPage } from '@/routes/SearchPage'
import { TimelinePage } from '@/routes/TimelinePage'
import { makeMe, renderWithMe } from '@/test/withMe'

afterEach(() => sessionStorage.clear())

describe('Dòng thời gian (dữ liệu mẫu)', () => {
  it('hiện thống kê, 7 trang mới nhất, xem thêm, và nút Ghi bù ở ngày bỏ trống', async () => {
    renderWithMe([{ path: '/timeline', Component: TimelinePage }], '/timeline?m=2026-10', makeMe())
    expect(await screen.findByRole('heading', { name: 'Dòng thời gian' })).toBeInTheDocument()
    expect(screen.getByText('Tháng 10, 2026', { selector: '[aria-live]' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Chiều mưa đọc sách/ })).toHaveAttribute('href', '/day/2026-10-18')
    expect(screen.getByRole('link', { name: 'Ghi bù ngày 14/10' })).toHaveAttribute('href', '/day/2026-10-14/backfill')

    const more = screen.getByRole('button', { name: /Xem thêm \d+ trang cũ hơn/ })
    expect(screen.queryByRole('link', { name: /Cà phê đầu tháng/ })).not.toBeInTheDocument()
    fireEvent.click(more)
    expect(screen.getByRole('link', { name: /Cà phê đầu tháng/ })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Hiển thị ít hơn' })).toHaveLength(2)
  })

  it('bấm một ngày trên lịch thì mở rộng danh sách tới trang đó', async () => {
    renderWithMe([{ path: '/timeline', Component: TimelinePage }], '/timeline?m=2026-10', makeMe())
    const calendar = await screen.findByRole('complementary', { name: 'Lịch tháng' })
    fireEvent.click(within(calendar).getByRole('button', { name: /^1 tháng 10, điểm 3/ }))
    expect(screen.getByRole('link', { name: /Cà phê đầu tháng/ })).toBeInTheDocument()
  })

  it('chuyển sang tháng trước và có nút Về tháng này', async () => {
    renderWithMe([{ path: '/timeline', Component: TimelinePage }], '/timeline?m=2026-10', makeMe())
    fireEvent.click(await screen.findByRole('button', { name: 'Tháng trước, Tháng 9, 2026' }))
    expect(await screen.findByText('Tháng 9, 2026', { selector: '[aria-live]' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm/ }))
    expect(screen.getByRole('link', { name: /Mưa đầu thu/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Về tháng này' }))
    expect(await screen.findByRole('link', { name: /Chiều mưa đọc sách/ })).toBeInTheDocument()
  })
})

describe('Người dùng mới (?demo=empty)', () => {
  it('Dòng thời gian, Year in Pixels và Tìm kiếm hiện màn trống mời viết trang đầu tiên', async () => {
    sessionStorage.setItem('jotly:demo', 'empty')
    const routes = [
      { path: '/timeline', Component: TimelinePage },
      { path: '/pixels', Component: PixelsPage },
      { path: '/search', Component: SearchPage },
    ]
    const { router } = renderWithMe(routes, '/timeline', makeMe())
    expect(await screen.findByRole('heading', { name: 'Trang đầu tiên đang chờ bạn' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Viết trang hôm nay/ })).toHaveAttribute('href', '/today')

    await router.navigate('/pixels')
    expect(await screen.findByRole('heading', { name: 'Tô ô đầu tiên của năm' })).toBeInTheDocument()

    await router.navigate('/search')
    expect(await screen.findByRole('heading', { name: 'Chưa có trang nào để tìm' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Bộ lọc' })).not.toBeInTheDocument()
  })
})
