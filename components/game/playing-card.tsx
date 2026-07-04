"use client"

import { motion } from "motion/react"
import { type CardData, type CardBack, faceSrc, backSrc } from "@/lib/deck"
import { cn } from "@/lib/utils"

export interface PlayingCardProps {
  card: CardData
  /** Card width in pixels. Height is derived from the 2:3 art ratio. */
  width?: number
  back?: CardBack
  /** Enable Framer Motion shared-layout animation between containers. */
  animateLayout?: boolean
  selected?: boolean
  highlighted?: boolean
  disabled?: boolean
  interactive?: boolean
  /** Fan rotation in degrees, composed with layout animation. */
  rotate?: number
  /** Vertical lift used for arc fanning. */
  offsetY?: number
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export function PlayingCard({
  card,
  width = 96,
  back = "ol5",
  animateLayout = true,
  selected = false,
  highlighted = false,
  disabled = false,
  interactive = false,
  rotate = 0,
  offsetY = 0,
  onClick,
  className,
  style,
}: PlayingCardProps) {
  const height = Math.round(width * 1.5)

  return (
    <motion.div
      layout={animateLayout}
      layoutId={animateLayout ? card.id : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.6 }}
      onClick={disabled ? undefined : onClick}
      animate={{ rotate, y: offsetY }}
      whileHover={interactive && !disabled ? { y: offsetY - 16, scale: 1.04, zIndex: 50 } : undefined}
      whileTap={interactive && !disabled ? { scale: 0.98 } : undefined}
      className={cn(
        "relative shrink-0 select-none rounded-[7%]",
        interactive && !disabled && "cursor-pointer",
        disabled && "opacity-60",
        className,
      )}
      style={{ width, height, perspective: 1200, ...style }}
      role={onClick ? "button" : undefined}
      aria-label={`${card.rank} of ${card.suit}${card.faceUp ? "" : " (face down)"}`}
    >
      {/* selection / highlight ring */}
      {(selected || highlighted) && (
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute -inset-1 rounded-[10%] ring-2",
            selected ? "ring-primary" : "ring-gem",
          )}
          style={{
            boxShadow: selected
              ? "0 0 18px oklch(0.78 0.13 82 / 0.55)"
              : "0 0 18px oklch(0.55 0.16 300 / 0.5)",
          }}
        />
      )}

      {/* flip container */}
      <motion.div
        className="relative h-full w-full rounded-[7%]"
        style={{ transformStyle: "preserve-3d" }}
        animate={{ rotateY: card.faceUp ? 0 : 180 }}
        transition={{ type: "spring", stiffness: 260, damping: 26 }}
      >
        {/* Face */}
        <div
          className="card-shadow absolute inset-0 overflow-hidden rounded-[7%] bg-[oklch(0.96_0.02_85)] gold-ring"
          style={{ backfaceVisibility: "hidden" }}
        >
          <img
            src={faceSrc(card) || "/placeholder.svg"}
            alt=""
            draggable={false}
            className="h-full w-full object-contain"
          />
        </div>

        {/* Back */}
        <div
          className="card-shadow absolute inset-0 overflow-hidden rounded-[7%] gold-ring"
          style={{
            backfaceVisibility: "hidden",
            transform: "rotateY(180deg)",
          }}
        >
          <img
            src={backSrc(back) || "/placeholder.svg"}
            alt=""
            draggable={false}
            className="h-full w-full object-cover"
          />
        </div>
      </motion.div>
    </motion.div>
  )
}
