import { useMutation } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'

/** POST /feedback: lưu góp ý và gửi email về hộp thư của Jotly (F-09). */
export function useSendFeedback() {
  return useMutation({
    mutationFn: async (message: string) => {
      const { data, error, response } = await api.POST('/feedback', { body: { message } })
      if (error || !data) throw toApiError(response, error)
      return data
    },
  })
}
