import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SearchPage } from '@/routes/SearchPage'
import { demoEntries } from '@/lib/demo'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'

// Dữ liệu mẫu đưa qua API giả: màn Tìm kiếm gọi GET /search, /keywords/top, /entries?month, /pixels như bản thật.
function demoStore() {
  return Object.fromEntries(
    demoEntries().map((e) => [
      e.entry_date,
      makeEntry(e.entry_date, {
        score: e.score,
        title: e.title,
        content: e.content,
        keywords: e.keywords,
        sub_icon: e.sub_icon,
        photos: e.photos.map((p, i) => ({ id: p.id, position: i, width: 1, height: 1 })),
      }),
    ]),
  )
}

describe('Tìm kiếm khi chưa gõ (báo cáo rà thiết kế)', () => {
  it('gợi ý từ khóa hay dùng cỡ lớn và ba trang gần nhất', async () => {
    const calls = mockApi(makeMe(), demoStore())
    renderWithMe([{ path: '/search', Component: SearchPage }], '/search', makeMe())
    expect(await screen.findByRole('heading', { name: 'Bạn muốn tìm lại điều gì?' })).toBeInTheDocument()

    const recent = (await screen.findByRole('heading', { name: 'Trang gần đây' })).parentElement!
    const links = recent.querySelectorAll('a')
    expect(links).toHaveLength(3)
    expect(links[0]).toHaveAttribute('href', '/day/2026-10-18')

    const topHeading = await screen.findByRole('heading', { name: 'Từ khóa hay dùng' })
    const first = topHeading.parentElement!.querySelector('button')!
    fireEvent.click(first)
    expect(await screen.findByText(/kết quả cho “/)).toBeInTheDocument()
    // Từ khóa chỉ đi trong query string của request API, không lên URL của trang.
    expect(calls.some((c) => c.path === '/search')).toBe(true)
    expect(window.location.search).toBe('')
  })
})
