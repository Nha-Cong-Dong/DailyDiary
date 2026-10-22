import { useParams } from 'react-router'
import { PublicShare } from '@/features/share/PublicShare'

/** /s/:token — trang công khai người nhận link xem, ngoài khung app, không cần đăng nhập. */
export function SharePage() {
  const { token = '' } = useParams()
  return <PublicShare token={token} />
}
