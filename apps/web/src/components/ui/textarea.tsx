import * as React from "react"
import { cn } from "@/lib/utils"

// Ô viết nội dung: chữ 18/30 trên dòng kẻ vở (utility `ruled` trong index.css).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ruled flex field-sizing-content min-h-32 w-full resize-y rounded-md border-(length:--stroke-width) border-input bg-card bg-origin-content px-3.5 py-2.5 text-reading text-foreground outline-none placeholder:text-disabled-foreground focus-visible:shadow-ink-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:border-dashed disabled:border-disabled-line disabled:bg-disabled disabled:text-disabled-foreground aria-invalid:border-destructive aria-invalid:shadow-danger-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
