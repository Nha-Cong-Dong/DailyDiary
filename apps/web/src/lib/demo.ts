import { fromZonedTime } from 'date-fns-tz'
import { flagColors, type Score } from './catalog'
import { addDays, type DateString } from './date'

/**
 * DỮ LIỆU MẪU, chỉ dùng cho các màn chạy ở dev (thiết kế B7) khi chưa có API (Bước 5, 9–12).
 * Tên trường theo Project_Specs 5.4 để lúc nối API chỉ cần đổi queryFn. Không có dữ liệu người dùng thật.
 */
export type DemoPhoto = { id: string; label: string }

export type DemoEntry = {
  entry_date: DateString
  score: Score
  sub_icon: string | null
  flag_color: string | null
  title: string | null
  content: string | null
  keywords: string[]
  photos: DemoPhoto[]
  created_at: string
  updated_at: string
}

export const DEMO_TIME_ZONE = 'Asia/Ho_Chi_Minh'
/** Ngày bắt đầu dùng Jotly (users.joined_at), ô trước ngày này là "trước khi dùng Jotly". */
export const DEMO_JOINED: DateString = '2025-09-01'
/** Ngày cuối cùng có dữ liệu mẫu. */
const LAST_DAY: DateString = '2026-10-18'

const flag = (id: string) => flagColors.find((f) => f.id === id)!.hex
const pick = <T,>(list: T[], r: number) => list[Math.floor(r * list.length) % list.length]

type Hand = {
  score: Score
  sub: string
  title: string
  content: string
  keywords?: string[]
  flag?: string
  photos?: number
  /** Giờ sửa cuối (theo giờ Việt Nam); có `lateDays` thì là ngày sau đó → "cập nhật muộn". */
  editedAt?: string
  lateDays?: number
}

// Các trang viết tay (tháng 10 và vài ngày đáng nhớ), lấy từ thiết kế B7.
const HAND: Record<DateString, Hand> = {
  '2026-03-14': { score: 5, sub: '🌧️', title: 'Đi dạo dưới mưa phùn', content: 'Mưa phùn nhẹ, đi bộ một vòng quanh hồ với Linh. Uống cà phê muối ở quán ven hồ.', keywords: ['đi dạo', 'mưa', 'Linh'], flag: 'blush', photos: 4 },
  '2026-05-11': { score: 4, sub: '☕', title: 'Cà phê sáng với Linh', content: 'Ngồi quán quen, nói chuyện cả buổi sáng. Linh kể về chuyến đi Đà Lạt.', keywords: ['cà phê', 'Linh'], flag: 'blush', photos: 2 },
  '2026-07-20': { score: 4, sub: '📚', title: 'Đọc xong một chương', content: 'Cuốn sách bắt đầu hay hơn, thức khuya đọc thêm vài trang.', keywords: ['đọc sách'], flag: 'sky' },
  '2026-08-15': { score: 3, sub: '🏃', title: 'Chạy bộ quanh hồ', content: 'Chạy được 5 km, trời mát. Hẹn tuần sau chạy tiếp.', keywords: ['chạy bộ'], flag: 'butter' },
  '2026-09-14': { score: 5, sub: '❤️', title: 'Về quê thăm mẹ', content: 'Nghỉ phép về quê, mẹ nấu canh chua. Cả nhà ngồi ăn ngoài hiên.', keywords: ['mẹ', 'gia đình'], flag: 'sage', photos: 6 },
  '2026-09-21': { score: 3, sub: '🌱', title: 'Mưa đầu thu', content: 'Cơn mưa đầu mùa, trời dịu hẳn. Ngồi bên cửa sổ viết vài dòng.', keywords: ['mưa', 'mùa thu'], flag: 'butter', photos: 1 },
  '2026-10-01': { score: 3, sub: '☕', title: 'Cà phê đầu tháng', content: 'Thử quán mới ở đầu ngõ. Cà phê hơi đắng nhưng không gian đẹp.', keywords: ['cà phê'], flag: 'butter', photos: 1 },
  '2026-10-02': { score: 4, sub: '🌸', title: 'Hoa sữa đầu mùa', content: 'Đi làm về thấy cả con phố thơm.' },
  '2026-10-04': { score: 5, sub: '✨', title: 'Được khen ở chỗ làm', content: 'Dự án chạy ổn, cả nhóm đi ăn mừng.' },
  '2026-10-05': { score: 3, sub: '📚', title: 'Ghé hiệu sách cũ', content: 'Mua được hai cuốn giá rẻ, một cuốn còn chữ ký của người chủ cũ.', keywords: ['đọc sách'], flag: 'sky', photos: 1 },
  '2026-10-06': { score: 2, sub: '🌧️', title: 'Kẹt xe dưới mưa', content: 'Kẹt xe gần một tiếng, về đến nhà ướt hết. Tối nấu mì ăn tạm rồi đi ngủ sớm.', keywords: ['đi làm', 'mưa'], flag: 'mint', editedAt: '08:15', lateDays: 1 },
  '2026-10-07': { score: 3, sub: '🍀', title: 'Một ngày bình thường', content: 'Không có gì đặc biệt, vậy cũng tốt.' },
  '2026-10-08': { score: 4, sub: '🎧', title: 'Nghe trọn một album', content: 'Vừa nghe vừa dọn lại bàn làm việc.' },
  '2026-10-10': { score: 5, sub: '🌸', title: 'Dã ngoại cuối tuần', content: 'Cả nhóm trải bạt ăn trưa ở công viên.', photos: 5 },
  '2026-10-11': { score: 4, sub: '🍜', title: 'Phở sáng Chủ nhật', content: 'Ăn sáng xong đi dạo một vòng hồ. Gió đầu mùa thu mát rượi.', keywords: ['đi dạo', 'ăn sáng'], flag: 'peach', photos: 2 },
  '2026-10-12': { score: 3, sub: '🍀', title: 'Đầu tuần nhẹ nhàng', content: 'Làm xong việc sớm hơn dự định.' },
  '2026-10-13': { score: 4, sub: '🌸', title: 'Hoa cho bàn làm việc', content: 'Mua một bó cúc nhỏ trên đường đi làm.' },
  '2026-10-15': { score: 2, sub: '🧊', title: 'Mệt cả ngày', content: 'Về nhà chỉ muốn đi ngủ sớm.' },
  '2026-10-16': { score: 5, sub: '🌸', title: 'Tan làm sớm', content: 'Có thời gian nấu một bữa tối tử tế.', flag: 'mint', photos: 2 },
  '2026-10-17': { score: 3, sub: '🍀', title: 'Dọn lại góc học tập', content: 'Sắp xếp sách vở, thấy gọn gàng hẳn.' },
  '2026-10-18': {
    score: 4,
    sub: '😌',
    title: 'Chiều mưa đọc sách',
    content:
      'Mưa từ trưa nên ở nhà đọc nốt cuốn sách còn dang dở. Pha một ấm trà gừng, nghe mưa rơi trên mái tôn.\n\nTối gọi điện cho mẹ, kể chuyện cuốn sách. Mẹ bảo lần sau về nhà nhớ mang theo cho mẹ đọc.',
    keywords: ['đọc sách', 'mưa', 'trà gừng'],
    flag: 'lavender',
    photos: 3,
    editedAt: '21:32',
  },
}

