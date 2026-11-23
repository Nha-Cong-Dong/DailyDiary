import { useState } from 'react'
import { HeartHandshake, Send, Users } from 'lucide-react'
import { Avatar } from '@/components/layout/Avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useNow } from '@/lib/date'
import { ApiError } from '@/api/client'
import { useProfile } from '@/lib/profile'
import { useT } from '@/lib/i18n'
import { useAcceptFriendRequest, useAcceptJournalInvite, useDeclineFriendRequest, useDeclineJournalInvite, useInviteJournal, useSendFriendRequest } from '../useSocial'
import { lastActiveLabel } from '../lastActive'
import type { Friend, FriendList, FriendRequest, FriendRequestList, Journal, JournalInvite, JournalInviteList, JournalList } from '../social'

const focus = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus'

export function SendRequestForm({ limits }: { limits: FriendList }) {
  const t = useT(); const send = useSendFriendRequest(); const [code, setCode] = useState('')
  const requestError = send.isError && send.error instanceof ApiError && send.error.code !== 'NOT_FOUND' ? send.error.message : null
  return <section><h2 className="font-semibold">{t('social:send.title')}</h2><form className="mt-3 flex flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (code.trim()) send.mutate(code.trim(), { onSuccess: () => setCode('') }) }}><Input value={code} onChange={(e) => setCode(e.target.value)} maxLength={16} placeholder={t('social:send.placeholder')} /><Button type="submit" disabled={!code.trim() || send.isPending || limits.friends_count >= limits.friends_max}><Send className="size-4" />{t('social:send.submit')}</Button></form>{limits.friends_count >= limits.friends_max ? <p className="mt-3 text-label text-ink-soft">{t('social:send.limit')}</p> : null}{send.isSuccess ? <Alert className="mt-3"><AlertDescription>{t('social:send.sent')}</AlertDescription></Alert> : null}{requestError ? <Alert className="mt-3" variant="destructive"><AlertDescription>{requestError}</AlertDescription></Alert> : null}{send.isError && !requestError ? <Alert className="mt-3" variant="destructive"><AlertDescription>{t('social:send.invalid')}</AlertDescription></Alert> : null}</section>
}

export function RequestsPanel({ data }: { data: FriendRequestList }) {
  const t = useT(); const accept = useAcceptFriendRequest(); const decline = useDeclineFriendRequest()
  function row(item: FriendRequest, incoming: boolean) { return <div key={item.id} className="flex items-center gap-3 border-b border-line-soft py-3 last:border-0"><Avatar name={item.display_name} src={item.avatar_url} size={42} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.display_name}</p><p className="text-label text-ink-soft">{incoming ? t('social:requests.incoming') : t('social:requests.pending')}</p></div>{incoming ? <div className="flex gap-2"><Button size="sm" disabled={accept.isPending} onClick={() => accept.mutate(item.id)}>{t('social:requests.accept')}</Button><Button size="sm" variant="outline" disabled={decline.isPending} onClick={() => decline.mutate(item.id)}>{t('social:requests.decline')}</Button></div> : null}</div> }
  return <section><div className="flex items-baseline justify-between"><h2 className="font-semibold">{t('social:requests.title')}</h2><span className="text-label text-ink-soft">{data.incoming.length + data.outgoing.length}</span></div><div className="mt-3">{data.incoming.map((item) => row(item, true))}{data.outgoing.map((item) => row(item, false))}{!data.incoming.length && !data.outgoing.length ? <p className="py-6 text-center text-body text-ink-soft">{t('social:requests.empty')}</p> : null}</div></section>
}

export function FriendsList({ data, onJournal }: { data: FriendList; onJournal: (id: string) => void }) {
  const t = useT()
  return <section><div className="flex items-baseline justify-between"><h2 className="font-semibold">{t('social:friends.title')}</h2><span className="text-label text-ink-soft">{t('social:friends.count', { count: data.friends_count, max: data.friends_max })}</span></div><div className="mt-3">{data.friends.map((friend) => <FriendRow key={friend.id} friend={friend} onJournal={onJournal} />)}{!data.friends.length ? <div className="py-6 text-center"><Users className="mx-auto size-8 text-ink-soft" /><p className="mt-2 text-body text-ink-soft">{t('social:friends.empty')}</p><p className="mt-1 text-label text-ink-soft">{t('social:friends.invite')}</p></div> : null}</div></section>
}

