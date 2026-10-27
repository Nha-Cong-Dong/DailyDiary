import type { ReactNode } from 'react'
import { Link } from 'react-router'
import { PlainFrame } from '@/components/layout/PlainFrame'
import { tierLimits } from '@/lib/limits'

/**
 * Chính sách quyền riêng tư (đặc tả 4.1, MVP Bước 14). Mỗi câu phải đúng với code hiện tại: đổi cách thu thập/lưu
 * dữ liệu (thêm Sentry, Umami, nhà cung cấp mới…) thì sửa trang này và ngày cập nhật cùng lúc.
 * Chưa được rà soát pháp lý: làm trước khi ra mắt công khai (đặc tả 4.1, mục Pháp lý).
 */
export const CONTACT_EMAIL = 'bachvuongtri@gmail.com'
const UPDATED = '25/10/2026'
const MIN_AGE = 16

const focusRing = 'focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring'

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="text-[22px] leading-8 font-bold max-sm:text-xl max-sm:leading-7">
        {title}
      </h2>
      {children}
    </section>
  )
}

function List({ children }: { children: ReactNode }) {
  return <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-muted-foreground">{children}</ul>
}

const Mail = () => (
  <a href={`mailto:${CONTACT_EMAIL}`} className={`link-underline font-medium break-all ${focusRing}`}>
    {CONTACT_EMAIL}
  </a>
)

