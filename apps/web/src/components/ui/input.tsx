import * as React from "react"
import { cn } from "@/lib/utils"

// Ô nhập "Sổ dán": viền mực, khi focus thêm bóng cứng và viền focus; lỗi đổi viền + bóng sang màu nguy hiểm.
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-12 w-full min-w-0 rounded-md border-(length:--stroke-width) border-input bg-card px-3.5 text-base text-foreground transition-shadow outline-none placeholder:text-disabled-foreground focus-visible:shadow-ink-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-dashed disabled:border-disabled-line disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:shadow-danger-sm",
        className
      )}
      {...props}
    />
  )
}

export { Input }