// Ngày còn lại: chỉ chấm điểm hoặc vài dòng chung chung, sinh giả ngẫu nhiên nhưng cố định.
const LOW = [
  ['Một ngày bận rộn', 'Họp liên tục, tối về chỉ muốn ngủ.', '💼'],
  ['Ngủ không ngon', 'Thức giấc lúc ba giờ sáng.', '😴'],
  ['Trễ hạn một việc', 'Phải làm lại phần báo cáo.', '💻'],
  ['Trời âm u', 'Không muốn ra khỏi nhà.', '🌧️'],
]
const HIGH = [
  ['Chạy bộ buổi sáng', 'Chạy được 5 km, trời mát.', '🏃'],
  ['Nấu canh chua', 'Lần đầu tự nấu, vị cũng ổn.', '🍜'],
  ['Trời nắng đẹp', 'Phơi được chăn, mở hết cửa sổ.', '☀️'],
  ['Đi chợ cuối tuần', 'Mua được bó hoa cúc nhỏ.', '🌱'],
  ['Ngủ trưa thật lâu', 'Dậy lúc bốn giờ, thấy khỏe hẳn.', '🛌'],
  ['Gọi điện cho mẹ', 'Mẹ kể chuyện vườn rau ở quê.', '❤️'],
]

function at(date: DateString, hhmm: string): string {
  return fromZonedTime(`${date}T${hhmm}:00`, DEMO_TIME_ZONE).toISOString()
}

function photos(date: DateString, n: number): DemoPhoto[] {
  return Array.from({ length: n }, (_, i) => ({ id: `${date}-${i + 1}`, label: `[Ảnh ${i + 1}]` }))
}

