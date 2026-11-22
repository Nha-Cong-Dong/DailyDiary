import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'

type Letter = components['schemas']['LetterOut']
type LetterWrite = components['schemas']['LetterWrite']

export const LETTERS_KEY = ['letters'] as const

/** Danh sách thư của tôi (thư sắp mở đứng trước). */
export function useLetters() {
  return useQuery({
    queryKey: LETTERS_KEY,
    queryFn: async (): Promise<Letter[]> => {
      const { data, error, response } = await api.GET('/letters')
      if (error || !data) throw toApiError(response, error)
      return data.letters
    },
  })
}

/** Ghi một lá thư, hẹn ngày mở (phải là ngày sau hôm nay). */
export function useCreateLetter() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: LetterWrite): Promise<Letter> => {
      const { data, error, response } = await api.POST('/letters', { body })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (letter) => {
      client.setQueryData<Letter[]>(LETTERS_KEY, (prev = []) => [...prev, letter])
    },
  })
}

/** Xóa hẳn một lá thư. */
export function useDeleteLetter() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (letterId: string) => {
      const { error, response } = await api.DELETE('/letters/{letter_id}', { params: { path: { letter_id: letterId } } })
      if (error) throw toApiError(response, error)
    },
    onSuccess: (_, letterId) => {
      client.setQueryData<Letter[]>(LETTERS_KEY, (prev = []) => prev.filter((l) => l.id !== letterId))
    },
  })
}
