import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"
import { Slot } from "radix-ui"

// Nút theo B11-Components: viền mực 1.5px, chữ body (16/24); cỡ sm 36, mặc định 44, lg 48, icon 44.
// Di chuột (chỉ chuột): nhấc 2px, bóng dài thêm 2px. Ấn: dịch đúng độ lệch bóng, bóng mất, 100ms.
// Tắt: viền nét đứt disabled-line, chữ ink-faint, không bóng, không phản hồi.
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md border-[1.5px] border-transparent font-sans whitespace-nowrap select-none transition-[transform,box-shadow,background-color,border-color,color] duration-(--dur-fast) ease-out active:duration-(--dur-press) focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:shadow-none disabled:translate-none disabled:filter-none motion-reduce:translate-none! [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        // Đặc mực, không bóng; lún 1px khi ấn.
        default:
          "border-primary bg-primary font-semibold text-on-primary pointer-fine:hover:border-primary-hover pointer-fine:hover:bg-primary-hover active:translate-y-px disabled:border-dashed disabled:border-disabled-line disabled:bg-secondary disabled:text-ink-faint",
        // Nút phụ, bóng 2px.
        secondary:
          "border-stroke bg-card font-semibold text-ink shadow-sm pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-md active:translate-x-0.5 active:translate-y-0.5 active:bg-secondary active:shadow-none disabled:border-dashed disabled:border-disabled-line disabled:bg-transparent disabled:text-ink-faint",
        // Thao tác nhẹ như Hủy.
        ghost:
          "bg-transparent font-medium text-ink underline underline-offset-4 pointer-fine:hover:bg-secondary active:bg-pressed disabled:bg-transparent disabled:text-ink-faint",
        // Xóa: viền, chữ và bóng đỏ.
        destructive:
          "border-danger bg-card font-semibold text-danger shadow-danger-sm pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:bg-danger-soft pointer-fine:hover:shadow-danger active:translate-x-0.5 active:translate-y-0.5 active:bg-danger-soft active:shadow-none disabled:border-dashed disabled:border-disabled-line disabled:bg-transparent disabled:text-ink-faint",
        // Nút chính, bóng đào (shadow-accent). Một nút mỗi màn.
        cta: "border-primary bg-primary font-semibold text-on-primary shadow-accent pointer-fine:hover:-translate-x-0.5 pointer-fine:hover:-translate-y-0.5 pointer-fine:hover:shadow-accent-lg active:translate-x-1 active:translate-y-1 active:shadow-none disabled:border-dashed disabled:border-disabled-line disabled:bg-secondary disabled:text-ink-faint",
        // Xác nhận trong hộp Xóa vĩnh viễn: nền danger-fill, cùng một màu ở cả hai chế độ.
        "destructive-solid":
          "border-danger-fill bg-danger-fill font-semibold text-on-danger pointer-fine:hover:brightness-110 active:translate-y-px disabled:border-dashed disabled:border-disabled-line disabled:bg-secondary disabled:text-ink-faint",
        // Viền mực, không bóng.
        outline:
          "border-stroke bg-transparent font-medium text-ink pointer-fine:hover:bg-secondary active:bg-pressed disabled:border-dashed disabled:border-disabled-line disabled:bg-transparent disabled:text-ink-faint",
        // Liên kết mang dáng nút.
        link: "font-medium text-ink underline underline-offset-4 pointer-fine:hover:text-primary-hover",
      },
      size: {
        default: "h-11 px-5 text-body",
        sm: "h-9 rounded-[10px] px-3.5 text-sm leading-5",
        lg: "h-12 px-6 text-body",
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
