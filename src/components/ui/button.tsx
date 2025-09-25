import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium font-switzer transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 shadow-[inset_3px_4px_5px_0px_rgba(255,255,255,0.50)] outline outline-1 outline-offset-[-1px] outline-white/50",
  {
    variants: {
      variant: {
        default: "bg-sky-500 text-black hover:bg-sky-600 active:bg-sky-700",
        destructive:
          "bg-red-500 text-white hover:bg-red-600 active:bg-red-700 shadow-[inset_3px_4px_5px_0px_rgba(255,255,255,0.30)]",
        outline:
          "bg-white/10 text-foreground hover:bg-white/20 active:bg-white/30 shadow-[inset_3px_4px_5px_0px_rgba(255,255,255,0.20)]",
        secondary:
          "bg-zinc-600 text-white hover:bg-zinc-700 active:bg-zinc-800 shadow-[inset_3px_4px_5px_0px_rgba(255,255,255,0.30)]",
        ghost:
          "bg-transparent text-foreground hover:bg-white/10 active:bg-white/20 shadow-none outline-none",
        link: "bg-transparent text-sky-500 underline-offset-4 hover:underline shadow-none outline-none",
      },
      size: {
        default: "h-10 px-2.5 py-2 min-w-[176px]",
        sm: "h-8 px-2 py-1.5 min-w-[120px] text-xs",
        lg: "h-12 px-3 py-2.5 min-w-[200px] text-base",
        icon: "size-10 min-w-[40px]",
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
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
