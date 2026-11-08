import { useId } from 'react'
import { X } from 'lucide-react'
import { flagHex } from '@/lib/catalog'
import { useCustomFlagColors } from '@/lib/profile'
import { useDarkMode } from '@/lib/theme'
import { useT } from '@/lib/i18n'

/**
 * Hồ sơ › Nhật ký: màu cờ riêng đã thêm (chốt Q6). Thêm màu ở ô "+" khi chọn cờ; ở đây chỉ xem và gỡ.
 * Gỡ màu không đổi các trang đã gắn màu đó.
 */
export function CustomFlagColors() {
  const ids = useId()
  const t = useT()
  const dark = useDarkMode()
  const custom = useCustomFlagColors()
  return (
    <div className="flex flex-col gap-3 max-sm:gap-2.5 max-sm:px-4 max-sm:pt-3.5">
      <div className="flex flex-col gap-0.5">
        <span id={`${ids}-title`} className="text-sm leading-[22px] font-semibold max-sm:text-body max-sm:leading-[22px]">
          {t('profile:flags.title', { used: custom.colors.length, max: custom.max })}
        </span>
        <span className="text-label leading-5 font-normal text-ink-soft max-sm:leading-[18px]">
          {t('profile:flags.hint')}
        </span>
      </div>
      {custom.colors.length ? (
        <ul aria-labelledby={`${ids}-title`} className="m-0 flex list-none flex-wrap gap-2.5 p-0">
          {custom.colors.map((hex) => (
            <li key={hex} className="flex items-center gap-1.5 rounded-[10px] edge py-1 pr-1 pl-1.5">
              {/* Màu cờ là dữ liệu người dùng: tô bằng mã hex đã lưu (bản tối đổi qua flagHex). */}
              <span aria-hidden className="h-7 w-9 rounded-sm edge" style={{ backgroundColor: flagHex(hex, dark) }} />
              <span className="text-label leading-[18px] font-normal text-ink-soft nums">{hex}</span>
              <button
                type="button"
                aria-label={t('profile:flags.removeLabel', { hex })}
                disabled={custom.pending}
                onClick={() => custom.remove(hex)}
                // Nút 32 px như canvas; vùng chạm mở rộng ra 44 px.
                className="row-press relative flex size-8 cursor-pointer items-center justify-center rounded-[10px] text-ink-soft after:absolute after:-inset-1.5 focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-wait disabled:opacity-60"
              >
                <X aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="m-0 text-label leading-5 font-normal text-ink-soft">{t('profile:flags.none')}</p>
      )}
    </div>
  )
}
