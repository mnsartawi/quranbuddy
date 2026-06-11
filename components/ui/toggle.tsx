"use client"
import { cn } from "@/lib/utils"

interface ToggleProps {
  checked?: boolean
  onCheckedChange?: (checked: boolean) => void
  className?: string
  disabled?: boolean
}

export function Toggle({
  checked = false,
  onCheckedChange,
  className,
  disabled = false,
}: ToggleProps) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "relative inline-block h-7 w-16 rounded-full transition-colors duration-300 outline-none",
        "focus-visible:ring-2 focus-visible:ring-[#4cd964] focus-visible:ring-offset-2",
        checked ? "bg-[#4cd964]" : "bg-[#d1d1d6]",
        disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <div
        style={{
          transform: checked ? "translateX(24px)" : "translateX(0px)",
          transition: "transform 500ms cubic-bezier(0.34, 1.8, 0.64, 1)",
        }}
        className="absolute top-0.5 left-0.5 h-6 w-9 rounded-full bg-white shadow-sm"
      />
    </button>
  )
}
