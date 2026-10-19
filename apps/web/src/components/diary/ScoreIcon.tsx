import type { ReactNode } from 'react'
import { findIconSet, type Score } from '@/lib/catalog'

// Hình vẽ 6 bộ main icon (id theo shared/icons.json). Màu lấy từ biến CSS --score-*, --icon-* trong index.css
// nên tự đổi theo chế độ sáng/tối.
const INK = 'var(--icon-ink)'
const FACE = 'var(--icon-face)'
const r = (n: Score) => `var(--score-${n})`

const PETAL =
  'M20 20C15.2 17.4 13.6 12 16 8.2c1.1-1.7 2.6-1.6 4 .4c1.4-2 2.9-2.1 4-.4c2.4 3.8.8 9.2-4 11.8z'
const CLOUD = 'M9 30h17a5 5 0 0 0 0-10A7 7 0 0 0 13 18.5A5.5 5.5 0 0 0 9 30z'
const BEAN =
  'M21 6c6.5 0 10.5 5 10.5 12.5S27.5 34 20.5 34S9 29.5 9 23.5c0-3.5 2.6-4.5 2.6-7.5S11 12 12.5 9.5C14 7.3 17.5 6 21 6z'
const SPARKLE = (x: number, y: number) =>
  `M${x} ${y}l.6 2.2l2.2.6l-2.2.6l-.6 2.2l-.6-2.2l-2.2-.6l2.2-.6z`

function Flower({ fill, rotate = 0 }: { fill: string; rotate?: number }) {
  return (
    <g transform={`rotate(${rotate} 20 20)`}>
      {[0, 72, 144, 216, 288].map((a) => (
        <path key={a} d={PETAL} fill={fill} transform={a ? `rotate(${a} 20 20)` : undefined} />
      ))}
    </g>
  )
}

const sprout: Record<Score, ReactNode> = {
  1: (
    <g stroke={INK}>
      <path d="M10 33.5c2.5-5 17.5-5 20 0" fill="var(--icon-soil)" />
      <path d="M7 33.5h26" />
      <ellipse cx="20" cy="27" rx="4.5" ry="3.3" transform="rotate(-20 20 27)" fill={r(1)} />
    </g>
  ),
  2: (
    <g stroke={INK}>
      <path d="M7 33.5h26" />
      <path d="M20 33.5V22" />
      <path d="M20 25c-1.5-4.5-5.5-6.5-9.5-6c.2 4.2 4 6.8 9.5 6z" fill={r(2)} />
      <path d="M20 22.5c1.2-4.6 5-7 9.5-6.8c-.4 4.3-4.2 6.9-9.5 6.8z" fill={r(2)} />
    </g>
  ),
  3: (
    <g stroke={INK}>
      <path d="M7 33.5h26" />
      <path d="M20 33.5V17" />
      <path d="M20 28c-1.4-4.2-5.2-6-9-5.6c.3 4 3.8 6.3 9 5.6z" fill={r(3)} />
      <path d="M20 18c-3.6 0-5.5-2.7-5.5-5.8c0-3.2 2.4-5.6 5.5-7.7c3.1 2.1 5.5 4.5 5.5 7.7c0 3.1-1.9 5.8-5.5 5.8z" fill={r(3)} />
    </g>
  ),
  4: (
    <g stroke={INK}>
      <path d="M7 33.5h26" />
      <path d="M20 33.5V20" />
      <path d="M20 28c1.4-4.2 5.2-6 9-5.6c-.3 4-3.8 6.3-9 5.6z" fill={r(4)} />
      <path d="M12.5 8.5l3.8 4.2L20 7.5l3.7 5.2l3.8-4.2v6.3c0 4.3-3.3 6.7-7.5 6.7s-7.5-2.4-7.5-6.7z" fill={r(4)} />
    </g>
  ),
  5: (
    <g stroke={INK}>
      <path d="M7 33.5h26" />
      <path d="M20 33.5V20" />
      <path d="M20 29c-1.4-4.2-5.2-6-9-5.6c.3 4 3.8 6.3 9 5.6z" fill={r(5)} />
      <path d="M20 27c1.4-4.2 5.2-6 9-5.6c-.3 4-3.8 6.3-9 5.6z" fill={r(5)} />
      {[
        [20, 7.9],
        [25.33, 11.77],
        [23.29, 18.03],
        [16.71, 18.03],
        [14.67, 11.77],
      ].map(([cx, cy]) => (
        <circle key={cx} cx={cx} cy={cy} r="4.6" fill={r(5)} />
      ))}
      <circle cx="20" cy="13.5" r="2.8" fill={INK} />
      <path d="M5.5 3l.7 2.3l2.3.7l-2.3.7l-.7 2.3l-.7-2.3l-2.3-.7l2.3-.7z" fill={INK} stroke="none" />
      <circle cx="34" cy="5.5" r="1.1" fill={INK} stroke="none" />
    </g>
  ),
}

