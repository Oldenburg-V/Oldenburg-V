"use client"

import type { PlayerInfo, StatTone } from "@/lib/game-types"
import { cn } from "@/lib/utils"

const toneClasses: Record<StatTone, string> = {
  default: "bg-secondary text-secondary-foreground",
  gold: "bg-primary/15 text-primary ring-1 ring-primary/40",
  crimson: "bg-crimson/20 text-[oklch(0.82_0.12_28)] ring-1 ring-crimson/50",
  gem: "bg-gem/20 text-[oklch(0.82_0.1_300)] ring-1 ring-gem/50",
}

const avatarTone: Record<StatTone, string> = {
  default: "from-secondary to-muted text-foreground",
  gold: "from-primary to-gold-dim text-primary-foreground",
  crimson: "from-crimson to-[oklch(0.32_0.14_24)] text-foreground",
  gem: "from-gem to-[oklch(0.38_0.12_300)] text-foreground",
}

function initials(name: string) {
  if (!name || typeof name !== "string") return "?"
  return name
    .split(/\s+/)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

export interface PlayerSeatProps {
  player: PlayerInfo
  active?: boolean
  /** Layout the badge vertically (opponents) or as a wide bar (you). */
  variant?: "compact" | "wide"
  onClick?: () => void
  className?: string
}

export function PlayerSeat({
  player,
  active = false,
  variant = "compact",
  onClick,
  className,
}: PlayerSeatProps) {
  const accent = player.accent ?? "default"

  return (
    <div
      id={`seat-${player.id}`}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2.5 rounded-2xl border bg-popover/80 px-3 py-2 backdrop-blur-sm transition-all duration-200",
        active ? "border-primary/70 bg-popover" : "border-border/60",
        onClick && "cursor-pointer hover:bg-popover/90 active:scale-98 ring-2 ring-amber-500/60 border-amber-500/40 animate-pulse shadow-[0_0_12px_rgba(245,158,11,0.15)]",
        player.out && "opacity-45 grayscale",
        variant === "wide" && "px-3.5 py-2.5",
        className,
      )}
      style={
        active
          ? { boxShadow: "0 0 0 1px oklch(0.78 0.13 82 / 0.4), 0 0 22px oklch(0.78 0.13 82 / 0.25)" }
          : undefined
      }
    >
      <div className="relative shrink-0">
        {active && (
          <>
            <style>{`
              @keyframes avatarPulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.06); }
              }
            `}</style>
            <span
              aria-hidden
              className="absolute -inset-1 rounded-full ring-2 ring-primary pointer-events-none"
              style={{ animation: "avatarPulse 1.8s ease-in-out infinite" }}
            />
          </>
        )}
        {player.avatarUrl ? (
          <img
            src={player.avatarUrl}
            alt={player.name}
            className="size-9 rounded-full object-cover border border-primary/20 shadow-[0_0_8px_rgba(245,158,11,0.15)]"
          />
        ) : (
          <div
            className={cn(
              "grid size-9 place-items-center rounded-full bg-gradient-to-b font-display text-sm font-bold shadow-inner",
              avatarTone[accent],
            )}
          >
            {initials(player.name)}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate text-sm font-semibold leading-tight tracking-wide">
            {player.name}
          </span>
          {player.isYou && (
            <span className="rounded bg-primary/20 px-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
              You
            </span>
          )}
        </div>

        {player.status && (
          <div className="truncate text-[11px] leading-tight text-muted-foreground">
            {player.out ? "Out" : player.status}
          </div>
        )}

        {player.stats && player.stats.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center gap-1">
            {player.stats.map((s) => (
              <span
                key={s.label}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium leading-none",
                  toneClasses[s.tone ?? "default"],
                )}
              >
                <span className="opacity-70">{s.label}</span>
                <span className="font-mono tabular-nums">{s.value}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
