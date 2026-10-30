import { Image } from 'lucide-react'
import { KeywordChip } from '@/components/diary/KeywordChip'
import { MoodMark } from '@/components/diary/MoodMark'
import { flagColors, flagHex } from '@/lib/catalog'
import { tierLimits } from '@/lib/limits'
import { useDarkMode } from '@/lib/theme'
import { DEMO_ICON_SET } from './demoData'

/**
 * "Một trang ngày có gì" (DESIGN.md mục 7): một trang ngày thật (dữ liệu mẫu) đặt cạnh danh sách những gì một trang
 * chứa được. Thay cho hàng thẻ tính năng có icon (mẫu giao diện đại trà, DESIGN.md "Không làm").
 */
export function DayPageShowcase() {
  const dark = useDarkMode()
  const maxPhotos = tierLimits().photos.per_day_max
  const lavender = flagColors.find((f) => f.id === 'lavender')!
  const parts = [
    ['Điểm và biểu tượng', 'Chấm 1 đến 5 bằng một trong sáu bộ icon vẽ tay, thêm một sub icon cho chuyện chính của ngày.'],
    ['Cờ hiệu', 'Gắn một màu cho ngày đáng nhớ. Year in Pixels tô được cả năm theo màu cờ.'],
    ['Chữ và ảnh', `Một tiêu đề, vài dòng hay cả trang, và tối đa ${maxPhotos} ảnh mỗi ngày.`],
    ['Từ khóa', 'Gắn từ khóa để tìm lại mọi ngày có cùng một chuyện.'],
    ['Ghi bù', 'Quên một hôm thì ghi bù ngày đó; trang cho biết ghi đúng ngày hay cập nhật muộn.'],
  ] as const
  return (
    <section id="mot-trang" aria-labelledby="mot-trang-title" className="mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,40px)] py-[clamp(80px,10vw,128px)]">
      <div className="grid items-center gap-x-16 gap-y-12 md:grid-cols-[minmax(0,6fr)_minmax(0,5fr)]">
        <article
          data-ui=""
          aria-label="Trang ngày mẫu"
          className="reveal-on-scroll overflow-hidden rounded-[24px] border-(length:--stroke-width) border-line bg-card shadow-ink-lg"
        >
          <div className="h-20 border-b-(length:--stroke-width) border-line md:h-24" style={{ backgroundColor: flagHex(lavender.hex, dark) }} />
          <div className="flex flex-col gap-4 px-5 pb-7 md:px-8">
            <div className="-mt-10 flex items-end justify-between gap-3">
              <span className="flex size-20 items-center justify-center rounded-full border-(length:--stroke-width) border-line bg-card">
                <MoodMark iconSetId={DEMO_ICON_SET} score={4} subIcon="😌" size={56} />
              </span>
              <span className="inline-flex items-center gap-1.5 text-label text-muted-foreground">
                <Image className="size-4" aria-hidden="true" /> 3 ảnh
              </span>
            </div>
            <p className="text-label text-muted-foreground">Chủ nhật · 18 tháng 10, 2026 · ghi đúng ngày</p>
            <h3 className="font-heading text-title font-bold">Chiều mưa đọc sách</h3>
            <p className="ruled text-reading">
              Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở. Tối nấu bát phở, gọi điện cho mẹ, kể chuyện tuần này.
            </p>
            <div className="flex flex-wrap gap-2">
              {['đọc sách', 'mưa', 'mẹ'].map((k) => (
                <KeywordChip key={k} size="sm">
                  {k}
                </KeywordChip>
              ))}
            </div>
          </div>
        </article>
        <div className="flex flex-col gap-8">
          <h2 id="mot-trang-title" className="font-heading text-[clamp(26px,2.4vw,30px)] leading-[1.25] font-bold text-balance">
            Một trang ngày có gì
          </h2>
          <dl className="flex flex-col gap-5">
            {parts.map(([term, detail]) => (
              <div key={term} className="reveal-on-scroll flex flex-col gap-1">
                <dt className="font-semibold">{term}</dt>
                <dd className="leading-6 text-muted-foreground">{detail}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </section>
  )
}
