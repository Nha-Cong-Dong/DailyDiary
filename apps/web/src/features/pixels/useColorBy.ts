import { useState } from 'react'

/** Tô ô Year in Pixels theo điểm (mặc định) hay theo màu cờ hiệu (F-03, tùy chọn của người dùng). */
export type ColorBy = 'score' | 'flag'

const STORAGE_KEY = 'jotly:pixels-color-by'

function readColorBy(): ColorBy {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'flag' ? 'flag' : 'score'
  } catch {
    return 'score' // trình duyệt chặn lưu trữ: vẫn chạy, chỉ không nhớ lựa chọn
  }
}

/** Lựa chọn tô ô, nhớ trên trình duyệt này (như chế độ sáng/tối). */
export function useColorBy(): [ColorBy, (next: ColorBy) => void] {
  const [value, setValue] = useState<ColorBy>(readColorBy)
  return [
    value,
    (next) => {
      setValue(next)
      try {
        if (next === 'flag') localStorage.setItem(STORAGE_KEY, next)
        else localStorage.removeItem(STORAGE_KEY)
      } catch {
        // không lưu được thì thôi
      }
    },
  ]
}
