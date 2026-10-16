import { HealthStatus } from '@/features/health/HealthStatus'

export function HomePage() {
  return (
    <section className="space-y-2">
      <h1 className="text-2xl font-semibold">DailyDiary</h1>
      <p className="text-muted-foreground">Ghi lại mỗi ngày thật dễ, nhìn lại thì thấy vui.</p>
      <HealthStatus />
    </section>
  )
}
