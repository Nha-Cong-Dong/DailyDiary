import { useParams } from 'react-router'
import { DayDetail } from '@/features/entry/DayDetail'
import { useDay } from '@/features/entry/useDay'
import { DayShare } from '@/features/share/DayShare'

export function DayPage() {
  const { date = '' } = useParams()
  const { data: entry } = useDay(date)
  return <DayShare date={date} entry={entry}>{(share) => <DayDetail date={date} share={share} />}</DayShare>
}
