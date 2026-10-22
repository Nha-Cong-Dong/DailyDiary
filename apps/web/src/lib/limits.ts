import limitsJson from '@shared/limits.json'

/** Giới hạn dùng chung với backend. Chỉ đọc từ đây, không viết cứng con số trong component. */
export const limits = limitsJson

export type Tier = keyof typeof limitsJson.tiers

export function tierLimits(tier: Tier = limitsJson.default_tier as Tier) {
  return limitsJson.tiers[tier]
}
