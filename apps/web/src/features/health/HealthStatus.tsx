import { useHealth } from './useHealth'

export function HealthStatus() {
  const { data, isPending, isError } = useHealth()

  if (isPending) return <p className="text-ink-soft">API: đang kiểm tra…</p>
  if (isError || data.status !== 'ok') {
    return (
      <p role="alert" className="text-danger">
        API: không kết nối được
      </p>
    )
  }
  return <p className="text-sage-ink">API: ok</p>
}
