import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api, ApiError, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { defaultIconSetId, presetFlag } from './catalog'
import { tierLimits } from './limits'
import { browserTimeZone } from './date'

/**
 * Hồ sơ người dùng đang đăng nhập (GET /me, key ['me']). Dùng chung cho mọi màn trong app,
 * nên đặt ở lib/ thay vì một feature.
 */
export type Me = components['schemas']['MeOut']
export type MeUpdate = components['schemas']['MeUpdate']

export type Profile = {
  displayName: string
  email: string
  avatarUrl: string | null
  /** Bộ icon vẽ cho mọi ngày (users.icon_set_id). */
  iconSetId: string
  timeZone: string
  onboarded: boolean
  /** Màu cờ người dùng tự thêm từ bảng pha màu (#RRGGBB), theo thứ tự thêm. */
  customFlagColors: string[]
}

export const ME_KEY = ['me'] as const

/** Giá trị tạm khi chưa có /me (đang tải, trang dev không cần đăng nhập, test). */
const FALLBACK: Profile = {
  displayName: 'Bạn',
  email: '',
  avatarUrl: null,
  iconSetId: defaultIconSetId,
  timeZone: browserTimeZone(),
  onboarded: false,
  customFlagColors: [],
}

export function toProfile(me: Me): Profile {
  return {
    displayName: me.display_name,
    email: me.email,
    avatarUrl: me.avatar_url,
    iconSetId: me.icon_set_id,
    timeZone: me.timezone,
    onboarded: me.onboarded,
    customFlagColors: me.custom_flag_colors,
  }
}

async function fetchMe(): Promise<Me> {
  const { data, error, response } = await api.GET('/me')
  if (error || !data) throw toApiError(response, error)
  return data
}

/** Chỉ thử lại lỗi tạm thời (mất mạng, 429, 5xx); 401/403 trả ngay để chuyển về /login. */
export function shouldRetryMe(failureCount: number, error: unknown): boolean {
  if (failureCount >= 3) return false
  if (!(error instanceof ApiError)) return true
  return error.status === 429 || error.status >= 500
}

export const meRetryDelay = (attempt: number) => Math.min(2000 * 2 ** attempt, 15_000)

// Cách thử lại của /me đặt ở QueryClient của app (lib/query.ts) để test dùng client riêng, không thử lại.
export function useMe() {
  return useQuery({ queryKey: ME_KEY, queryFn: fetchMe, staleTime: 5 * 60_000 })
}

/** Hồ sơ hiện tại; trong vùng đã đăng nhập (RequireAuth) luôn có dữ liệu thật. */
export function useProfile(): Profile {
  const { data } = useMe()
  return data ? toProfile(data) : FALLBACK
}

/** PATCH /me; thành công thì ghi thẳng kết quả vào cache ['me'] (không tải lại). */
export function useUpdateProfile() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: async (body: MeUpdate) => {
      // openapi-fetch coi trường chỉ nhận null (avatar_url: gỡ ảnh) là never; kiểu MeUpdate sinh từ OpenAPI đã đúng.
      const { data, error, response } = await api.PATCH('/me', { body: body as never })
      if (error || !data) throw toApiError(response, error)
      return data
    },
    onSuccess: (me) => client.setQueryData(ME_KEY, me),
  })
}

/**
 * Màu cờ tùy chỉnh (chốt Q6): thêm khi chọn cờ, gỡ trong Hồ sơ. PATCH /me thay cả danh sách.
 * Màu có sẵn hoặc đã có thì không thêm lại; đủ số màu tối đa (limits.json) thì `canAdd` = false.
 */
export function useCustomFlagColors() {
  const { data } = useMe()
  const save = useUpdateProfile()
  const colors = data?.custom_flag_colors ?? []
  const max = tierLimits(data?.account_tier).profile.custom_flag_colors_max
  const has = (hex: string) => colors.some((c) => c.toLowerCase() === hex.toLowerCase())
  return {
    colors,
    max,
    canAdd: Boolean(data) && colors.length < max,
    pending: save.isPending,
    add(hex: string) {
      if (!data || presetFlag(hex) || has(hex) || colors.length >= max) return
      save.mutate({ custom_flag_colors: [...colors, hex.toUpperCase()] })
    },
    remove(hex: string) {
      if (!has(hex)) return
      save.mutate({ custom_flag_colors: colors.filter((c) => c.toLowerCase() !== hex.toLowerCase()) })
    },
  }
}

/** "Minh An" → "MA"; một chữ → chữ cái đầu. */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return '?'
  const picked = words.length === 1 ? [words[0]] : [words[0], words[words.length - 1]]
  return picked.map((w) => w[0]!.toLocaleUpperCase('vi')).join('')
}
