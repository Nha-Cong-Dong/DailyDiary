import { useId } from 'react'
import { X } from 'lucide-react'
import { flagHex } from '@/lib/catalog'
import { useCustomFlagColors } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'

/**
 * Hồ sơ › Nhật ký: màu cờ riêng đã thêm (chốt Q6). Thêm màu ở ô "+" khi chọn cờ; ở đây chỉ xem và gỡ.
 * Gỡ màu không đổi các trang đã gắn màu đó.
 */
export function CustomFlagColors() {
  const ids = useId()
  const dark = useDarkMode()
  const custom = useCustomFlagColors()
  return (
    <div className="flex flex-col gap-3 max-sm:gap-2.5 max-sm:px-4 max-sm:pt-3.5">
      <div className="flex flex-col gap-0.5">
        <span id={`${ids}-title`} className="text-sm leading-[22px] font-semibold max-sm:text-body">
          Màu cờ riêng · {custom.colors.length}/{custom.max}
        </span>
        <span className="text-label leading-5 text-muted-foreground max-sm:text-label max-sm:leading-[18px]">
          Thêm bằng ô + khi chọn cờ hiệu. Gỡ màu không đổi những trang đã gắn màu đó.
        </span>
      </div>
      {custom.colors.length ? (
        <ul aria-labelledby={`${ids}-title`} className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {custom.colors.map((hex) => (
            <li key={hex} className="flex items-center gap-1.5 rounded-[10px] border-(length:--stroke-width) border-line py-1 pr-1 pl-1.5">
              <span
                aria-hidden
                className="h-7 w-9 rounded-sm border-(length:--stroke-width) border-line"
                style={{ backgroundColor: flagHex(hex, dark) }}
              />
              <span className="font-mono text-label text-muted-foreground">{hex}</span>
              <button
                type="button"
                aria-label={`Gỡ màu ${hex}`}
                disabled={custom.pending}
                onClick={() => custom.remove(hex)}
                className="flex size-8 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted focus-visible:outline-3 focus-visible:outline-ring disabled:cursor-wait disabled:opacity-60"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-label leading-5 text-muted-foreground">Chưa có màu riêng nào.</p>
      )}
    </div>
  )
}
