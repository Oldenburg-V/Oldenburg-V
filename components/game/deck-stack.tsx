"use client"

import { motion } from "motion/react"
import { type CardData, type CardBack } from "@/lib/deck"
import { PlayingCard } from "./playing-card"
import { cn } from "@/lib/utils"

export interface DeckStackProps {
  cards: CardData[]
  cardWidth?: number
  back?: CardBack
  label?: string
  interactive?: boolean
  onDraw?: () => void
  className?: string
}

/**
 * A draw pile. Decorative offset layers imply depth while the real top card
 * is a live PlayingCard so it animates out via shared-layout transitions.
 */
export function DeckStack({
  cards,
  cardWidth = 96,
  back = "ol5",
  label = "Draw",
  interactive = true,
  onDraw,
  className,
}: DeckStackProps) {
  const height = Math.round(cardWidth * 1.5)
  const count = cards.length
  const top = count > 0 ? cards[count - 1] : null
  const layers = Math.min(Math.max(count - 1, 0), 5)

  return (
    <div className={cn("flex flex-col items-center gap-2", className)}>
      <div
        className="relative"
        style={{ width: cardWidth + layers * 2, height: height + layers * 2 }}
      >
        {/* decorative depth layers */}
        {Array.from({ length: layers }).map((_, i) => (
          <div
            key={i}
            aria-hidden
            className="card-shadow absolute overflow-hidden rounded-[7%] gold-ring"
            style={{
              width: cardWidth,
              height,
              left: i * 2,
              top: i * 2,
            }}
          >
            <img
              src={`/cards/backs/${back}.jpg`}
              alt=""
              draggable={false}
              className="h-full w-full object-cover"
            />
          </div>
        ))}

        {/* live top card */}
        {top ? (
          <div
            key={top.id}
            className="absolute"
            style={{ left: layers * 2, top: layers * 2 }}
          >
            <PlayingCard
              card={top}
              width={cardWidth}
              back={back}
              interactive={interactive && !!onDraw}
              onClick={onDraw}
            />
          </div>
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center rounded-[7%] border border-dashed border-border/60 text-muted-foreground"
            style={{ width: cardWidth, height }}
          >
            <span className="text-xs">Empty</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 text-xs">
        <span className="font-display font-semibold tracking-wide text-primary">
          {label}
        </span>
        <motion.span
          key={count}
          initial={{ scale: 1.3, color: "oklch(0.78 0.13 82)" }}
          animate={{ scale: 1, color: "oklch(0.68 0.02 80)" }}
          className="rounded-full bg-secondary px-2 py-0.5 font-mono tabular-nums"
        >
          {count}
        </motion.span>
      </div>
    </div>
  )
}