const face: Record<Score, ReactNode> = {
  1: (
    <>
      <circle cx="20" cy="20" r="15" fill={r(1)} stroke={INK} />
      <circle cx="14.5" cy="18.5" r="1.7" fill={FACE} />
      <circle cx="25.5" cy="18.5" r="1.7" fill={FACE} />
      <path d="M11.5 13.5l4.5 1.6 M28.5 13.5l-4.5 1.6" stroke={FACE} />
      <path d="M14 28c2.2-4.4 9.8-4.4 12 0" stroke={FACE} />
    </>
  ),
  2: (
    <>
      <circle cx="20" cy="20" r="15" fill={r(2)} stroke={INK} />
      <circle cx="14.5" cy="18" r="1.7" fill={FACE} />
      <circle cx="25.5" cy="18" r="1.7" fill={FACE} />
      <path d="M15 27c2-2.6 8-2.6 10 0" stroke={FACE} />
    </>
  ),
  3: (
    <>
      <circle cx="20" cy="20" r="15" fill={r(3)} stroke={INK} />
      <circle cx="14.5" cy="18" r="1.7" fill={FACE} />
      <circle cx="25.5" cy="18" r="1.7" fill={FACE} />
      <path d="M15 26h10" stroke={FACE} />
    </>
  ),
  4: (
    <>
      <circle cx="20" cy="20" r="15" fill={r(4)} stroke={INK} />
      <circle cx="14.5" cy="17.5" r="1.7" fill={FACE} />
      <circle cx="25.5" cy="17.5" r="1.7" fill={FACE} />
      <path d="M14.5 24.5c2.6 3.6 8.4 3.6 11 0" stroke={FACE} />
    </>
  ),
  5: (
    <>
      <circle cx="20" cy="20" r="15" fill={r(5)} stroke={INK} />
      <path d="M12.5 18.5c1.2-2.4 4.3-2.4 5.5 0 M22 18.5c1.2-2.4 4.3-2.4 5.5 0" stroke={FACE} />
      <path d="M13.5 23h13c-.6 4.6-3.2 7-6.5 7s-5.9-2.4-6.5-7z" fill={FACE} stroke={FACE} />
      <path d={SPARKLE(35, 2.2)} fill={INK} />
      <circle cx="4.5" cy="7" r="1" fill={INK} />
    </>
  ),
}

