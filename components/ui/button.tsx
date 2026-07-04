"use client"

import { forwardRef } from "react"
import { cn } from "@/lib/utils"

type Variant = "gold" | "outline" | "ghost" | "crimson"
type Size = "sm" | "md" | "lg"

const variants: Record<Variant, string> = {
  gold: "bg-primary text-primary-foreground hover:brightness-110 shadow-[0_2px_10px_oklch(0.78_0.13_82/0.35)]",
  crimson: "bg-crimson text-foreground hover:brightness-110",
  outline: "border border-primary/50 text-primary hover:bg-primary/10",
  ghost: "text-foreground/80 hover:bg-secondary hover:text-foreground",
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "gold", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center gap-2 rounded-lg font-display font-semibold tracking-wide transition-all",
          "disabled:pointer-events-none disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          variants[variant],
          sizes[size],
          className,
        )}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"
