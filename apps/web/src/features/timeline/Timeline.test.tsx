import { fireEvent, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { clearDemoWrites, demoEntries } from '@/lib/demo'
import { PixelsPage } from '@/routes/PixelsPage'
import { SearchPage } from '@/routes/SearchPage'
import { TimelinePage } from '@/routes/TimelinePage'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'

// Dữ liệu mẫu (lib/demo.ts) đưa qua API giả: Dòng thời gian đọc GET /entries?month như bản thật.
function demoStore() {
  return Object.fromEntries(
    demoEntries().map((e) => [
      e.entry_date,
      makeEntry(e.entry_date, {
        score: e.score,
        sub_icon: e.sub_icon,
        flag_color: e.flag_color,
        title: e.title,
        content: e.content,
        keywords: e.keywords,
        photos: e.photos.map((p, i) => ({ id: p.id, position: i, width: 1920, height: 1440 })),
        created_at: e.created_at,
        updated_at: e.updated_at,
      }),
    ]),
  )
}

let calls: ReturnType<typeof mockApi>
beforeEach(() => {
  calls = mockApi(makeMe(), demoStore())
})
// jsdom không áp CSS nên cả bản điện thoại (md:hidden) lẫn bản máy tính đều có trong DOM: lấy phần tử đầu.
afterEach(() => {
  sessionStorage.clear()
  clearDemoWrites()
})

describe('Dòng thời gian', () => {
  it('hiện thống kê, 7 trang mới nhất, xem thêm, và nút Ghi bù ở ngày bỏ trống', async () => {
    renderWithMe([{ path: '/timeline', Component: TimelinePage }], '/timeline?m=2026-10', makeMe())
    expect(await screen.findByRole('heading', { name: 'Dòng thời gian' })).toBeInTheDocument()
    expect(screen.getAllByText('Tháng 10, 2026', { selector: '[aria-live]' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('link', { name: /Chiều mưa đọc sách/ })).toHaveAttribute('href', '/day/2026-10-18')
    expect(screen.getByRole('link', { name: 'Ghi bù ngày 14/10' })).toHaveAttribute('href', '/day/2026-10-14/backfill')
    // Danh sách và lịch/thống kê là hai request song song: tóm tắt trang + lịch tháng (chuỗi ngày tính ở backend).
    expect(calls.map((c) => c.path)).toEqual(expect.arrayContaining(['/entries', '/calendar/2026/10']))

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
    fireEvent.click((await screen.findAllByRole('button', { name: 'Tháng trước, Tháng 9, 2026' }))[0])
    expect((await screen.findAllByText('Tháng 9, 2026', { selector: '[aria-live]' })).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /Xem thêm/ }))
    expect(screen.getByRole('link', { name: /Mưa đầu thu/ })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Về tháng này' }))
    expect(await screen.findByRole('link', { name: /Chiều mưa đọc sách/ })).toBeInTheDocument()
  })
})

describe('Hôm nay chưa viết (thiết kế B8)', () => {
  it('chấm điểm nhanh ngay trên Dòng thời gian, rồi hoàn tác', async () => {
    renderWithMe([{ path: '/timeline', Component: TimelinePage }], '/timeline', makeMe())
    expect(await screen.findByText('Hôm nay bạn chưa viết')).toBeInTheDocument()
    expect(screen.getAllByText(/Viết hôm nay để (lên|bắt đầu)/).length).toBeGreaterThan(0)
    fireEvent.click(screen.getByRole('button', { name: /^Chấm điểm 4, .* cho hôm nay$/ }))
    expect(await screen.findByText('Đã ghi cho hôm nay')).toBeInTheDocument()
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ score: 4, updated_at: null })
    expect(screen.queryByText('Hôm nay bạn chưa viết')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Hoàn tác' }))
    expect(await screen.findByText('Hôm nay bạn chưa viết')).toBeInTheDocument()
    expect(calls.some((c) => c.method === 'DELETE')).toBe(true)
  })
})

describe('Người dùng mới (?demo=empty)', () => {
  it('Dòng thời gian, Year in Pixels và Tìm kiếm hiện màn trống mời viết trang đầu tiên', async () => {
    sessionStorage.setItem('jotly:demo', 'empty') // Year in Pixels, Tìm kiếm còn đọc dữ liệu mẫu (Bước 10–11)
    const me = makeMe({ joined_at: new Date().toISOString() })
    mockApi(me, {})
    const routes = [
      { path: '/timeline', Component: TimelinePage },
      { path: '/pixels', Component: PixelsPage },
      { path: '/search', Component: SearchPage },
    ]
    const { router } = renderWithMe(routes, '/timeline', me)
    expect(await screen.findByRole('heading', { name: 'Trang đầu tiên đang chờ bạn' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Viết trang hôm nay/ })).toHaveAttribute('href', '/today')

    await router.navigate('/pixels')
    expect(await screen.findByRole('heading', { name: 'Tô ô đầu tiên của năm' })).toBeInTheDocument()

    await router.navigate('/search')
    expect(await screen.findByRole('heading', { name: 'Chưa có trang nào để tìm' })).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Bộ lọc' })).not.toBeInTheDocument()
  })
})

describe('Chuỗi bằng 0 (báo cáo rà thiết kế)', () => {
  it('lấy chuỗi dài nhất làm số chính, mời viết hôm nay', async () => {
    renderWithMe([{ path: '/timeline', Component: TimelinePage }], '/timeline', makeMe())
    expect(await screen.findByText('Hôm nay bạn chưa viết')).toBeInTheDocument()
    expect(screen.queryByText('Chuỗi hiện tại')).not.toBeInTheDocument()
    expect(screen.getAllByText('Chuỗi dài nhất').length).toBeGreaterThan(0)
    expect(screen.getAllByText(/Viết hôm nay để bắt đầu/).length).toBeGreaterThan(0)
  })
})
