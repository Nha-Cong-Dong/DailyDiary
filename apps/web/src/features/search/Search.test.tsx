import { fireEvent, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SearchPage } from '@/routes/SearchPage'
import { makeMe, renderWithMe } from '@/test/withMe'

describe('Tìm kiếm khi chưa gõ (báo cáo rà thiết kế)', () => {
  it('gợi ý từ khóa hay dùng cỡ lớn và ba trang gần nhất', async () => {
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
  })
})
