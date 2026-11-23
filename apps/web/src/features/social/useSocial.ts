import { infiniteQueryOptions, queryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import { entriesKey, friendCodeKey, friendsKey, journalInvitesKey, journalKey, journalsKey, requestsKey, SOCIAL_KEY, type FriendCode, type FriendList, type FriendRequestList, type JournalDetail, type Journal, type JournalInviteList, type JournalList, type SharedEntry, type SharedEntryPage, type SharedEntryWrite } from './social'

export const friendCodeQuery = () => queryOptions({
  queryKey: friendCodeKey(),
  queryFn: async (): Promise<FriendCode> => {
    const { data, error, response } = await api.GET('/me/friend-code')
    if (error || !data) throw toApiError(response, error)
    return data
  },
})

export const friendsQuery = () => queryOptions({
  queryKey: friendsKey(),
  queryFn: async (): Promise<FriendList> => {
    const { data, error, response } = await api.GET('/friends')
    if (error || !data) throw toApiError(response, error)
    return data
  },
})

export const requestsQuery = () => queryOptions({
  queryKey: requestsKey(),
  queryFn: async (): Promise<FriendRequestList> => {
    const { data, error, response } = await api.GET('/friends/requests')
    if (error || !data) throw toApiError(response, error)
    return data
  },
})

export const journalInvitesQuery = () => queryOptions({
  queryKey: journalInvitesKey(),
  queryFn: async (): Promise<JournalInviteList> => {
    const { data, error, response } = await api.GET('/journals/invites')
    if (error || !data) throw toApiError(response, error)
    return data
  },
})

export const journalsQuery = () => queryOptions({
  queryKey: journalsKey(),
  queryFn: async (): Promise<JournalList> => {
    const { data, error, response } = await api.GET('/journals')
    if (error || !data) throw toApiError(response, error)
    return data
  },
})

export const journalDetailQuery = (id: string) => queryOptions({
  queryKey: journalKey(id),
  enabled: Boolean(id),
  queryFn: async (): Promise<JournalDetail> => {
    const { data, error, response } = await api.GET('/journals/{journal_id}', { params: { path: { journal_id: id } } })
    if (error || !data) throw toApiError(response, error)
    return data
  },
})

export const journalEntriesQuery = (id: string) => infiniteQueryOptions({
  queryKey: entriesKey(id),
  enabled: Boolean(id),
  initialPageParam: null as string | null,
  queryFn: async ({ pageParam }): Promise<SharedEntryPage> => {
    const { data, error, response } = await api.GET('/journals/{journal_id}/entries', { params: { path: { journal_id: id }, query: pageParam ? { cursor: pageParam } : {} } })
    if (error || !data) throw toApiError(response, error)
    return data
  },
  getNextPageParam: (page) => page.next_cursor ?? undefined,
})

export function useFriendCode() { return useQuery(friendCodeQuery()) }
export function useFriends() { return useQuery(friendsQuery()) }
export function useFriendRequests() { return useQuery(requestsQuery()) }
export function useJournalInvites() { return useQuery(journalInvitesQuery()) }
export function useJournals() { return useQuery(journalsQuery()) }
export function useJournalDetail(id: string) { return useQuery(journalDetailQuery(id)) }
export function useJournalEntries(id: string) { return useInfiniteQuery(journalEntriesQuery(id)) }

function refreshLists(client: ReturnType<typeof useQueryClient>) {
  void client.invalidateQueries({ queryKey: friendsKey() })
  void client.invalidateQueries({ queryKey: requestsKey() })
  void client.invalidateQueries({ queryKey: journalInvitesKey() })
  void client.invalidateQueries({ queryKey: journalsKey() })
}

export function useRotateFriendCode() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { data, error, response } = await api.POST('/me/friend-code/rotate')
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (data) => client.setQueryData(friendCodeKey(), data),
  })
}

export function useSendFriendRequest() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (code: string) => {
      const { data, error, response } = await api.POST('/friends/requests', { body: { code } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: () => refreshLists(client),
  })
}

