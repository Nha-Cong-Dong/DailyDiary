import { useParams } from 'react-router'
import { DayDetail } from '@/features/entry/DayDetail'

export function DayPage() {
  const { date = '' } = useParams()
  return <DayDetail date={date} />
}
