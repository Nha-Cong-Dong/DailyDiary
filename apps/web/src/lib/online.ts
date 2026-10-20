import { useSyncExternalStore } from 'react'

/**
 * Trạng thái mạng của trình duyệt (navigator.onLine + sự kiện online/offline).
 * `true` khi không biết (môi trường không có navigator), để không báo mất mạng nhầm.
 */
function subscribe(onChange: () => void) {
  window.addEventListener('online', onChange)
  window.addEventListener('offline', onChange)
  return () => {
    window.removeEventListener('online', onChange)
    window.removeEventListener('offline', onChange)
  }
}

const read = () => (typeof navigator === 'undefined' ? true : navigator.onLine)

export function useOnline(): boolean {
  return useSyncExternalStore(subscribe, read, () => true)
}
