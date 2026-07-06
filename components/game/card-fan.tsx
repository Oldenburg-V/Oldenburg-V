"use client"

import { motion } from "motion/react"
import { type CardData, type CardBack } from "@/lib/deck"
import { PlayingCard } from "./playing-card"
import { cn } from "@/lib/utils"

export interface CardFanProps {
  cards: CardData[]
  cardWidth?: number
  back?: CardBack
  /** Total arc span in degrees across the whole hand. */
  maxAngle?: number
  /** How much the arc dips at the edges, in px. */
  curve?: number
  /** Fraction of a card width kept visible when overlapping (0-1). */
  overlap?: number
  interactive?: boolean
  selectedIds?: string[]
  highlightedIds?: string[]
  disabledIds?: string[]
  onCardClick?: (card: CardData) => void
  className?: string
  // Drag and drop properties
  drag?: boolean
  draggedCardId?: string | null
  hoveredZoneId?: string | null
  onDragStart?: (cardId: string) => void
  onDrag?: (event: any, info: any, cardId: string) => void
  onDragEnd?: (cardId: string) => void
}

export function CardFan({
  cards,
  cardWidth = 96,
  back = "ol5",
  maxAngle = 26,
  curve = 18,
  overlap = 0.62,
  interactive = false,
  selectedIds = [],
  highlightedIds = [],
  disabledIds = [],
  onCardClick,
  className,
  drag = false,
  draggedCardId = null,
  hoveredZoneId = null,
  onDragStart,
  onDrag,
  onDragEnd,
}: CardFanProps) {
  const n = cards.length
  const mid = (n - 1) / 2
  const anglePer = n > 1 ? maxAngle / (n - 1) : 0
  // Keep a fraction of each card visible so large hands stay on screen.
  const step = Math.round(cardWidth * overlap)

  return (
    <div className={cn("flex items-end justify-center", className)}>
      {cards.map((card, i) => {
        const dist = i - mid
        const rotate = dist * anglePer
        // parabolic dip: center sits highest, edges fall away
        const offsetY = mid === 0 ? 0 : (dist / (mid || 1)) ** 2 * curve
        const isCardDisabled = disabledIds.includes(card.id)
        return (
          <motion.div
            key={card.id}
            layout
            style={{ marginLeft: i === 0 ? 0 : -(cardWidth - step), zIndex: i }}
          >
            <PlayingCard
              card={card}
              width={cardWidth}
              back={back}
              rotate={rotate}
              offsetY={offsetY}
              interactive={interactive}
              disabled={isCardDisabled}
              selected={selectedIds.includes(card.id)}
              highlighted={highlightedIds.includes(card.id)}
              onClick={onCardClick ? () => onCardClick(card) : undefined}
              drag={drag && !isCardDisabled}
              dragSnapToOrigin
              dragHovered={draggedCardId === card.id && hoveredZoneId !== null}
              onDragStart={(e, info) => onDragStart?.(card.id)}
              onDrag={(e, info) => onDrag?.(e, info, card.id)}
              onDragEnd={() => onDragEnd?.(card.id)}
            />
          </motion.div>
        )
      })}
    </div>
  )
}
