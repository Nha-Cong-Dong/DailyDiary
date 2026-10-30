import { Link } from 'react-router'
import { DemoDayCard } from './DemoDayCard'
import { MonthPreview } from './MonthPreview'
import { YearPreview } from './YearPreview'
import './story.css'

const STEPS = [
  { title: 'Một ngày', text: 'Chấm điểm, thêm vài dòng nếu muốn. Vậy là xong một trang.' },
  { title: 'Thành một tháng', text: 'Mỗi trang là một ô trong lịch tháng, mang icon của ngày đó.' },
  { title: 'Thành một năm', text: 'Mười hai tháng gom lại thành một bức tranh: mỗi ô một ngày, mỗi màu một mức điểm.' },
] as const

/**
 * Cảnh cuộn "Một ngày → một tháng → một năm" (DESIGN.md mục 7, cảnh 3): thẻ ngày thu vào ô 18 của lịch tháng, lịch co
 * lại khi Year in Pixels hiện ra. Làm bằng CSS scroll-driven animation (story.css), không thư viện JS.
 * Trình duyệt chưa hỗ trợ, người dùng chọn giảm chuyển động, hoặc in trang: ba khung tĩnh xếp dọc, đọc được đủ.
 * Dữ liệu là dữ liệu mẫu (demoData.ts).
 */
export function StoryScene({ signedIn }: { signedIn: boolean }) {
  return (
    <section id="nhin-lai" aria-labelledby="story-title" className="story">
      <div className="story-stage mx-auto w-full max-w-[1120px] px-[clamp(16px,4vw,40px)]">
        <div className="story-copy">
          {/* Tên mục cho trình đọc màn hình; trên màn, chữ của từng bước (lớn) là tiêu đề nhìn thấy. */}
          <h2 id="story-title" className="sr-only">
            Ghi từng ngày, nhìn lại cả năm
          </h2>
          <div className="story-captions">
            {STEPS.map((s, i) => (
              <div key={s.title} className={`story-caption story-caption-${i + 1}`}>
                <h3 className="font-display text-[clamp(32px,4vw,48px)] leading-[1.05] font-extrabold tracking-[-0.02em]">{s.title}</h3>
                <p className="max-w-[380px] text-reading leading-7 text-muted-foreground">{s.text}</p>
                {i === 2 && signedIn ? (
                  <Link to="/pixels" className="link-underline mt-1 inline-block font-semibold">
                    Mở Year in Pixels của bạn
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
          <p className="text-label text-muted-foreground">Dữ liệu mẫu</p>
        </div>
        <div className="story-canvas" aria-hidden="true" inert>
          <DemoDayCard className="story-day w-full max-w-[420px]" />
          <MonthPreview variant="still" className="story-month w-full max-w-[480px]" />
          <YearPreview paint={false} className="story-year w-full" />
        </div>
      </div>
    </section>
  )
}
