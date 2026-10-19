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

/** Nhật ký lưu mã hex bản sáng; khi giao diện tối thì đổi sang bản tối tương ứng. */
export function flagHex(hex: string, dark: boolean): string {
  if (!dark) return hex
  return flagColors.find((c) => c.hex.toLowerCase() === hex.toLowerCase())?.hex_dark ?? hex
}
