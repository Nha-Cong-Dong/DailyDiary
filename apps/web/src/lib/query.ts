import { QueryClient } from '@tanstack/react-query'
import { ME_KEY, meRetryDelay, shouldRetryMe } from './profile'

export function createQueryClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1, refetchOnWindowFocus: false },
    },
  })
  // /me lỗi tạm thời (mất mạng, 429, 5xx) thì thử lại vài lần trước khi hiện màn lỗi.
  client.setQueryDefaults(ME_KEY, { retry: shouldRetryMe, retryDelay: meRetryDelay })
  return client
}
