import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="flex flex-col items-start gap-3">
      <h1 className="text-title-2 font-semibold">Không tìm thấy trang</h1>
      <p className="text-muted-foreground">Trang này chưa có hoặc đã được dời đi.</p>
      <Link to="/" className="font-medium underline underline-offset-4">
        Về trang chủ
      </Link>
    </section>
  )
}
