import { useParams } from 'react-router'
import { BackfillEntry } from '@/features/entry/BackfillEntry'

export function BackfillPage() {
  const { date = '' } = useParams()
  return <BackfillEntry key={date} date={date} />
}