const moon: Record<Score, ReactNode> = {
  1: (
    <g stroke={INK}>
      <circle cx="20" cy="20" r="15" fill="var(--icon-moon)" />
      <circle cx="20" cy="20" r="15" strokeDasharray="2 4" stroke={r(1)} />
      <path d={SPARKLE(34.5, 3.2)} fill={INK} stroke="none" />
      <circle cx="5" cy="33" r="1" fill={INK} stroke="none" />
      <circle cx="35.5" cy="31" r=".8" fill={INK} stroke="none" />
    </g>
  ),
  2: (
    <g stroke={INK}>
      <circle cx="20" cy="20" r="15" fill="var(--icon-moon)" stroke="none" />
      <path d="M20 5A15 15 0 0 1 20 35A8 15 0 0 0 20 5z" fill={r(2)} />
      <circle cx="20" cy="20" r="15" />
    </g>
  ),
  3: (
    <g stroke={INK}>
      <circle cx="20" cy="20" r="15" fill="var(--icon-moon)" stroke="none" />
      <path d="M20 5A15 15 0 0 1 20 35z" fill={r(3)} />
      <circle cx="20" cy="20" r="15" />
    </g>
  ),
  4: (
    <g stroke={INK}>
      <circle cx="20" cy="20" r="15" fill="var(--icon-moon)" stroke="none" />
      <path d="M20 5A15 15 0 0 1 20 35A8 15 0 0 1 20 5z" fill={r(4)} />
      <circle cx="20" cy="20" r="15" />
    </g>
  ),
  5: (
    <g stroke={INK}>
      <circle cx="20" cy="20" r="15" fill={r(5)} />
      <path d={SPARKLE(5, 3.2)} fill={INK} stroke="none" />
      <circle cx="35" cy="33.5" r="1" fill={INK} stroke="none" />
    </g>
  ),
}

const sakura: Record<Score, ReactNode> = {
  1: (
    <g stroke={INK}>
      <path d="M20 13v-2.6 M23.6 15.8l2.4-.8 M22.2 20.1l1.5 2 M17.8 20.1l-1.5 2 M16.4 15.8l-2.4-.8" />
      <circle cx="20" cy="17" r="3.4" fill="var(--icon-sakura-wilt)" />
      <path d={PETAL} fill="var(--icon-sakura-1)" strokeWidth="3.5" transform="translate(28 31) rotate(115) scale(.5) translate(-20 -13)" />
      <path d={PETAL} fill="var(--icon-sakura-1)" strokeWidth="4.4" transform="translate(11 31) rotate(-35) scale(.4) translate(-20 -13)" />
    </g>
  ),
  2: (
    <g stroke={INK}>
      <g transform="translate(0 -5)">
        {[140, 220, 180].map((a) => (
          <path key={a} d={PETAL} fill="var(--icon-sakura-2)" transform={`rotate(${a} 20 20)`} />
        ))}
        <circle cx="20" cy="20" r="3" fill="var(--icon-sakura-wilt)" />
      </g>
      <path d={PETAL} fill="var(--icon-sakura-2)" strokeWidth="3.9" transform="translate(31.5 32) rotate(150) scale(.45) translate(-20 -13)" />
    </g>
  ),
  3: (
    <g stroke={INK}>
      <g transform="translate(20 21) scale(.78) translate(-20 -20)" strokeWidth="2.25">
        <Flower fill="var(--icon-sakura-3)" />
        <circle cx="20" cy="20" r="2.8" fill="var(--icon-sakura-core)" />
      </g>
    </g>
  ),
  4: (
    <g stroke={INK}>
      <Flower fill="var(--icon-sakura-4)" />
      <circle cx="20" cy="20" r="2.8" fill="var(--icon-sakura-core)" />
    </g>
  ),
  5: (
    <g stroke={INK}>
      <Flower fill="var(--icon-sakura-5)" rotate={-12} />
      <circle cx="20" cy="20" r="3" fill="var(--icon-sakura-core)" />
      {[
        [20, 15.4],
        [24.4, 18.6],
        [22.7, 23.7],
        [17.3, 23.7],
        [15.6, 18.6],
      ].map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r=".9" fill={INK} stroke="none" />
      ))}
      <path d="M4.5 8.5l3 1.2 M6.5 4.5l1.6 2.8 M35.5 31.5l-3-1.2 M33.5 35.5l-1.6-2.8" />
    </g>
  ),
}

