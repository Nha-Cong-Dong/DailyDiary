import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="space-y-2">
      <h1 className="text-xl font-semibold">Không tìm thấy trang</h1>
      <Link to="/" className="underline">
        Về trang chủ
      </Link>
    </section>
  )
}
