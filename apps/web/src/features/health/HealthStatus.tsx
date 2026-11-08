import { useHealth } from './useHealth'
import { useT } from '@/lib/i18n'

export function HealthStatus() {
  const t = useT()
  const { data, isPending, isError } = useHealth()

  if (isPending) return <p className="text-ink-soft">{t('components:health.checking')}</p>
  if (isError || data.status !== 'ok') {
    return (
      <p role="alert" className="text-danger">
        {t('components:health.failed')}
      </p>
    )
  }
  return <p className="text-sage-ink">API: ok</p>
}
