import { useState } from 'react'
import { ServerErrorState } from '@/components/layout/PageStates'
import { Card } from '@/components/ui/card'
import { useT } from '@/lib/i18n'
import { FriendCodeCard } from './components/FriendCodeCard'
import { JournalDetail } from './components/JournalDetail'
import { FriendsList, JournalInvitesPanel, JournalsList, RequestsPanel, SendRequestForm } from './components/SocialSections'
import { useFriends, useFriendRequests, useJournalInvites, useJournals } from './useSocial'
import type { Journal } from './social'

/**
 * Mục Social (Giai đoạn 1 · ADR 0007): mã bạn, kết bạn, yêu cầu, danh sách bạn,
 * lời mời mở sổ chung và các sổ chung. Nội dung chính nằm trong các component;
 * `SocialPage` chỉ ghép khung và điều hướng xem sổ chi tiết.
 */
export function SocialPage() {
  const t = useT()
  const friends = useFriends()
  const requests = useFriendRequests()
  const journalInvites = useJournalInvites()
  const journals = useJournals()
  const [openJournal, setOpenJournal] = useState<Journal | null>(null)

  if (friends.isPending || requests.isPending || journalInvites.isPending || journals.isPending) return <PageLoadingFallback label={t('social:states.loading')} />
  const error = friends.error ?? requests.error ?? journalInvites.error ?? journals.error
  if (error) {
    return <ServerErrorState onRetry={() => Promise.all([friends.refetch(), requests.refetch(), journalInvites.refetch(), journals.refetch()])} />
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
          {/* Cụm 1: kết nối — trái "của tôi" (mã, thêm bạn), phải "đến với tôi" (lời mời) */}
          <Card className="grid divide-y divide-line-soft p-0 md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="flex flex-col gap-5 p-5">
              <FriendCodeCard />
              <div className="border-t border-line-soft pt-5"><SendRequestForm limits={friendData} /></div>
            </div>
            <div className="flex flex-col gap-5 p-5">
              <RequestsPanel data={requestData} />
              <div className="border-t border-line-soft pt-5"><JournalInvitesPanel data={journalInvites.data!} /></div>
            </div>
          </Card>
          {/* Cụm 2: bạn bè ↔ sổ chung */}
          <Card className="grid divide-y divide-line-soft p-0 md:grid-cols-2 md:divide-x md:divide-y-0">
            <div className="p-5"><FriendsList data={friendData} onJournal={(id) => setOpenJournal(journalData.journals.find((j) => j.id === id) ?? null)} /></div>
            <div className="p-5"><JournalsList data={journalData} onOpen={setOpenJournal} /></div>
          </Card>
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
