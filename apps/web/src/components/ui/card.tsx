import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"

// Thẻ "tờ giấy dán lên trang" (B11-Components · Card): nền card, viền mực 1.5px, bo radius-lg.
// raised: thẻ đứng riêng, bóng 4px (mặc định). low: thẻ nhỏ, chip lớn, bóng 2px. flat: thẻ trong danh sách dài.
// interactive: cả thẻ bấm được (nhấc khi di chuột, ấn dịch đúng độ lệch bóng); dùng với asChild để bọc <button>/<Link>.
const cardVariants = cva("rounded-lg border-[1.5px] border-stroke bg-card text-ink", {
  variants: {
    elevation: {
      raised: "shadow-md",
      low: "shadow-sm",
      flat: "",
    },
    interactive: {
      true: "block w-full cursor-pointer text-left outline-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus",
      false: "",
    },
  },
  compoundVariants: [
    { elevation: "raised", interactive: true, className: "lift" },
    { elevation: "low", interactive: true, className: "lift-sm" },
    { elevation: "flat", interactive: true, className: "row-press" },
  ],
  defaultVariants: { elevation: "raised", interactive: false },
})

function Card({
  className,
  elevation,
  interactive,
  asChild = false,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof cardVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "div"
  return (
    <Comp
      data-slot="card"
      className={cn(cardVariants({ elevation, interactive }), className)}
      {...props}
    />
  )
}

export { Card, cardVariants }
