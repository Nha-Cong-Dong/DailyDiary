import { AppShell } from '@/components/layout/AppShell'
import { NotFoundState, PageLoading } from '@/components/layout/PageStates'
import { PlainFrame } from '@/components/layout/PlainFrame'
import { useMe } from '@/lib/profile'

/** 404: đã đăng nhập thì nằm trong khung app; chưa đăng nhập thì khung công khai (không hiện avatar tạm). */
export function NotFoundPage() {
  const { data: me, isPending } = useMe()
  if (me) {
    return (
      <AppShell>
        <NotFoundState />
      </AppShell>
    )
  }
  return <PlainFrame>{isPending ? <PageLoading /> : <NotFoundState />}</PlainFrame>
}