export function PrivacyPolicy() {
  const { restore_days } = tierLimits().entry
  return (
    <PlainFrame>
      <title>Chính sách quyền riêng tư · Jotly</title>
      <article className="mx-auto flex w-full max-w-[720px] flex-col gap-10 py-6 text-[15px] leading-7 md:py-10 md:text-base md:leading-[28px]">
        <header className="flex flex-col gap-2">
          <p className="text-[13px] leading-5 text-muted-foreground">Cập nhật lần cuối: {UPDATED}</p>
          <h1 className="text-[32px] leading-10 font-bold tracking-[-0.01em] md:text-[40px] md:leading-[48px]">
            Chính sách quyền riêng tư
          </h1>
          <p className="text-muted-foreground">
            Jotly là nhật ký cá nhân. Trang này nói rõ Jotly lưu gì, để làm gì, ai xem được và bạn xóa như thế nào.
            Jotly đang ở giai đoạn thử nghiệm (beta).
          </p>
        </header>

        <section aria-label="Tóm tắt" className="rounded-[18px] border-[1.5px] border-line bg-card p-5 shadow-ink-sm md:p-6">
          <List>
            <li>Nhật ký mặc định chỉ mình bạn xem được. Chỉ khi bạn tự tạo link chia sẻ thì người có link mới xem được.</li>
            <li>Jotly không bán dữ liệu, không chạy quảng cáo, không dùng nhật ký của bạn để huấn luyện AI.</li>
            <li>Jotly hiện không dùng công cụ phân tích hành vi hay theo dõi quảng cáo.</li>
            <li>Bạn xóa được từng trang, toàn bộ dữ liệu hoặc cả tài khoản bất cứ lúc nào.</li>
          </List>
        </section>

        <Section id="pv-thu-thap" title="1. Jotly lưu những gì">
          <List>
            <li>
              <strong>Tài khoản Google</strong> khi bạn đăng nhập: email, tên hiển thị, link ảnh đại diện và mã định danh
              Google. Jotly không nhận và không lưu mật khẩu của bạn.
            </li>
            <li>
              <strong>Cài đặt</strong>: múi giờ (lấy từ trình duyệt lần đầu đăng nhập), bộ biểu tượng, màu cờ tự chọn, ảnh
              đại diện nếu bạn tải lên.
            </li>
            <li>
              <strong>Nhật ký</strong>: điểm, tiêu đề, nội dung, từ khóa, biểu tượng phụ, cờ hiệu và ảnh của từng ngày, cùng
              thời điểm tạo/sửa.
            </li>
            <li>
              <strong>Ảnh</strong> được nén ngay trên máy bạn trước khi tải lên; ảnh gốc không rời khỏi thiết bị. Khi nén,
              thông tin kèm theo ảnh (EXIF, gồm cả vị trí GPS) bị bỏ đi.
            </li>
            <li>
              <strong>Link chia sẻ</strong> bạn tạo và các phần bạn chọn cho hiện.
            </li>
            <li>
              <strong>Góp ý</strong> bạn gửi qua nút Góp ý.
            </li>
            <li>
              <strong>Phiên đăng nhập</strong>: chỉ lưu mã phiên đã băm và thời hạn. Jotly không lưu địa chỉ IP hay thông tin
              trình duyệt của bạn.
            </li>
          </List>
        </Section>

        <Section id="pv-muc-dich" title="2. Dùng để làm gì">
          <List>
            <li>Đăng nhập và giữ bạn đăng nhập trên thiết bị.</li>
            <li>Hiện nhật ký, lịch, Year in Pixels, thống kê và tìm kiếm cho chính bạn.</li>
            <li>Trả lời góp ý của bạn.</li>
            <li>Gửi một email xác nhận khi tài khoản của bạn đã được xóa. Jotly không gửi email quảng cáo.</li>
            <li>Giữ dịch vụ an toàn: chống lạm dụng (giới hạn số lần gọi), sao lưu để khôi phục khi có sự cố.</li>
          </List>
        </Section>

        <Section id="pv-nguoi-xem" title="3. Ai xem được nhật ký">
          <p>
            Chỉ bạn. Khi bạn chia sẻ một trang, bất kỳ ai có link đều xem được những phần bạn đã chọn (điểm, tiêu đề, nội
            dung, ảnh…), không cần đăng nhập. Trang chia sẻ không hiện email của bạn, chỉ hiện tên nếu bạn chọn, và báo công
            cụ tìm kiếm không lập chỉ mục. Tắt chia sẻ thì link ngừng hoạt động ngay.
          </p>
        </Section>

        <Section id="pv-luu-tru" title="4. Lưu ở đâu và bảo vệ thế nào">
          <List>
            <li>Mọi kết nối dùng HTTPS. Phiên đăng nhập nằm trong cookie mà mã JavaScript trên trang không đọc được.</li>
            <li>Kho ảnh là kho riêng tư; link xem ảnh chỉ dùng được khoảng 1 giờ.</li>
            <li>
              Nhật ký hệ thống (log) chỉ ghi mã người dùng nội bộ, đường dẫn API, mã kết quả và thời gian xử lý; không ghi
              tiêu đề, nội dung, từ khóa, ảnh hay địa chỉ IP. Log được giữ 14–30 ngày.
            </li>
            <li>
              Jotly dùng các nhà cung cấp hạ tầng sau để chạy dịch vụ. Dữ liệu có thể được lưu ở máy chủ ngoài Việt Nam:
              <ul className="mt-2 flex list-[circle] flex-col gap-1.5 pl-5">
                <li>Google: đăng nhập; gửi email (góp ý, xác nhận xóa tài khoản).</li>
                <li>Render: chạy máy chủ ứng dụng (Singapore).</li>
                <li>MongoDB Atlas: cơ sở dữ liệu (Singapore).</li>
                <li>Cloudflare: phục vụ trang web và lưu ảnh (kho ảnh R2).</li>
                <li>GitHub: chạy các tác vụ định kỳ (dọn dữ liệu đã xóa, sao lưu).</li>
                <li>Backblaze: lưu bản sao lưu (máy chủ ở Canada).</li>
              </ul>
            </li>
          </List>
        </Section>

        <Section id="pv-cookie" title="5. Cookie và dữ liệu trên trình duyệt">
          <List>
            <li>
              <code className="font-mono text-[0.9em]">dd_session</code> và{' '}
              <code className="font-mono text-[0.9em]">dd_csrf</code>: giữ đăng nhập và chống giả mạo yêu cầu; thời hạn 30
              ngày, tự gia hạn khi bạn dùng, bị xóa khi bạn đăng xuất.
            </li>
            <li>
              <code className="font-mono text-[0.9em]">dd_oauth</code>: chỉ dùng trong lúc đăng nhập bằng Google, hết hạn
              sau 10 phút.
            </li>
            <li>
              Trình duyệt lưu lựa chọn giao diện (sáng/tối, cách tô màu Year in Pixels) và bản nháp đang viết dở để không mất
              chữ khi mất mạng. Nháp bị xóa khi đã lưu lên máy chủ và khi bạn đăng xuất.
            </li>
            <li>Jotly không dùng cookie quảng cáo hay cookie theo dõi của bên thứ ba.</li>
          </List>
        </Section>

        <Section id="pv-xoa" title="6. Thời gian lưu và cách xóa">
          <List>
            <li>
              Trang bạn xóa nằm trong thùng rác {restore_days} ngày để khôi phục được, sau đó bị xóa hẳn cùng ảnh.
            </li>
            <li>
              <strong>Xóa toàn bộ dữ liệu</strong> (trong Hồ sơ): xóa mọi trang, ảnh nhật ký và link chia sẻ; giữ tài khoản và
              cài đặt.
            </li>
            <li>
              <strong>Xóa tài khoản</strong> (trong Hồ sơ): đăng xuất ngay, xóa nhật ký, ảnh, link chia sẻ, phiên đăng nhập và
              hồ sơ. Góp ý bạn từng gửi được giữ lại nhưng tách khỏi tài khoản; bản email góp ý đã gửi tới hộp thư của
              người vận hành không tự xóa được.
            </li>
            <li>
              Bản sao lưu được giữ tối đa 7 ngày, nên dữ liệu đã xóa có thể còn trong bản sao lưu đến 7 ngày rồi mới mất hẳn.
              Jotly không dùng bản sao lưu để khôi phục dữ liệu bạn đã xóa.
            </li>
            <li>Jotly hiện chưa có tính năng xuất dữ liệu.</li>
          </List>
        </Section>

        <Section id="pv-quyen" title="7. Quyền của bạn">
          <p>
            Theo quy định của pháp luật Việt Nam về bảo vệ dữ liệu cá nhân, bạn có quyền được biết dữ liệu của mình được xử
            lý thế nào, xem và sửa dữ liệu, xóa dữ liệu, rút lại sự đồng ý và khiếu nại. Phần lớn việc này bạn tự làm được
            trong app (sửa hồ sơ, sửa hoặc xóa trang, xóa tài khoản). Với yêu cầu khác, hãy gửi email tới <Mail />.
          </p>
        </Section>

        <Section id="pv-tuoi" title="8. Độ tuổi">
          <p>
            Jotly dành cho người từ {MIN_AGE} tuổi trở lên. Nếu bạn biết một tài khoản thuộc về người dưới {MIN_AGE} tuổi,
            hãy báo qua <Mail /> để tài khoản đó được xóa.
          </p>
        </Section>

        <Section id="pv-thay-doi" title="9. Thay đổi chính sách">
          <p>
            Khi Jotly thay đổi cách thu thập hay dùng dữ liệu (ví dụ thêm công cụ bắt lỗi hoặc thống kê), trang này sẽ được
            cập nhật kèm ngày ở đầu trang. Với thay đổi quan trọng, Jotly sẽ thông báo cho bạn trước khi áp dụng.
          </p>
        </Section>

        <Section id="pv-lien-he" title="10. Liên hệ">
          <p>
            Câu hỏi về quyền riêng tư: <Mail />. Nếu đang đăng nhập, bạn cũng có thể dùng nút Góp ý trong{' '}
            <Link to="/profile" className={`link-underline font-medium ${focusRing}`}>
              Hồ sơ
            </Link>
            .
          </p>
        </Section>
      </article>
    </PlainFrame>
  )
}
