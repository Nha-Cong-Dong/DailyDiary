import { fireEvent, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { renderWithMe } from '@/test/withMe'
import { SocialPage } from './SocialPage'

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

const journal = {
  id: 'journal-1', partner_display_name: 'Bạn A', partner_avatar_url: null,
  status: 'active', mode: 'together', generation: 1, ended_at: null, warm_streak: 3,
  synced_days: 5, longest_warm_streak: 9, my_today_entry: false, my_turn: true,
  partner_last_active: '2025-01-01T00:00:00Z', created_at: '2025-01-01T00:00:00Z',
}

function mockSocial(
  friends: { friends: unknown[]; friends_count: number; friends_max: number; journals_count: number; journals_max: number },
  requests: { incoming: unknown[]; outgoing: unknown[] },
  journalInvites?: { incoming: unknown[]; outgoing: unknown[] },
) {
  const invites = journalInvites ?? { incoming: [], outgoing: [] }
  const paths: string[] = []
  const fetchMock = vi.fn(async (input: Request) => {
    const url = new URL(input.url)
    paths.push(`${input.method} ${url.pathname}`)
    if (url.pathname === '/me/friend-code') return jsonResponse({ friend_code: 'ABCD1234' })
    if (url.pathname === '/friends') return jsonResponse(friends)
    if (url.pathname === '/friends/requests' && input.method === 'GET') return jsonResponse(requests)
    if (url.pathname === '/journals/invites') return jsonResponse(invites)
    if (url.pathname === '/journals') return jsonResponse({ journals: friends.journals_count ? [journal] : [], journals_count: friends.journals_count, journals_max: friends.journals_max })
    if (url.pathname === '/friends/friend-1/friendship' && input.method === 'DELETE') return new Response(null, { status: 204 })
    if (url.pathname === '/friends/requests/req-1/accept') return new Response(null, { status: 204 })
    if (url.pathname === '/journals/invites/inv-1/accept') return new Response(null, { status: 204 })
    return jsonResponse({ error: { code: 'NOT_FOUND', message: 'Không tìm thấy' } }, 404)
  })
  vi.stubGlobal('fetch', fetchMock)
  return { fetchMock, paths }
}

const emptyFriends = { friends: [], friends_count: 0, friends_max: 20, journals_count: 0, journals_max: 10 }

describe('SocialPage', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: vi.fn(async () => {}) } })
  })
  afterEach(() => vi.unstubAllGlobals())

  it('shows an empty state when no shared journals exist', async () => {
    mockSocial(emptyFriends, { incoming: [], outgoing: [] })
    renderWithMe([{ path: '/', Component: SocialPage }], '/')
    expect(await screen.findByText('Bắt đầu viết cùng nhau')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Bạn bè' })).toBeInTheDocument()
  })

  it('disables the invite button when the friend limit is reached', async () => {
    mockSocial({ ...emptyFriends, friends_count: 20, friends_max: 20 }, { incoming: [], outgoing: [] })
    renderWithMe([{ path: '/', Component: SocialPage }], '/')
    expect(await screen.findByRole('button', { name: /Gửi lời mời/i })).toBeDisabled()
  })

  it('accepts an incoming friend request', async () => {
    const { paths } = mockSocial({ ...emptyFriends, journals_count: 1 }, { incoming: [{ id: 'req-1', direction: 'incoming', display_name: 'Người mời', avatar_url: null, status: 'pending', created_at: '2025-01-01T00:00:00Z', expires_at: '2025-02-01T00:00:00Z' }], outgoing: [] })
    renderWithMe([{ path: '/', Component: SocialPage }], '/')
    fireEvent.click(await screen.findByRole('button', { name: 'Chấp nhận' }))
    await waitFor(() => expect(paths).toContain('POST /friends/requests/req-1/accept'))
  })

  it('unfriends from the friend menu after confirming', async () => {
    const friend = { id: 'friend-1', display_name: 'Bạn A', avatar_url: null, journal_id: null, journal_status: null, journal_invite_pending: false, last_active: null }
    const { paths } = mockSocial({ ...emptyFriends, friends: [friend], friends_count: 1 }, { incoming: [], outgoing: [] })
    renderWithMe([{ path: '/', Component: SocialPage }], '/')
    fireEvent.keyDown(await screen.findByRole('button', { name: 'Tùy chọn bạn bè' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: /Hủy kết bạn/ }))
    expect(paths).not.toContain('DELETE /friends/friend-1/friendship')
    fireEvent.click(await screen.findByRole('button', { name: 'Hủy kết bạn' }))
    await waitFor(() => expect(paths).toContain('DELETE /friends/friend-1/friendship'))
  })

  it('accepts an incoming journal invite', async () => {
    const invite = { id: 'inv-1', direction: 'incoming', display_name: 'Bạn A', avatar_url: null, status: 'pending', created_at: '2025-01-01T00:00:00Z', expires_at: '2025-02-01T00:00:00Z' }
    const { paths } = mockSocial({ ...emptyFriends, journals_count: 0 }, { incoming: [], outgoing: [] }, { incoming: [invite], outgoing: [] })
    renderWithMe([{ path: '/', Component: SocialPage }], '/')
    expect(await screen.findByText('Lời mời mở sổ chung')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Chấp nhận mở sổ' }))
    await waitFor(() => expect(paths).toContain('POST /journals/invites/inv-1/accept'))
  })
})