function FriendRow({ friend, onJournal }: { friend: Friend; onJournal: (id: string) => void }) {
  const t = useT()
  const { timeZone } = useProfile()
  const now = useNow(60_000)
  const invite = useInviteJournal()
  const label = lastActiveLabel(friend.last_active, now, timeZone)
  const hasJournal = Boolean(friend.journal_id && friend.journal_status === 'active')
  const sub = hasJournal
    ? t('social:friends.journal')
    : friend.journal_invite_pending
      ? t('social:friends.journalInvitePending')
      : t('social:friends.noJournal')
  return <div className="flex items-center gap-3 border-b border-line-soft py-3 last:border-0"><Avatar name={friend.display_name} src={friend.avatar_url} size={44} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{friend.display_name}</p><p className="text-label text-ink-soft">{sub}{label ? <> · {t('social:friends.lastActive', { time: label })}</> : null}</p></div>{hasJournal ? <Button size="sm" variant="outline" className={focus} onClick={() => onJournal(friend.journal_id!)}>{t('social:friends.journal')}</Button> : !friend.journal_invite_pending ? <Button size="sm" variant="outline" className={focus} disabled={invite.isPending} onClick={() => invite.mutate(friend.id)}>{t('social:friends.journal')}</Button> : null}</div>
}

export function JournalsList({ data, onOpen }: { data: JournalList; onOpen: (journal: Journal) => void }) {
  const t = useT()
  const { timeZone } = useProfile()
  const now = useNow(60_000)
  return <section><div className="flex items-baseline justify-between gap-3"><h2 className="font-semibold">{t('social:journals.title')}</h2><span className="text-label text-ink-soft">{t('social:journals.count', { count: data.journals_count, max: data.journals_max })}</span></div>{data.journals.length ? <div className="mt-3 flex flex-col gap-3">{data.journals.map((journal) => { const active = !journal.ended_at; const label = lastActiveLabel(journal.partner_last_active, now, timeZone); return <button type="button" key={journal.id} onClick={() => onOpen(journal)} className={`w-full rounded-lg border-[1.5px] border-stroke bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${focus}`}><div className="flex items-center gap-3"><Avatar name={journal.partner_display_name} src={journal.partner_avatar_url} size={48} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{journal.partner_display_name}</p><p className="text-label text-ink-soft">{active ? t('social:journals.active') : t('social:journals.ended')}{active && label ? <> · {t('social:journals.partnerLastActive', { time: label })}</> : null}</p></div><HeartHandshake className="size-5 text-primary" aria-hidden="true" /></div><div className="mt-4 grid grid-cols-3 gap-2 border-t border-line-soft pt-3 text-center">{active && journal.warm_streak >= 30 ? <p className="col-span-3 text-label font-semibold text-primary">{t('social:journals.milestone', { n: journal.warm_streak })}</p> : null}<Stat value={journal.warm_streak} label={t('social:journals.warm')} /><Stat value={journal.synced_days} label={t('social:journals.synced')} /><Stat value={journal.longest_warm_streak} label={t('social:journals.longest')} /></div></button> })}</div> : <div className="py-6 text-center"><HeartHandshake className="mx-auto size-8 text-ink-soft" /><p className="mt-2 font-semibold">{t('social:states.emptyTitle')}</p><p className="mt-1 text-body text-ink-soft">{t('social:states.emptyBody')}</p></div>}</section>
}

export function JournalInvitesPanel({ data }: { data: JournalInviteList }) {
  const t = useT(); const accept = useAcceptJournalInvite(); const decline = useDeclineJournalInvite()
  function row(item: JournalInvite, incoming: boolean) { const pending = accept.isPending || decline.isPending; return <div key={item.id} className="flex items-center gap-3 border-b border-line-soft py-3 last:border-0"><Avatar name={item.display_name} src={item.avatar_url} size={42} /><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.display_name}</p><p className="text-label text-ink-soft">{incoming ? t('social:journalInvites.incoming') : t('social:journalInvites.pending')}</p></div>{incoming ? <div className="flex gap-2"><Button size="sm" disabled={pending} onClick={() => accept.mutate(item.id)}>{t('social:journalInvites.accept')}</Button><Button size="sm" variant="outline" disabled={pending} onClick={() => decline.mutate(item.id)}>{t('social:journalInvites.decline')}</Button></div> : null}</div> }
  const count = data.incoming.length + data.outgoing.length
  return <section><div className="flex items-baseline justify-between"><h2 className="font-semibold">{t('social:journalInvites.title')}</h2><span className="text-label text-ink-soft">{count}</span></div><div className="mt-3">{data.incoming.map((item) => row(item, true))}{data.outgoing.map((item) => row(item, false))}{!count ? <p className="py-6 text-center text-body text-ink-soft">{t('social:journalInvites.empty')}</p> : null}<p className="mt-3 text-label text-ink-soft">{t('social:journalInvites.note')}</p></div></section>
}

function Stat({ value, label }: { value: number; label: string }) { return <div><p className="nums text-lg font-bold">{value}</p><p className="text-label text-ink-soft">{label}</p></div> }
