"use client"

import { cn } from "@/lib/utils"

export interface GameHudProps {
  gameName: string
  /** e.g. round/phase info shown centered. */
  info?: React.ReactNode
  /** right-aligned controls slot. */
  actions?: React.ReactNode
  className?: string
}

export function GameHud({ gameName, info, actions, className }: GameHudProps) {
  return (
    <header
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border/50 bg-background/70 px-3 py-2 backdrop-blur-md sm:px-4",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2.5">
        <img
          src="/logo.png"
          alt="Oldenburg V"
          className="size-9 shrink-0 rounded-md object-contain sm:size-10"
        />
        <div className="min-w-0 leading-tight">
          <div className="font-display text-sm font-bold tracking-widest text-gilded sm:text-base">
            OLDENBURG V
          </div>
          <div className="truncate text-[11px] text-muted-foreground">{gameName}</div>
        </div>
      </div>

      {info && (
        <div className="hidden flex-1 items-center justify-center text-center sm:flex">
          {info}
        </div>
      )}

      <div className="flex shrink-0 items-center gap-2">{actions}</div>
    </header>
  )
}