const sun: Record<Score, ReactNode> = {
  1: (
    <g stroke={INK}>
      <path d="M25 5V2 M32.1 7.9l2.1-2.1 M35 15h3 M17.9 7.9l-2.1-2.1" />
      <circle cx="25" cy="15" r="7.5" fill="var(--icon-sun-1)" />
      <path d="M21.4 11.3l2.4.9 M28.6 11.3l-2.4.9" stroke={FACE} />
      <circle cx="22.7" cy="14.2" r="1.1" fill={FACE} stroke="none" />
      <circle cx="27.3" cy="14.2" r="1.1" fill={FACE} stroke="none" />
      <path d={CLOUD} transform="translate(1 2)" fill="var(--icon-cloud-dark)" />
      <path d="M11 35.5l-1.5 2.8 M17 35.5l-1.5 2.8 M23 35.5l-1.5 2.8" stroke="var(--icon-rain)" />
    </g>
  ),
  2: (
    <g stroke={INK}>
      <path d="M25 5V2 M32.1 7.9l2.1-2.1 M35 15h3 M17.9 7.9l-2.1-2.1 M32.1 22.1l2.1 2.1" />
      <circle cx="25" cy="15" r="7.5" fill="var(--icon-sun-2)" />
      <path d="M21.7 14.3h2 M26.3 14.3h2" stroke={FACE} />
      <path d={CLOUD} transform="translate(3 6)" fill="var(--icon-cloud)" />
    </g>
  ),
  3: (
    <g stroke={INK}>
      <path d="M34 16h3 M30.8 23.8l2.1 2.1 M23 27v3 M12 16H9 M15.2 8.2l-2.1-2.1 M23 5V2 M30.8 8.2l2.1-2.1" />
      <circle cx="23" cy="16" r="8.5" fill="var(--icon-sun-3)" />
      <circle cx="20.2" cy="14.8" r="1.2" fill={FACE} stroke="none" />
      <circle cx="25.8" cy="14.8" r="1.2" fill={FACE} stroke="none" />
      <path d="M20.6 18.6c1.3 1.5 3.5 1.5 4.8 0" stroke={FACE} />
      <path d={CLOUD} transform="translate(-1 13) scale(.7)" strokeWidth="2.5" fill="var(--icon-cloud)" />
    </g>
  ),
  4: (
    <g stroke={INK}>
      <path d="M32.5 20h4 M28.8 28.8l2.9 2.9 M20 32.5v4 M11.2 28.8l-2.9 2.9 M7.5 20h-4 M11.2 11.2l-2.9-2.9 M20 7.5v-4 M28.8 11.2l2.9-2.9" />
      <circle cx="20" cy="20" r="9" fill="var(--icon-sun-4)" />
      <circle cx="16.8" cy="18.5" r="1.3" fill={FACE} stroke="none" />
      <circle cx="23.2" cy="18.5" r="1.3" fill={FACE} stroke="none" />
      <path d="M16.5 22.3c1.8 2.3 5.2 2.3 7 0" stroke={FACE} />
    </g>
  ),
  5: (
    <g stroke={INK}>
      <path d="M32.5 20h5 M28.8 28.8l3.2 3.2 M20 32.5v5 M11.2 28.8l-3.2 3.2 M7.5 20h-5 M11.2 11.2l-3.2-3.2 M20 7.5v-5 M28.8 11.2l3.2-3.2" />
      <circle cx="20" cy="20" r="9.5" fill="var(--icon-sun-5)" />
      <path d="M15.4 18.8c.8-1.5 2.8-1.5 3.6 0 M21 18.8c.8-1.5 2.8-1.5 3.6 0" stroke={FACE} />
      <path d="M15.8 21.6h8.4c-.5 3.1-2.2 4.6-4.2 4.6s-3.7-1.5-4.2-4.6z" fill={FACE} stroke={FACE} />
      <circle cx="14.4" cy="22.8" r="1.5" fill="var(--icon-blush)" stroke="none" />
      <circle cx="25.6" cy="22.8" r="1.5" fill="var(--icon-blush)" stroke="none" />
    </g>
  ),
}

