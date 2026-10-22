import * as React from "react"
import { cn } from "@/lib/utils"
import { Switch as SwitchPrimitive } from "radix-ui"

// Công tắc theo nền tảng "Sổ dán" (thiết kế B8 · Chia sẻ): rãnh 50×30 viền mực, bật = rãnh màu chữ;
// núm giấy nảy nhẹ khi chuyển. Vùng chạm mở rộng ra 44 px bằng ::after.
function Switch({
  className,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root>) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer group/switch relative inline-flex h-[30px] w-[50px] shrink-0 cursor-pointer items-center rounded-full border-[1.5px] border-line transition-colors duration-200 outline-none after:absolute after:-inset-x-1 after:-inset-y-2 focus-visible:outline-3 focus-visible:outline-offset-3 focus-visible:outline-ring data-checked:bg-foreground data-unchecked:bg-muted data-disabled:cursor-not-allowed data-disabled:border-dashed data-disabled:border-disabled-line",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className="pointer-events-none block size-[21px] translate-x-[3px] rounded-full border-[1.5px] border-line bg-card transition-[translate,scale] duration-300 ease-[cubic-bezier(.2,.8,.2,1)] group-hover/switch:scale-[1.04] group-active/switch:scale-[.96] data-checked:translate-x-[22px]"
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