function build(): DemoEntry[] {
  let seed = 20250901
  const rnd = () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
  const out: DemoEntry[] = []
  for (let date = DEMO_JOINED; date <= LAST_DAY; date = addDays(date, 1)) {
    const hand = HAND[date]
    if (hand) {
      const editedDay = addDays(date, hand.lateDays ?? 0)
      out.push({
        entry_date: date,
        score: hand.score,
        sub_icon: hand.sub,
        flag_color: hand.flag ? flag(hand.flag) : null,
        title: hand.title,
        content: hand.content,
        keywords: hand.keywords ?? [],
        photos: photos(date, hand.photos ?? 0),
        created_at: at(date, '21:04'),
        updated_at: at(editedDay, hand.editedAt ?? '21:04'),
      })
      continue
    }
    const r = rnd()
    const firstYear = date < '2026-01-01'
    // Năm đầu ghi thưa hơn; tháng 10/2026 chỉ có các trang viết tay ở trên.
    const skip = date >= '2026-10-01' || r < (firstYear ? 0.2 : 0.09)
    if (skip) continue
    const score = (r < (firstYear ? 0.3 : 0.16) ? 1 : r < 0.4 ? 2 : r < 0.66 ? 3 : r < 0.88 ? 4 : 5) as Score
    const r2 = rnd()
    const written = r2 < 0.45
    const [title, content, sub] = score <= 2 ? pick(LOW, r2) : pick(HIGH, r2)
    out.push({
      entry_date: date,
      score,
      sub_icon: r2 < 0.7 ? sub : null,
      flag_color: r2 < 0.12 ? pick(flagColors, rnd()).hex : null,
      title: written ? title : null,
      content: written ? content : null,
      keywords: [],
      photos: photos(date, written && r2 < 0.2 ? 1 : 0),
      created_at: at(date, '21:30'),
      updated_at: at(date, '21:30'),
    })
  }
  return out
}

export const DEMO_ENTRIES: DemoEntry[] = build()

const BY_DATE = new Map(DEMO_ENTRIES.map((e) => [e.entry_date, e]))

/**
 * Chế độ dữ liệu mẫu: `full` (mặc định) hoặc `empty` (người dùng mới, chưa có trang nào, thiết kế B9 · màn trống).
 * Bật bằng `?demo=empty` trên bất kỳ trang nào của app, tắt bằng `?demo=full`; giữ trong sessionStorage của tab.
 */
export type DemoMode = 'full' | 'empty'
const MODE_KEY = 'jotly:demo'

export function demoMode(): DemoMode {
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('demo')
    if (fromUrl === 'empty' || fromUrl === 'full') sessionStorage.setItem(MODE_KEY, fromUrl)
    return sessionStorage.getItem(MODE_KEY) === 'empty' ? 'empty' : 'full'
  } catch {
    return 'full'
  }
}

/**
 * BẢN THỬ: trang vừa ghi trong tab này (vd. chấm điểm nhanh ở Dòng thời gian), đè lên dữ liệu mẫu; `null` là đã bỏ.
 * Mất khi tải lại trang. Khi có PUT /entries/{date} (Bước 5) thì bỏ, ghi qua API.
 */
const written = new Map<DateString, DemoEntry | null>()

/** Ghi (hoặc bỏ, với `null`) trang của một ngày trong bộ nhớ tab. */
export function demoWrite(date: DateString, entry: DemoEntry | null) {
  written.set(date, entry)
}

/** Dùng trong test để mỗi test bắt đầu từ dữ liệu mẫu gốc. */
export function clearDemoWrites() {
  written.clear()
}

/**
 * BẢN THỬ của "Xóa toàn bộ dữ liệu" (Hồ sơ): chuyển tab sang chế độ trống và bỏ các trang vừa ghi.
 * Tải lại với `?demo=full` để có lại dữ liệu mẫu. Bước 12 thay bằng API xóa thật.
 */
export function wipeDemoData() {
  written.clear()
  try {
    sessionStorage.setItem(MODE_KEY, 'empty')
  } catch {
    // sessionStorage bị chặn: dữ liệu mẫu vẫn hiện, chỉ là bản thử.
  }
}

/** Các trang mẫu theo chế độ hiện tại (rỗng khi `?demo=empty`), kèm các trang vừa ghi trong tab. */
export function demoEntries(): DemoEntry[] {
  const base = demoMode() === 'empty' ? [] : DEMO_ENTRIES
  if (!written.size) return base
  const byDate = new Map(base.map((e) => [e.entry_date, e]))
  for (const [date, e] of written) {
    if (e) byDate.set(date, e)
    else byDate.delete(date)
  }
  return [...byDate.values()].sort((a, b) => a.entry_date.localeCompare(b.entry_date))
}

/** Ngày bắt đầu dùng Jotly; người dùng mới thì là hôm nay. */
export function demoJoined(today: DateString): DateString {
  return demoMode() === 'empty' ? today : DEMO_JOINED
}

export function demoEntry(date: DateString): DemoEntry | null {
  if (written.has(date)) return written.get(date)!
  return demoMode() === 'empty' ? null : (BY_DATE.get(date) ?? null)
}

/** Các năm có dữ liệu (Year in Pixels chỉ cho chọn những năm này). */
export function demoYears(): number[] {
  return [...new Set(demoEntries().map((e) => Number(e.entry_date.slice(0, 4))))].sort()
}

/** Các trang mẫu của một tháng ("YYYY-MM"), mới nhất trước. */
export function demoMonth(month: string): DemoEntry[] {
  return demoEntries()
    .filter((e) => e.entry_date.startsWith(`${month}-`))
    .reverse()
}