function useRequestDecision(action: 'accept' | 'decline') {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `social:request:${action}` },
    mutationFn: async (requestId: string) => {
      const result = action === 'accept'
        ? await api.POST('/friends/requests/{request_id}/accept', { params: { path: { request_id: requestId } } })
        : await api.POST('/friends/requests/{request_id}/decline', { params: { path: { request_id: requestId } } })
      if (result.error) throw toApiError(result.response, result.error)
    },
    onSuccess: () => refreshLists(client),
  })
}

export function useAcceptFriendRequest() { return useRequestDecision('accept') }
export function useDeclineFriendRequest() { return useRequestDecision('decline') }

export function useInviteJournal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { data, error, response } = await api.POST('/friends/{friend_id}/journal-invite', { params: { path: { friend_id: friendId } } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: () => refreshLists(client),
  })
}

function useJournalInviteDecision(action: 'accept' | 'decline') {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `social:journal-invite:${action}` },
    mutationFn: async (inviteId: string) => {
      const result = action === 'accept'
        ? await api.POST('/journals/invites/{invite_id}/accept', { params: { path: { invite_id: inviteId } } })
        : await api.POST('/journals/invites/{invite_id}/decline', { params: { path: { invite_id: inviteId } } })
      if (result.error) throw toApiError(result.response, result.error)
    },
    onSuccess: () => refreshLists(client),
  })
}

export function useAcceptJournalInvite() { return useJournalInviteDecision('accept') }
export function useDeclineJournalInvite() { return useJournalInviteDecision('decline') }

export function useEndJournal() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (journalId: string) => {
      const { error, response } = await api.DELETE('/friends/{journal_id}', { params: { path: { journal_id: journalId } } })
      if (error) throw toApiError(response, error)
    },
    onSuccess: (_, journalId) => {
      void client.invalidateQueries({ queryKey: journalsKey() })
      void client.invalidateQueries({ queryKey: friendsKey() })
      void client.invalidateQueries({ queryKey: journalKey(journalId) })
    },
  })
}

export function useUnfriend() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (friendId: string) => {
      const { error, response } = await api.DELETE('/friends/{friend_id}/friendship', { params: { path: { friend_id: friendId } } })
      if (error) throw toApiError(response, error)
    },
    onSuccess: () => refreshLists(client),
  })
}

export function useSetJournalMode(journalId: string) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (mode: 'together' | 'alternating'): Promise<Journal> => {
      const { data, error, response } = await api.POST('/journals/{journal_id}/mode', { params: { path: { journal_id: journalId } }, body: { mode } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (journal) => {
      client.setQueryData(journalKey(journalId), (prev: JournalDetail | undefined) => (prev ? { ...prev, ...journal } : prev))
      void client.invalidateQueries({ queryKey: journalsKey() })
    },
  })
}

export function useSaveSharedEntry(journalId: string, day: string) {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `social:journal:${journalId}` },
    mutationFn: async (body: SharedEntryWrite): Promise<SharedEntry> => {
      const { data, error, response } = await api.PUT('/journals/{journal_id}/entries/{day}', { params: { path: { journal_id: journalId, day } }, body })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (entry) => {
      client.setQueryData([...SOCIAL_KEY, 'entry', journalId, day], entry)
      void client.invalidateQueries({ queryKey: entriesKey(journalId) })
      void client.invalidateQueries({ queryKey: journalKey(journalId) })
      void client.invalidateQueries({ queryKey: journalsKey() })
    },
  })
}

export function useRefreshJournalEntries(journalId: string) {
  const client = useQueryClient()
  return () => {
    void client.invalidateQueries({ queryKey: entriesKey(journalId) })
    void client.invalidateQueries({ queryKey: journalKey(journalId) })
    void client.invalidateQueries({ queryKey: journalsKey() })
  }
}

export function useDeleteSharedEntry(journalId: string) {
  const client = useQueryClient()
  return useMutation({
    scope: { id: `social:journal:${journalId}` },
    mutationFn: async (day: string) => {
      const { error, response } = await api.DELETE('/journals/{journal_id}/entries/{day}', { params: { path: { journal_id: journalId, day } } })
      if (error) throw toApiError(response, error)
    },
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: entriesKey(journalId) })
      void client.invalidateQueries({ queryKey: journalKey(journalId) })
    },
  })
}
