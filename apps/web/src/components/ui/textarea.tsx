import * as React from "react"
import { cn } from "@/lib/utils"

// Ô viết nội dung: chữ 18/30 trên dòng kẻ vở (utility `ruled` trong index.css).
function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "ruled flex field-sizing-content min-h-32 w-full resize-y rounded-md border-[1.5px] border-stroke bg-card bg-origin-content px-3.5 py-2.5 text-reading text-ink outline-none placeholder:text-ink-faint focus-visible:shadow-sm focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:border-dashed disabled:border-disabled-line disabled:bg-sunk disabled:text-ink-faint aria-invalid:border-danger aria-invalid:shadow-danger-sm",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
