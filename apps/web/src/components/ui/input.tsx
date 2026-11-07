import * as React from "react"
import { cn } from "@/lib/utils"

// Ô nhập (hệ 1.1, canvas .j-field): nền card, viền mực, chữ body 16px (không để Safari phóng to); focus thêm
// bóng 2px và viền focus 3px; lỗi đổi viền + bóng sang danger; tắt: nền sunk, viền nét đứt.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border-[1.5px] border-stroke bg-card px-3.5 text-body text-ink transition-shadow duration-(--dur-fast) outline-none placeholder:text-ink-faint focus-visible:shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-dashed disabled:border-disabled-line disabled:bg-sunk disabled:text-ink-faint aria-invalid:border-danger aria-invalid:shadow-danger-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
