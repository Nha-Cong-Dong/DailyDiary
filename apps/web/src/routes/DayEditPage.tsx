import { useParams } from 'react-router'
import { EditEntry } from '@/features/entry/EditEntry'

export function DayEditPage() {
  const { date = '' } = useParams()
  return <EditEntry key={date} date={date} />
}
