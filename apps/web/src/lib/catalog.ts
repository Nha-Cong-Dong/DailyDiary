import flagColorsJson from '@shared/flag_colors.json'
import iconsJson from '@shared/icons.json'

/** Danh mục dùng chung với backend: bộ main icon, sub icon, màu cờ hiệu. Chỉ đọc từ đây. */
export type Score = 1 | 2 | 3 | 4 | 5
export const SCORES: readonly Score[] = [1, 2, 3, 4, 5]

export type IconSet = (typeof iconsJson.icon_sets)[number]
export type FlagColor = (typeof flagColorsJson.colors)[number]

export const iconSets: IconSet[] = iconsJson.icon_sets
export const defaultIconSetId = iconsJson.default_icon_set
export const subIcons: string[] = iconsJson.sub_icons
export const flagColors: FlagColor[] = flagColorsJson.colors

export function findIconSet(id: string): IconSet {
  return iconSets.find((s) => s.id === id) ?? iconSets.find((s) => s.id === defaultIconSetId)!
}

export function scoreLabel(iconSetId: string, score: Score): string {
  return findIconSet(iconSetId).levels.find((l) => l.score === score)?.label ?? String(score)
}

export function presetFlag(hex: string | null | undefined): FlagColor | undefined {
  if (!hex) return undefined
  return flagColors.find((c) => c.hex.toLowerCase() === hex.toLowerCase())
}

/** Tên hiển thị của cờ: tên trong bảng màu, "Màu riêng" cho màu tùy chỉnh, null khi không cờ. */
export function flagName(hex: string | null | undefined): string | null {
  if (!hex) return null
  return presetFlag(hex)?.name ?? 'Màu riêng'
}

// Tám màu có sẵn: hex_dark thấp hơn hex khoảng 25 ở mỗi kênh; màu tùy chỉnh pha tối theo cùng cách.
const DARK_SHIFT = 25

function darken(hex: string): string {
  const channels = [1, 3, 5].map((i) => Math.max(0, parseInt(hex.slice(i, i + 2), 16) - DARK_SHIFT))
  return `#${channels.map((c) => c.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

/** Nhật ký lưu mã hex bản sáng; khi giao diện tối thì đổi sang bản tối tương ứng. */
export function flagHex(hex: string, dark: boolean): string {
  if (!dark) return hex
  return presetFlag(hex)?.hex_dark ?? (/^#[0-9a-f]{6}$/i.test(hex) ? darken(hex) : hex)
}
