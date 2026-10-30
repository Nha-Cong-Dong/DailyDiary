import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { describe, expect, it } from 'vitest'
import { DayClock } from './DayClock'
import { MonthStrip } from './MonthStrip'

function renderStrip() {
  const router = createMemoryRouter(
    [
      {
        path: '/',
        Component: () => (
          <MonthStrip
            today="2026-10-30"
            iconSetId="sprout"
            todayScore={4}
            todaySub={null}
            recent={{ days: { '2026-10-29': { score: 3, sub_icon: null } }, monthRecorded: 1, monthScoreSum: 3 }}
          />
        ),
      },
    ],
    { initialEntries: ['/'] },
  )
  render(<RouterProvider router={router} />)
}

describe('MonthStrip', () => {
  it('vẽ cả tháng; ngày chưa tới không bấm được, ngày trống đã qua mời ghi bù', () => {
    renderStrip()
    expect(screen.getAllByRole('listitem')).toHaveLength(31)
    expect(screen.getByRole('button', { name: '30/10 · hôm nay · điểm 4' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '29/10 · điểm 3' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '28/10 · chưa ghi, chạm để ghi bù' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^31\/10/ })).not.toBeInTheDocument()
    // Tóm tắt cộng cả điểm hôm nay đang chấm trên màn: (3 + 4) / 2.
    expect(screen.getByText('Đã ghi 2/30 ngày · trung bình 3,5')).toBeInTheDocument()
  })
})

describe('DayClock', () => {
  it('đếm ngược tới nửa đêm theo múi giờ hồ sơ, không theo máy', () => {
    // 14:04Z = 21:04 ở Việt Nam, còn 2 giờ 56 phút; cùng lúc đó ở Los Angeles là 07:04, còn 16 giờ 56 phút.
    const { rerender } = render(<DayClock timeZone="Asia/Ho_Chi_Minh" now={new Date('2026-10-18T14:04:00Z')} />)
    expect(screen.getByText('2 giờ 56 phút')).toBeInTheDocument()
    rerender(<DayClock timeZone="America/Los_Angeles" now={new Date('2026-10-18T14:04:00Z')} />)
    expect(screen.getByText('16 giờ 56 phút')).toBeInTheDocument()
  })
})
