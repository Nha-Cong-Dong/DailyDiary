import { ProfileSettings } from '@/features/profile/ProfileSettings'
import { SharingSummary } from '@/features/share/SharingSummary'
import { useShareCount } from '@/features/share/useShares'

export function ProfilePage() {
  const shareCount = useShareCount()
  return <ProfileSettings sharing={<SharingSummary />} shareCount={shareCount} />
}
