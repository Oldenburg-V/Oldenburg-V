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
  // Drag and drop properties
  drag?: boolean | "x" | "y"
  dragSnapToOrigin?: boolean
  dragHovered?: boolean
  onDragStart?: (event: any, info: any) => void
  onDrag?: (event: any, info: any) => void
  onDragEnd?: (event: any, info: any) => void
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
  drag = false,
  dragSnapToOrigin = false,
  dragHovered = false,
  onDragStart,
  onDrag,
  onDragEnd,
}: PlayingCardProps) {
  const height = Math.round(width * 1.5)

  return (
    <motion.div
      id={`card-${card.id}`}
      layout={animateLayout}
      layoutId={animateLayout ? card.id : undefined}
      transition={{ type: "spring", stiffness: 380, damping: 34, mass: 0.6 }}
      onTap={disabled ? undefined : () => onClick?.()}
      onClick={(e) => {
        e.stopPropagation()
      }}
      animate={dragHovered && !disabled ? {
        scale: 1.12,
        boxShadow: "0 0 25px oklch(0.78 0.13 82 / 0.85), 0 12px 30px oklch(0 0 0 / 0.5)",
        rotate,
        y: offsetY
      } : {
        rotate,
        y: offsetY
      }}
      whileHover={interactive && !disabled ? { y: offsetY - 28, scale: 1.1, zIndex: 90 } : undefined}
      whileTap={interactive && !disabled ? { scale: 0.98 } : undefined}
      whileDrag={{
        scale: 1.08,
        zIndex: 100,
        boxShadow: "0 20px 40px oklch(0 0 0 / 0.6)",
      }}
      drag={drag}
      dragSnapToOrigin={dragSnapToOrigin}
      onDragStart={onDragStart}
      onDrag={onDrag}
      onDragEnd={onDragEnd}
      dragElastic={0.1}
      dragTransition={{ bounceStiffness: 600, bounceDamping: 30 }}
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
