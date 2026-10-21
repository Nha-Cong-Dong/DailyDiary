import { fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { HomePage } from '@/routes/HomePage'
import { makeMe, mockApi, renderWithMe } from '@/test/withMe'
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
    expect(screen.getByRole('button', { name: 'English, sắp có' })).toBeDisabled()
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
  })
})