const bean: Record<Score, ReactNode> = {
  1: (
    <>
      <path d={BEAN} fill={r(1)} stroke={INK} />
      <path d="M15.8 19c.9 1 2.8 1 3.7 0 M22.7 19c.9 1 2.8 1 3.7 0" stroke={FACE} />
      <path d="M17.6 21.4c-.9 1.6-1.4 2.6-1.4 3.4a1.4 1.4 0 0 0 2.8 0c0-.8-.5-1.8-1.4-3.4z" fill="var(--icon-tear)" stroke={FACE} strokeWidth="1.2" />
      <path d="M18.3 28.2c1.4-1.8 4.6-1.8 6 0" stroke={FACE} />
    </>
  ),
  2: (
    <>
      <path d={BEAN} fill={r(2)} stroke={INK} />
      <circle cx="17.6" cy="19.5" r="1.3" fill={FACE} />
      <circle cx="24.6" cy="19.5" r="1.3" fill={FACE} />
      <path d="M15.4 15.9l3 1.1 M26.8 15.9l-3 1.1" stroke={FACE} />
      <path d="M18.6 26.6c1.2-1.3 3.8-1.3 5 0" stroke={FACE} />
    </>
  ),
  3: (
    <>
      <path d={BEAN} fill={r(3)} stroke={INK} />
      <circle cx="17.6" cy="19.5" r="1.3" fill={FACE} />
      <circle cx="24.6" cy="19.5" r="1.3" fill={FACE} />
      <path d="M18.9 25.6h4.6" stroke={FACE} />
    </>
  ),
  4: (
    <>
      <path d={BEAN} fill={r(4)} stroke={INK} />
      <circle cx="17.6" cy="19.5" r="1.3" fill={FACE} />
      <circle cx="24.6" cy="19.5" r="1.3" fill={FACE} />
      <path d="M18.1 24.2c1.6 2.1 4.4 2.1 6 0" stroke={FACE} />
      <circle cx="15.4" cy="23" r="1.4" fill="var(--icon-blush)" />
      <circle cx="27.1" cy="23" r="1.4" fill="var(--icon-blush)" />
    </>
  ),
  5: (
    <>
      <path d={BEAN} fill={r(5)} stroke={INK} />
      <path d="M15.7 19.8c.8-1.6 2.9-1.6 3.7 0 M22.7 19.8c.8-1.6 2.9-1.6 3.7 0" stroke={FACE} />
      <path d="M17.5 23.2h7.6c-.4 2.9-1.9 4.4-3.8 4.4s-3.4-1.5-3.8-4.4z" fill={FACE} stroke={FACE} />
      <circle cx="15.4" cy="23.6" r="1.4" fill="var(--icon-blush)" />
      <circle cx="27.1" cy="23.6" r="1.4" fill="var(--icon-blush)" />
      <path d="M34.5 5.5v5 M32 8h5" stroke={INK} />
    </>
  ),
}

const DRAWINGS: Record<string, Record<Score, ReactNode>> = { sprout, face, moon, sakura, sun, bean }

type ScoreIconProps = {
  iconSetId: string
  score: Score
  /** Cạnh hình vuông, px. */
  size?: number
  /** Nét mảnh hơn khi icon lớn (1.75), dày hơn khi icon nhỏ (2.2) để không mất chi tiết. */
  strokeWidth?: number
  className?: string
}

/** Main icon của một ngày. Chỉ là hình trang trí; nhãn chữ do component cha cung cấp. */
export function ScoreIcon({ iconSetId, score, size = 40, strokeWidth, className }: ScoreIconProps) {
  const set = findIconSet(iconSetId)
  const drawing = (DRAWINGS[set.id] ?? sprout)[score]
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      strokeWidth={strokeWidth ?? (size <= 32 ? 2.2 : 1.75)}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {drawing}
    </svg>
  )
}
