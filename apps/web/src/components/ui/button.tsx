import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Nút theo nền tảng "Sổ dán" (DESIGN.md mục 4–5): viền mực 1.5px, bóng cứng; vùng chạm tối thiểu 44px (size default,
// icon). Cử chỉ "tờ giấy": di chuột (chỉ con trỏ chuột) nhấc 2px và bóng dài thêm 2px; ấn thì dịch đúng bằng độ lệch
// bóng và bóng biến mất, trong --dur-press.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border-(length:--stroke-width) font-sans whitespace-nowrap transition-[translate,box-shadow,background-color,border-color] duration-(--dur-fast) ease-out outline-none select-none active:duration-(--dur-press) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:shadow-none disabled:translate-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Nút đặc mực không bóng: chỉ lún 1px khi ấn.
        default:
          "border-primary bg-primary font-semibold text-primary-foreground hover:border-primary-hover hover:bg-primary-hover active:translate-y-px disabled:border-dashed disabled:border-disabled-line disabled:bg-disabled disabled:text-disabled-foreground",
        secondary:
          "border-line bg-card font-semibold text-foreground shadow-ink-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-ink active:translate-x-0.5 active:translate-y-0.5 active:bg-secondary active:shadow-none disabled:border-dashed disabled:border-disabled-line disabled:bg-transparent disabled:text-disabled-foreground",
        ghost:
          "border-transparent bg-transparent font-medium text-foreground underline underline-offset-4 hover:bg-secondary active:bg-pressed disabled:bg-transparent disabled:text-disabled-foreground",
        destructive:
          "border-destructive bg-card font-semibold text-destructive shadow-danger-sm hover:-translate-x-0.5 hover:-translate-y-0.5 hover:bg-destructive-soft hover:shadow-danger active:translate-x-0.5 active:translate-y-0.5 active:bg-destructive-soft active:shadow-none disabled:border-dashed disabled:border-disabled-line disabled:bg-transparent disabled:text-disabled-foreground",
        // Nút chính nổi bật (DESIGN.md mục 4): nền mực, bóng màu đào --cta-shadow ở cả hai chế độ; một nút mỗi màn.
        cta: "border-line bg-primary font-semibold text-primary-foreground shadow-accent hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-[6px_6px_0_var(--cta-shadow)] active:translate-x-1 active:translate-y-1 active:shadow-none disabled:border-dashed disabled:border-disabled-line disabled:bg-disabled disabled:text-disabled-foreground",
        // Nút xác nhận trong hộp thoại xóa vĩnh viễn: nền đỏ đặc, cùng một màu ở cả hai chế độ.
        "destructive-solid":
          "border-destructive-fill bg-destructive-fill font-semibold text-on-danger hover:brightness-110 active:translate-y-px disabled:border-dashed disabled:border-disabled-line disabled:bg-disabled disabled:text-disabled-foreground",
        outline:
          "border-line bg-transparent font-medium text-foreground hover:bg-secondary active:bg-pressed disabled:border-dashed disabled:border-disabled-line disabled:text-disabled-foreground",
        link: "border-transparent font-medium text-foreground underline underline-offset-4 hover:text-primary-hover",
      },
      size: {
        default: "h-11 px-5 text-body",
        sm: "h-9 rounded-[10px] px-3.5 text-sm",
        lg: "h-12 px-6 text-base",
        icon: "size-11",
        "icon-sm": "size-9 rounded-[10px]",
        "icon-lg": "size-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
