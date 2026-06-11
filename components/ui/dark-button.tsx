import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const darkButtonVariants = cva(
  "inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-sm font-medium whitespace-nowrap text-black transition-all outline-none select-none hover:scale-105 hover:bg-gray-50 active:scale-95 disabled:pointer-events-none disabled:opacity-50 dark:border-transparent dark:bg-[#222] dark:text-white dark:hover:bg-[#333]",
  {
    variants: {
      size: {
        default: "h-9 gap-1.5 px-8 py-2",
        sm: "h-8 gap-1 px-6 py-1.5",
        lg: "h-10 gap-1.5 px-10 py-2.5",
      },
    },
    defaultVariants: {
      size: "default",
    },
  }
)

interface DarkButtonProps
  extends
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof darkButtonVariants> {
  icon?: React.ReactNode
  children: React.ReactNode
}

function DarkButton({
  className,
  size,
  icon,
  children,
  ...props
}: DarkButtonProps) {
  return (
    <button className={cn(darkButtonVariants({ size, className }))} {...props}>
      {icon && (
        <span className="mr-3 inline h-5 w-5 focus:animate-spin">{icon}</span>
      )}
      {children}
    </button>
  )
}

export { DarkButton, darkButtonVariants }
