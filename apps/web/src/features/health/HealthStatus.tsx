import { useHealth } from './useHealth'

export function HealthStatus() {
  const { data, isPending, isError } = useHealth()

  if (isPending) return <p className="text-muted-foreground">API: đang kiểm tra…</p>
  if (isError || data.status !== 'ok') {
    return (
      <p role="alert" className="text-destructive">
        API: không kết nối được
      </p>
    )
  }
  return <p className="text-emerald-700">API: ok</p>
}
