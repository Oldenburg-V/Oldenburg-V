"use client"

import { cn } from "@/lib/utils"

export interface PlayZoneProps {
  label?: string
  /** Glow to signal an active drop target / current focus. */
  active?: boolean
  children?: React.ReactNode
  className?: string
}

/** A felt panel used as the central (or per-player) play surface. */
export function PlayZone({ label, active = false, children, className }: PlayZoneProps) {
  return (
    <div
      className={cn(
        "relative flex min-h-28 items-center justify-center rounded-2xl border p-4 transition-colors",
        active ? "border-primary/60" : "border-border/40",
        className,
      )}
      style={{
        background:
          "radial-gradient(ellipse 90% 90% at 50% 50%, oklch(0.34 0.06 150 / 0.5), oklch(0.22 0.03 150 / 0.35))",
        boxShadow: active
          ? "inset 0 0 40px oklch(0.78 0.13 82 / 0.18), 0 0 0 1px oklch(0.78 0.13 82 / 0.35)"
          : "inset 0 0 40px oklch(0 0 0 / 0.45)",
      }}
    >
      {label && (
        <span className="pointer-events-none absolute left-3 top-2 font-display text-[11px] font-semibold uppercase tracking-[0.2em] text-primary/70">
          {label}
        </span>
      )}
      {children}
    </div>
  )
}
