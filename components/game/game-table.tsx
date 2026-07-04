"use client"

import type { ReactNode } from "react"
import type { PlayerInfo } from "@/lib/game-types"
import { useMediaQuery } from "@/hooks/use-media-query"
import { PlayerSeat } from "./player-seat"
import { cn } from "@/lib/utils"

export interface GameTableProps {
  /** Players in seating order; the entry with `isYou` sits at the bottom. */
  players: PlayerInfo[]
  currentPlayerId?: string
  /** Cards / content shown next to each opponent seat. */
  renderSeatCards?: (player: PlayerInfo) => ReactNode
  /** The shared central play surface. */
  center: ReactNode
  /** The local player's hand (large, interactive). */
  youHand?: ReactNode
  /** Controls shown beside the local player's hand. */
  youActions?: ReactNode
  className?: string
}

/** Distribute opponents along an arc across the top and upper sides. */
function opponentPositions(m: number): { x: number; y: number }[] {
  if (m <= 0) return []
  if (m === 1) return [{ x: 50, y: 16 }]
  const RX = 45
  const RY = 30
  const cy = 40
  const start = 168
  const end = 12
  return Array.from({ length: m }, (_, i) => {
    const deg = start - (i * (start - end)) / (m - 1)
    const a = (deg * Math.PI) / 180
    return { x: 50 + RX * Math.cos(a), y: cy - RY * Math.sin(a) }
  })
}

export function GameTable({
  players,
  currentPlayerId,
  renderSeatCards,
  center,
  youHand,
  youActions,
  className,
}: GameTableProps) {
  const isWide = useMediaQuery("(min-width: 768px)")
  const you = players.find((p) => p.isYou) ?? players[0]
  const opponents = players.filter((p) => p !== you)
  const positions = opponentPositions(opponents.length)

  return (
    <div className={cn("relative flex h-full min-h-0 flex-col", className)}>
      {/* ---- Felt / table surface ---- */}
      {isWide ? (
        <div className="table-vignette relative flex-1 overflow-hidden">
          {/* Opponent seats positioned around the arc */}
          {opponents.map((p, i) => (
            <div
              key={p.id}
              className="absolute flex w-max -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2"
              style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }}
            >
              <PlayerSeat player={p} active={p.id === currentPlayerId} />
              {renderSeatCards?.(p)}
            </div>
          ))}

          {/* Central play surface */}
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-2">
            <div className="pointer-events-auto w-full max-w-xl">{center}</div>
          </div>
        </div>
      ) : (
        <div className="table-vignette flex flex-1 flex-col overflow-hidden">
          {/* Opponents in a scrollable top row */}
          <div className="flex gap-2 overflow-x-auto px-3 py-3">
            {opponents.map((p) => (
              <div key={p.id} className="flex shrink-0 flex-col items-center gap-1.5">
                <PlayerSeat player={p} active={p.id === currentPlayerId} />
                {renderSeatCards?.(p)}
              </div>
            ))}
          </div>

          {/* Central play surface */}
          <div className="flex flex-1 items-center justify-center px-3 py-2">
            <div className="w-full max-w-md">{center}</div>
          </div>
        </div>
      )}

      {/* ---- Local player (always bottom) ---- */}
      <div className="relative z-10 border-t border-border/50 bg-background/60 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-4xl flex-col items-center gap-2 px-3 py-3">
          {youHand && <div className="flex w-full justify-center">{youHand}</div>}
          <div className="flex w-full flex-wrap items-center justify-between gap-2">
            {you && (
              <PlayerSeat player={you} active={you.id === currentPlayerId} variant="wide" />
            )}
            {youActions && (
              <div className="flex flex-wrap items-center justify-end gap-2">{youActions}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
