import { ProfileSettings } from '@/features/profile/ProfileSettings'
import { SharingSummary } from '@/features/share/SharingSummary'
import { useClearShares, useShareCount } from '@/features/share/useShares'

export function ProfilePage() {
  const shareCount = useShareCount()
  const clearShares = useClearShares()
  return <ProfileSettings sharing={<SharingSummary />} shareCount={shareCount} onClearShares={clearShares} />
}
