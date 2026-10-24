import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { useLocation } from 'react-router'
import { saveErrorMessage, useSaveEntry } from '@/features/entry/entries'
import { draftOf, toWrite } from '@/features/entry/entryDraft'
import { useDay } from '@/features/entry/useDay'
import { Landing, type LandingAccount, type QuickScore } from '@/features/landing/Landing'
import { useShareCount } from '@/features/share/useShares'
import type { Score } from '@/lib/catalog'
import { todayIn } from '@/lib/date'
import { toProfile, useMe } from '@/lib/profile'
import { forgetSignedInUser, isSignedOutState } from '@/lib/session'

/** Trang chủ "/": ai cũng vào được; đã đăng nhập thì Landing đổi sang bản có lời chào và menu tài khoản. */
export function HomePage() {
  const client = useQueryClient()
  const location = useLocation()
  // Vừa đăng xuất / xóa tài khoản (lib/session.ts › SIGNED_OUT): trang chủ không nằm trong RequireAuth nên bỏ dữ liệu ở
  // đây an toàn; /me tải lại → 401 → hiện bản chưa đăng nhập. Chạy theo location.key: đăng xuất ngay tại "/" cũng chạy.
  const signedOut = isSignedOutState(location.state)
  useEffect(() => {
    if (signedOut) forgetSignedInUser(client)
  }, [client, signedOut, location.key])
  const { data } = useMe()
  // Vừa đăng xuất: hiện ngay bản chưa đăng nhập, không dựng bản có tài khoản từ hồ sơ cũ còn trong cache (tránh gọi
  // lịch, trang hôm nay, link chia sẻ chỉ để nhận 401).
  const me = signedOut ? undefined : data
  const shareCount = useShareCount(Boolean(me))
  if (!me) return <Landing />
  const p = toProfile(me)
  return (
    <SignedHome
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

/** Chấm điểm nhanh trên trang chủ = lưu điểm cho hôm nay (PUT /entries/{hôm nay}), giữ các trường đã viết. */
function SignedHome({ account }: { account: Omit<LandingAccount, 'quickScore'> }) {
  const today = todayIn(account.timeZone)
  const { data: entry } = useDay(today)
  const save = useSaveEntry(today)
  const quickScore: QuickScore = {
    value: (save.variables?.body.score as Score | undefined) ?? entry?.score ?? null,
    saving: save.isPending,
    error: save.isError ? saveErrorMessage(save.error) : null,
    onPick: (score) => {
      const base = entry ? draftOf(entry) : { sub_icon: null, flag_color: null, title: '', content: '', keywords: [] }
      save.mutate({ date: today, body: toWrite({ ...base, score }, entry?.updated_at ?? null) })
    },
  }
  return <Landing account={{ ...account, quickScore }} />
}
