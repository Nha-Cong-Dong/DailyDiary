import { useState } from 'react'
import { ServerErrorState } from '@/components/layout/PageStates'
import { Card } from '@/components/ui/card'
import { useT } from '@/lib/i18n'
import { FriendCodeCard } from './components/FriendCodeCard'
import { JournalDetail } from './components/JournalDetail'
import { FriendsList, JournalsList, RequestsPanel, SendRequestForm } from './components/SocialSections'
import { useFriends, useFriendRequests, useJournals } from './useSocial'
import type { Journal } from './social'

/**
 * Mục Social (Giai đoạn 1 · ADR 0007): mã bạn, kết bạn, yêu cầu, danh sách bạn và các sổ chung.
 * Nội dung chính của trang nằm trong các component; `SocialPage` chỉ ghép khung và điều hướng xem sổ chi tiết.
 */
export function SocialPage() {
  const t = useT()
  const friends = useFriends()
  const requests = useFriendRequests()
  const journals = useJournals()
  const [openJournal, setOpenJournal] = useState<Journal | null>(null)

  if (friends.isPending || requests.isPending || journals.isPending) return <PageLoadingFallback label={t('social:states.loading')} />
  const error = friends.error ?? requests.error ?? journals.error
  if (error) {
    return <ServerErrorState onRetry={() => Promise.all([friends.refetch(), requests.refetch(), journals.refetch()])} />
  }
  const friendData = friends.data!
  const requestData = requests.data!
  const journalData = journals.data!

  return (
    <div className="flex flex-col gap-8">
      {openJournal ? (
        <JournalDetail journal={journalData.journals.find((j) => j.id === openJournal.id) ?? openJournal} onBack={() => setOpenJournal(null)} />
      ) : (
        <div className="flex flex-col gap-4">
          <FriendCodeCard />
          <div className="grid gap-4 md:grid-cols-2">
            <SendRequestForm limits={friendData} />
            <RequestsPanel data={requestData} />
          </div>
          <FriendsList data={friendData} onJournal={(id) => setOpenJournal(journalData.journals.find((j) => j.id === id) ?? null)} />
          <JournalsList data={journalData} onOpen={setOpenJournal} />
        </div>
      )}
    </div>
  )
}

function PageLoadingFallback({ label }: { label: string }) {
  return (
    <Card className="p-6">
      <div role="status" aria-label={label} className="flex flex-col gap-3">
        <span className="skeleton block h-6 w-48" />
        <span className="skeleton block h-11 w-full" />
        <span className="skeleton block h-11 w-full" />
      </div>
    </Card>
  )
}
