import { useQuery } from '@tanstack/react-query'
import { api, toApiError } from '@/api/client'
import type { components } from '@/api/schema'
import { megabytesLabel } from './image'

export type DataSummary = components['schemas']['DataSummaryOut']

/** Key dưới ['entries']: viết/xóa trang hay xóa toàn bộ dữ liệu thì đếm lại. */
export const DATA_SUMMARY_KEY = ['entries', 'data-summary'] as const

/**
 * Tóm tắt dữ liệu của chính người dùng (GET /me/data-summary): số trang, ảnh, link chia sẻ sẽ mất khi xóa và dung lượng
 * ảnh đã dùng so với hạn mức. Dùng chung cho Hồ sơ (features/profile) và ô ảnh (components/diary).
 */
export function useDataSummary() {
  return useQuery<DataSummary>({
    queryKey: DATA_SUMMARY_KEY,
    queryFn: async () => {
      const { data, error, response } = await api.GET('/me/data-summary')
      if (error || !data) throw toApiError(response, error)
      return data
    },
    // Ô ảnh mở ở nhiều màn: không đọc lại mỗi lần mở; ô ảnh tự làm mới sau khi thêm/bỏ ảnh.
    staleTime: 60_000,
  })
}

export type StorageUsage = {
  usedBytes: number
  quotaBytes: number
  /** 0–1 (chặn ở 1 để vẽ thanh tiến độ). */
  ratio: number
  /** Đạt ngưỡng cảnh báo `warn_ratio` (mục 4.5 của đặc tả: 80%). */
  warn: boolean
  /** Đã hết hạn mức: máy chủ sẽ từ chối ảnh mới (STORAGE_QUOTA). */
  full: boolean
  /** "X MB / 500 MB" */
  label: string
}

/**
 * Dung lượng ảnh từ số liệu máy chủ. Hạn mức và ngưỡng theo cấp tài khoản do máy chủ trả (đọc từ shared/limits.json),
 * nên không cần đoán cấp ở đây. Ảnh đại diện không tính vào hạn mức.
 */
export function storageUsage(summary: Pick<DataSummary, 'used_bytes' | 'quota_bytes' | 'warn_ratio'>): StorageUsage {
  const { used_bytes: usedBytes, quota_bytes: quotaBytes, warn_ratio: warnRatio } = summary
  const raw = quotaBytes > 0 ? usedBytes / quotaBytes : 1
  return {
    usedBytes,
    quotaBytes,
    ratio: Math.min(1, raw),
    warn: raw >= warnRatio,
    full: usedBytes >= quotaBytes,
    label: `${usedLabel(usedBytes)} / ${megabytesLabel(quotaBytes)}`,
  }
}

/** Dung lượng đã dùng: dưới 0,1 MB mà khác 0 thì ghi "< 0,1 MB" để khỏi hiện "0 MB" khi đã có ảnh. */
function usedLabel(bytes: number): string {
  if (bytes > 0 && bytes < 0.1 * 1024 * 1024) return '< 0,1 MB'
  return megabytesLabel(bytes)
}

/** Phần trăm làm tròn xuống (79,6% hiện 79%, không hiện 80% trước khi thật sự tới ngưỡng). */
export function usagePercent(usage: StorageUsage): number {
  return Math.floor(usage.ratio * 100)
}
