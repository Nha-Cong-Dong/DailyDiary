import { Landing } from '@/features/landing/Landing'
import { useShareCount } from '@/features/share/useShares'
import { toProfile, useMe } from '@/lib/profile'

/** Trang chủ "/": ai cũng vào được; đã đăng nhập thì Landing đổi sang bản có lời chào và menu tài khoản. */
export function HomePage() {
  const { data: me } = useMe()
  const shareCount = useShareCount()
  if (!me) return <Landing />
  const p = toProfile(me)
  return (
    <Landing
      account={{
        name: p.displayName,
        email: p.email,
        avatarUrl: p.avatarUrl,
        iconSetId: p.iconSetId,
        timeZone: p.timeZone,
        shareCount,
      }}
    />
  )
}
