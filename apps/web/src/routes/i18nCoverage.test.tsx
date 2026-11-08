import { screen, waitFor } from '@testing-library/react'
import type { RouteObject } from 'react-router'
import { beforeEach, describe, expect, it } from 'vitest'
import { setLanguage } from '@/lib/i18n'
import { DayEditPage } from '@/routes/DayEditPage'
import { DayPage } from '@/routes/DayPage'
import { HomePage } from '@/routes/HomePage'
import { LoginPage } from '@/routes/LoginPage'
import { NotFoundPage } from '@/routes/NotFoundPage'
import { OnboardingPage } from '@/routes/OnboardingPage'
import { PixelsPage } from '@/routes/PixelsPage'
import { ProfilePage } from '@/routes/ProfilePage'
import { SearchPage } from '@/routes/SearchPage'
import { SharedListPage } from '@/routes/SharedListPage'
import { TimelinePage } from '@/routes/TimelinePage'
import { TodayPage } from '@/routes/TodayPage'
import { TrashPage } from '@/routes/TrashPage'
import { makeEntry, makeMe, mockApi, renderWithMe } from '@/test/withMe'

// Ký tự chỉ có trong tiếng Việt: thấy trên màn English là còn chữ chưa dịch.
const VIETNAMESE = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i
// Chữ được phép còn tiếng Việt: tên ngôn ngữ trong ô chọn, tên người dùng mẫu.
const ALLOWED = /Tiếng Việt|Minh An|Nguyễn Minh An/g

const SAMPLE_TITLE = 'Chiều mưa đọc sách' // nội dung do người dùng viết: giữ nguyên

function visibleText(): string {
  const parts = [document.body.textContent ?? '']
  // aria-label, title, placeholder, alt cũng là chữ người dùng nghe/thấy.
  for (const el of Array.from(document.body.querySelectorAll('[aria-label],[title],[placeholder],[alt]'))) {
    for (const attr of ['aria-label', 'title', 'placeholder', 'alt']) parts.push(el.getAttribute(attr) ?? '')
  }
  return parts.join('\n').replaceAll(SAMPLE_TITLE, '').replace(ALLOWED, '')
}

function expectNoVietnamese() {
  const text = visibleText()
  const global = new RegExp(VIETNAMESE.source, 'gi')
  const hits = [...text.matchAll(global)].map((m) => text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, ' '))
  expect(hits.slice(0, 5), 'còn chữ Việt trên màn English (đoạn quanh ký tự tìm thấy)').toEqual([])
}

const SCREENS: { name: string; route: RouteObject; path: string; guest?: boolean; ready: RegExp | string }[] = [
  { name: 'trang chủ (khách)', route: { path: '/', Component: HomePage }, path: '/', guest: true, ready: /Start writing/ },
  { name: 'trang chủ (đã đăng nhập)', route: { path: '/', Component: HomePage }, path: '/', ready: /My journal/ },
  { name: 'đăng nhập', route: { path: '/login', Component: LoginPage }, path: '/login', guest: true, ready: /Google/ },
  { name: 'Hôm nay', route: { path: '/today', Component: TodayPage }, path: '/today', ready: /left before|Today/ },
  { name: 'chi tiết ngày', route: { path: '/day/:date', Component: DayPage }, path: '/day/2026-10-18', ready: SAMPLE_TITLE },
  { name: 'sửa ngày', route: { path: '/day/:date/edit', Component: DayEditPage }, path: '/day/2026-10-18/edit', ready: /Save/ },
  { name: 'Dòng thời gian', route: { path: '/timeline', Component: TimelinePage }, path: '/timeline', ready: /Timeline|Month/ },
  { name: 'Year in Pixels', route: { path: '/pixels', Component: PixelsPage }, path: '/pixels', ready: /Year in Pixels|pixels/i },
  { name: 'Tìm kiếm', route: { path: '/search', Component: SearchPage }, path: '/search', ready: /Search/ },
  { name: 'Hồ sơ', route: { path: '/profile', Component: ProfilePage }, path: '/profile', ready: /Profile|Language/ },
  { name: 'Đang chia sẻ', route: { path: '/profile/shares', Component: SharedListPage }, path: '/profile/shares', ready: /shar/i },
  { name: 'Thùng rác', route: { path: '/profile/trash', Component: TrashPage }, path: '/profile/trash', ready: /Trash/ },
  { name: 'Onboarding', route: { path: '/onboarding', Component: OnboardingPage }, path: '/onboarding', ready: /Name|photo/i },
  { name: '404', route: { path: '*', Component: NotFoundPage }, path: '/khong-co', ready: /page|Page/ },
]

describe('Giao diện English không còn chữ Việt', () => {
  beforeEach(async () => {
    await setLanguage('en')
  })

  for (const screenCase of SCREENS) {
    it(screenCase.name, async () => {
      const me = screenCase.guest ? null : makeMe({ onboarded: screenCase.name !== 'Onboarding' } as never)
      if (me) {
        mockApi(me, {
          '2026-10-17': makeEntry('2026-10-17', { score: 3 }),
          '2026-10-18': makeEntry('2026-10-18', { score: 4, title: SAMPLE_TITLE, content: 'Rain all afternoon.', keywords: ['rain'] }),
        })
      }
      renderWithMe([screenCase.route], screenCase.path, me)
      await waitFor(() => expect(screen.getAllByText(screenCase.ready).length).toBeGreaterThan(0), { timeout: 5000 })
      expectNoVietnamese()
    })
  }
})
