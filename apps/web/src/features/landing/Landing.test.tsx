import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { HomePage } from '@/routes/HomePage'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'
import { LookBack } from './LookBack'
import { OneTapGuest } from './OneTapDemo'
import { greeting, summarize } from './useHomeSummary'

describe('Tóm tắt trang chủ', () => {
  it('đếm ngày đã ghi trong tháng và chuỗi; hôm nay chưa ghi thì chuỗi tính tới hôm qua', () => {
    const day = (entry_date: string, score: 1 | 2 | 3 | 4 | 5 = 3) => ({ entry_date, score, sub_icon: null })
    const s = summarize(['2026-09-30', '2026-10-01', '2026-10-03', '2026-10-04', '2026-10-05'].map((d) => day(d)), '2026-10-06')
    expect(s).toMatchObject({ recorded: 4, daysSoFar: 6, streak: 3, todayWritten: false })
    // Lịch xem trước dùng đúng các ngày đã đếm (không lệch với dòng "đã ghi X/Y ngày").
    expect(Object.keys(s.days).map(Number)).toEqual([1, 3, 4, 5])
    expect(summarize([day('2026-10-05'), day('2026-10-06', 5)], '2026-10-06')).toMatchObject({
      streak: 2,
      todayWritten: true,
      days: { 6: { score: 5 } },
    })
  })

  it('lời chào theo giờ ở múi giờ hồ sơ', () => {
    const at = new Date('2026-10-18T14:00:00Z') // 21:00 ở Việt Nam
    expect(greeting('Minh An', 'Asia/Ho_Chi_Minh', at)).toBe('Chào buổi tối, Minh An')
    expect(greeting('Minh An', 'America/Los_Angeles', at)).toBe('Chào buổi sáng, Minh An')
    // 0h–5h không còn là "buổi tối".
    expect(greeting('Minh An', 'Asia/Ho_Chi_Minh', new Date('2026-10-18T19:30:00Z'))).toBe('Khuya rồi, Minh An')
  })
})

