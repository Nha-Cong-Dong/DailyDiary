import { useState } from 'react'
import { useLocation } from 'react-router'
import { FeedbackDialog } from '@/features/feedback/FeedbackDialog'
import { ProfileSettings } from '@/features/profile/ProfileSettings'
import { SharingSummary } from '@/features/share/SharingSummary'
import { useClearShares, useShareCount } from '@/features/share/useShares'

/** Hồ sơ = profile + share + feedback. Menu tài khoản mở thẳng form góp ý bằng state `{ feedback: true }`. */
export function ProfilePage() {
  const shareCount = useShareCount()
  const clearShares = useClearShares()
  const location = useLocation()
  const [feedbackOpen, setFeedbackOpen] = useState(() => Boolean((location.state as { feedback?: boolean } | null)?.feedback))
  return (
    <>
      <ProfileSettings
        sharing={<SharingSummary />}
        shareCount={shareCount}
        onClearShares={clearShares}
        onFeedback={() => setFeedbackOpen(true)}
      />
      <FeedbackDialog open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </>
  )
}
