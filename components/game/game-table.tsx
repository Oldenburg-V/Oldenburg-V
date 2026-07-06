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
  onSeatClick?: (playerId: string) => void
  className?: string
}

/** Distribute opponents along an arc across the top and side margins. */
function opponentPositions(m: number): { x: number; y: number }[] {
  if (m <= 0) return []
  if (m === 1) return [{ x: 50, y: 18 }]
  if (m === 2) return [{ x: 20, y: 22 }, { x: 80, y: 22 }]
  if (m === 3) return [{ x: 12, y: 35 }, { x: 50, y: 18 }, { x: 88, y: 35 }]
  if (m === 4) return [{ x: 12, y: 38 }, { x: 30, y: 20 }, { x: 70, y: 20 }, { x: 88, y: 38 }]
  if (m === 5) return [{ x: 10, y: 48 }, { x: 22, y: 24 }, { x: 50, y: 18 }, { x: 78, y: 24 }, { x: 90, y: 48 }]
  if (m === 6) return [{ x: 10, y: 52 }, { x: 10, y: 28 }, { x: 34, y: 18 }, { x: 66, y: 18 }, { x: 90, y: 28 }, { x: 90, y: 52 }]
  
  // For 8 players (7 opponents)
  return [
    { x: 8, y: 64 },   // i=0: leftmost opponent (Vex) - pushed low
    { x: 8, y: 34 },   // i=1: mid-left opponent (Auron) - higher up
    { x: 28, y: 18 },  // i=2: upper-left opponent (Merlin)
    { x: 50, y: 18 },  // i=3: top center opponent (Cogsworth)
    { x: 72, y: 18 },  // i=4: upper-right opponent (Bruno)
    { x: 92, y: 34 },  // i=5: mid-right opponent (Kára) - higher up
    { x: 92, y: 64 },  // i=6: rightmost opponent (Dorn) - pushed low
  ]
}

export function GameTable({
  players,
  currentPlayerId,
  renderSeatCards,
  center,
  youHand,
  youActions,
  onSeatClick,
  className,
}: GameTableProps) {
  const isWide = useMediaQuery("(min-width: 768px)")
  const you = players.find((p) => p.isYou) ?? players[0]
  const opponents = players.filter((p) => p !== you)
  const positions = opponentPositions(opponents.length)

  return (
    <div className={cn("relative flex h-full min-h-0 flex-col table-vignette overflow-hidden", className)}>
      {/* ---- Table Surface / Opponent & Center Grid ---- */}
      <div className="relative flex-1 overflow-hidden">
        {isWide ? (
          <>
            {/* Opponent seats positioned around the arc */}
            {opponents.map((p, i) => (
              <div
                key={p.id}
                className="absolute flex w-max -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-2 z-20"
                style={{ left: `${positions[i].x}%`, top: `${positions[i].y}%` }}
              >
                <PlayerSeat
                  player={p}
                  active={p.id === currentPlayerId}
                  onClick={onSeatClick ? () => onSeatClick(p.id) : undefined}
                />
                {renderSeatCards?.(p)}
              </div>
            ))}

            {/* Central play surface */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 py-2 pt-16">
              <div className="pointer-events-auto w-full max-w-xl">{center}</div>
            </div>

            {/* Desktop: Corner controls & Shifted Bottom Hand */}
            {youHand && (
              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-12 z-10 w-full max-w-xl flex justify-center pointer-events-auto">
                {youHand}
              </div>
            )}

            {you && (
              <div className="absolute bottom-4 left-6 z-20">
                <PlayerSeat
                  player={you}
                  active={you.id === currentPlayerId}
                  variant="wide"
                  onClick={onSeatClick ? () => onSeatClick(you.id) : undefined}
                />
              </div>
            )}

            {youActions && (
              <div className="absolute bottom-4 right-6 z-20 flex flex-wrap items-center justify-end gap-2">
                {youActions}
              </div>
            )}
          </>
        ) : (
          // Mobile Layout: Keep scrollable opponents at top, centered table, and clean floating bottom controls
          <div className="flex h-full flex-col justify-between">
            {/* Opponents top row */}
            <div className="flex gap-2 overflow-x-auto px-3 py-3 shrink-0">
              {opponents.map((p) => (
                <div key={p.id} className="flex shrink-0 flex-col items-center gap-1.5">
                  <PlayerSeat
                    player={p}
                    active={p.id === currentPlayerId}
                    onClick={onSeatClick ? () => onSeatClick(p.id) : undefined}
                  />
                  {renderSeatCards?.(p)}
                </div>
              ))}
            </div>

            {/* Central play surface */}
            <div className="flex-1 flex items-center justify-center px-3 py-2 min-h-0">
              <div className="w-full max-w-md">{center}</div>
            </div>

            {/* Mobile Bottom controls (Floating, borderless) */}
            <div className="w-full px-3 pb-3 flex flex-col gap-2 shrink-0">
              {youHand && <div className="flex w-full justify-center translate-y-6">{youHand}</div>}
              <div className="flex w-full items-center justify-between gap-2 pt-2">
                {you && (
                  <PlayerSeat
                    player={you}
                    active={you.id === currentPlayerId}
                    onClick={onSeatClick ? () => onSeatClick(you.id) : undefined}
                  />
                )}
                {youActions && (
                  <div className="flex flex-wrap items-center justify-end gap-1.5">{youActions}</div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