describe('Trang chủ', () => {
  it('chưa đăng nhập: nút Google và "Bắt đầu viết", không có menu tài khoản', async () => {
    renderWithMe([{ path: '/', Component: HomePage }], '/', null)
    expect(await screen.findAllByRole('link', { name: 'Tiếp tục với Google' })).toHaveLength(2)
    expect(screen.getByRole('link', { name: 'Bắt đầu viết' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tài khoản của/ })).not.toBeInTheDocument()
    // Hai bộ chọn: ở đầu trang (từ màn sm) và ở chân trang (điện thoại).
    for (const button of screen.getAllByRole('button', { name: 'Tiếng Việt' })) expect(button).toHaveAttribute('aria-pressed', 'true')
    for (const button of screen.getAllByRole('button', { name: 'English' })) expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('bấm EN: trang chủ đổi sang tiếng Anh và nhớ lựa chọn', async () => {
    renderWithMe([{ path: '/', Component: HomePage }], '/', null)
    fireEvent.click((await screen.findAllByRole('button', { name: 'English' }))[0])
    expect(await screen.findByRole('link', { name: 'Start writing' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Bắt đầu viết' })).not.toBeInTheDocument()
    for (const button of screen.getAllByRole('button', { name: 'English' })) expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(localStorage.getItem('jotly.lang')).toBe('en')
  })

  it('đã đăng nhập: lời chào, "Mở nhật ký", menu tài khoản có Đăng xuất', async () => {
    const me = makeMe()
    const calls = mockApi(me)
    renderWithMe([{ path: '/', Component: HomePage }], '/', me)
    expect(await screen.findByRole('link', { name: /(Chào buổi .*|Khuya rồi), Minh An/ })).toHaveAttribute('href', '/profile')
    expect(screen.getByRole('link', { name: 'Mở nhật ký' })).toHaveAttribute('href', '/today')
    expect(screen.queryByRole('link', { name: 'Tiếp tục với Google' })).not.toBeInTheDocument()

    const trigger = screen.getByRole('button', { name: 'Tài khoản của Minh An' })
    fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false })
    const logout = await screen.findByRole('menuitem', { name: 'Đăng xuất' })
    expect(screen.getByRole('menuitem', { name: /Dòng thời gian/ })).toHaveAttribute('href', '/timeline')
    fireEvent.click(logout)
    await waitFor(() => expect(calls.some((c) => c.path === '/auth/logout')).toBe(true))
    // Đăng xuất ngay tại trang chủ: trang đổi sang bản chưa đăng nhập, không còn tên người cũ.
    // Chuỗi đăng xuất → chuyển trang → tải lại /me → vẽ lại: khi cả bộ test chạy song song có thể quá 1 giây.
    expect(await screen.findAllByRole('link', { name: 'Tiếp tục với Google' }, { timeout: 10_000 })).toHaveLength(2)
    expect(screen.queryByText(/Minh An/)).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Tài khoản của/ })).not.toBeInTheDocument()
  })

  it('đã đăng nhập: tóm tắt tháng đọc lịch tháng (GET /calendar), chuỗi ngày lấy từ backend', async () => {
    const me = makeMe()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.timezone }).format(new Date())
    const [y, m, d] = today.split('-').map(Number)
    const calls = mockApi(me, { [today]: makeEntry(today, { score: 5 }) })
    renderWithMe([{ path: '/', Component: HomePage }], '/', me)
    expect(await screen.findByText(`Tháng này bạn đã ghi 1/${d} ngày · chuỗi hiện tại 1 ngày.`)).toBeInTheDocument()
    expect(calls.some((c) => c.path === `/calendar/${y}/${m}`)).toBe(true)
  })

  it('chưa đăng nhập: không gọi API lịch tháng', async () => {
    const paths: string[] = []
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      paths.push(new URL((input as Request).url).pathname)
      return new Response(JSON.stringify({ error: { code: 'AUTH_REQUIRED', message: 'Bạn cần đăng nhập' } }), { status: 401 })
    })
    renderWithMe([{ path: '/', Component: HomePage }], '/', null)
    expect(await screen.findAllByRole('link', { name: 'Tiếp tục với Google' })).toHaveLength(2)
    expect(paths.some((p) => p.startsWith('/calendar'))).toBe(false)
  })

  it('đã đăng nhập: chọn một ngày trống trong tuần rồi chấm điểm thì lưu ghi bù cho đúng ngày đó', async () => {
    const me = makeMe()
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: me.timezone }).format(new Date())
    const calls = mockApi(me)
    renderWithMe([{ path: '/', Component: HomePage }], '/', me)
    const week = await screen.findByRole('group', { name: 'Chọn một ngày trong tuần' })
    const days = within(week).getAllByRole('button')
    expect(days).toHaveLength(7)
    fireEvent.click(days[4])
    const past = days[4].getAttribute('aria-label')!.replace(', chưa ghi', '')
    expect(await screen.findByText('Ngày này còn trống. Chạm một mức để ghi bù.')).toBeInTheDocument()
    // Nút chấm của thẻ "Một chạm" (ScorePicker, có data-score); chờ trang của ngày đó tải xong mới bật.
    const three = () => document.querySelector<HTMLButtonElement>('[data-score="3"]')!
    await waitFor(() => expect(three()).toBeEnabled())
    fireEvent.click(three())
    const date = days[4].getAttribute('data-date')
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.path === `/entries/${date}`)).toBe(true))
    expect(date).not.toBe(today)
    expect(past).toMatch(/^\S+( \S+)? \d+\/\d+$/)
  })
})

describe('Một chạm (khách, dữ liệu mẫu)', () => {
  it('chọn 14/10 còn trống rồi chấm điểm thì thành ghi bù; "Quay về hôm nay" đưa về hôm nay', () => {
    render(<OneTapGuest />)
    expect(screen.getByText('Chạm một mức là hôm nay đã được ghi.')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Thứ Tư 14/10, chưa ghi' }))
    expect(screen.getByText('Thứ Tư, 14/10 của bạn thế nào?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Điểm 5, Nở rộ' }))
    expect(screen.getByRole('status')).toHaveTextContent('Ghi bùĐã ghi bù 14/10: điểm 5 · Nở rộ.')
    expect(screen.getByRole('button', { name: 'Thứ Tư 14/10, điểm 5, ghi bù' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Quay về hôm nay' }))
    expect(screen.getByText('Hôm nay của bạn thế nào?')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Điểm 4, Hé nở' }))
    expect(screen.getByRole('status')).toHaveTextContent('Điểm 4 · Hé nở. Đã ghi lại hôm nay.')
  })
})

describe('Nhìn lại', () => {
  it('chọn tab hoặc dùng mũi tên thì đổi phần, phần không hiện bị ẩn khỏi trình đọc màn hình', () => {
    render(<LookBack />)
    const day = screen.getByRole('tab', { name: 'Ngày' })
    expect(day).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Phần trước' })).toBeDisabled()
    fireEvent.click(screen.getByRole('tab', { name: 'Năm' }))
    expect(screen.getByRole('tab', { name: 'Năm' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('button', { name: 'Phần sau' })).toBeDisabled()
    expect(document.getElementById('f2-slide-0')).toHaveAttribute('aria-hidden', 'true')
    fireEvent.keyDown(screen.getByRole('tablist'), { key: 'Home' })
    expect(day).toHaveAttribute('aria-selected', 'true')
    expect(day).toHaveFocus()
  })
})

