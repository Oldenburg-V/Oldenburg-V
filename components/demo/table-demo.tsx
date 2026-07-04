"use client"

import { useEffect, useMemo, useReducer } from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import { Layers, RotateCcw, Sparkles, Hand as HandIcon, Users } from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  demoReducer,
  initState,
  deckCards,
  handCards,
  playCards,
  discardCards,
  currentPlayer,
  type DemoState,
} from "@/lib/demo-game"
import type { PlayerInfo } from "@/lib/game-types"
import { GameHud } from "@/components/game/game-hud"
import { GameTable } from "@/components/game/game-table"
import { PlayZone } from "@/components/game/play-zone"
import { DeckStack } from "@/components/game/deck-stack"
import { CardFan } from "@/components/game/card-fan"
import { PlayingCard } from "@/components/game/playing-card"
import { Button } from "@/components/ui/button"

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8]

export function TableDemo() {
  const [state, dispatch] = useReducer(demoReducer, undefined, () => initState(4, false))
  const isWide = useMediaQuery("(min-width: 768px)")

  const deck = deckCards(state)
  const trick = playCards(state)
  const discard = discardCards(state)
  const current = currentPlayer(state)
  const isYourTurn = current.id === "you"

  const dealt = useMemo(() => state.cards.some((c) => c.zone.type !== "deck"), [state.cards])
  const yourHand = handCards(state, "you")

  // Shuffle client-side after mount so SSR and hydration render an identical
  // ordered deck (avoids hydration mismatch from Math.random during render).
  useEffect(() => {
    dispatch({ type: "shuffle" })
  }, [])

  // Build PlayerInfo for the table framework, enriched with live stats.
  const players: PlayerInfo[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isYou: p.isYou,
    accent: p.accent,
    status:
      current.id === p.id ? "Playing…" : dealt ? "In the round" : "Ready",
    stats: [
      { label: "Hand", value: handCards(state, p.id).length, tone: "default" as const },
      { label: "Sips", value: state.sips[p.id] ?? 0, tone: "crimson" as const },
    ],
  }))

  // Opponents act automatically on their turn.
  useEffect(() => {
    if (!dealt || isYourTurn) return
    let cancelled = false
    const t1 = setTimeout(() => {
      if (!cancelled) dispatch({ type: "opponentPlay", playerId: current.id })
    }, 850)
    const t2 = setTimeout(() => {
      if (!cancelled) dispatch({ type: "nextTurn" })
    }, 1650)
    return () => {
      cancelled = true
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [state.turn, dealt, isYourTurn, current.id])

  function deal() {
    if (dealt) return
    const order: string[] = []
    for (let r = 0; r < 5; r++) for (const p of state.players) order.push(p.id)
    order.forEach((pid, i) =>
      setTimeout(() => dispatch({ type: "dealOne", playerId: pid }), i * 110),
    )
  }

  function playYourCard(cardId: string) {
    if (!isYourTurn) return
    dispatch({ type: "playCard", cardId })
    setTimeout(() => dispatch({ type: "nextTurn" }), 550)
  }

  const cardW = isWide ? 96 : 62
  const oppCardW = isWide ? 40 : 34

  return (
    <LayoutGroup>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        <GameHud
          gameName={`Sandbox Demo · Round ${state.round}`}
          info={
            <div className="rounded-full border border-border/60 bg-popover/70 px-4 py-1 text-sm">
              <span className="text-muted-foreground">Turn: </span>
              <span className="font-display font-semibold text-primary">{current.name}</span>
            </div>
          }
          actions={
            <div className="flex items-center gap-1.5">
              <label className="hidden items-center gap-1.5 rounded-lg border border-border/60 bg-popover/70 px-2 py-1 text-xs sm:flex">
                <Users className="size-3.5 text-primary" aria-hidden />
                <select
                  aria-label="Number of players"
                  value={state.players.length}
                  onChange={(e) =>
                    dispatch({ type: "reset", playerCount: Number(e.target.value) })
                  }
                  className="bg-transparent font-mono text-foreground outline-none"
                >
                  {PLAYER_OPTIONS.map((n) => (
                    <option key={n} value={n} className="bg-popover">
                      {n}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-border/60 bg-popover/70 px-2 py-1 text-xs">
                <input
                  type="checkbox"
                  checked={state.openOpponents}
                  onChange={(e) => dispatch({ type: "setOpen", open: e.target.checked })}
                  className="accent-[oklch(0.78_0.13_82)]"
                />
                <span className="hidden sm:inline">Open cards</span>
                <span className="sm:hidden">Open</span>
              </label>
              <Button
                size="sm"
                variant="outline"
                onClick={() => dispatch({ type: "reset" })}
                aria-label="Reset table"
              >
                <RotateCcw className="size-3.5" aria-hidden />
              </Button>
            </div>
          }
        />

        <div className="min-h-0 flex-1">
          <GameTable
            players={players}
            currentPlayerId={current.id}
            renderSeatCards={(p) =>
              p.isYou ? null : (
                <CardFan
                  cards={handCards(state, p.id)}
                  cardWidth={oppCardW}
                  maxAngle={14}
                  curve={6}
                  overlap={0.5}
                />
              )
            }
            center={
              <PlayZone label="Table" active={trick.length > 0}>
                <div className="flex w-full items-center justify-center gap-4 sm:gap-6">
                  <DeckStack
                    cards={deck}
                    cardWidth={cardW * 0.72}
                    onDraw={() => dispatch({ type: "draw", playerId: "you" })}
                    label="Draw"
                  />

                  {/* current trick */}
                  <div className="flex min-h-24 min-w-24 items-center justify-center">
                    {trick.length > 0 ? (
                      <CardFan
                        cards={trick}
                        cardWidth={cardW * 0.72}
                        maxAngle={18}
                        curve={8}
                        overlap={0.66}
                      />
                    ) : (
                      <span className="text-center text-xs text-muted-foreground">
                        {dealt ? "Play a card here" : "Deal to start"}
                      </span>
                    )}
                  </div>

                  {/* discard pile */}
                  {discard.length > 0 && (
                    <div
                      className="relative"
                      style={{ width: cardW * 0.72, height: cardW * 0.72 * 1.5 }}
                    >
                      {discard.slice(-4).map((c, i) => (
                        <div key={c.id} className="absolute" style={{ left: i * 2, top: i * 2 }}>
                          <PlayingCard card={c} width={cardW * 0.72} />
                        </div>
                      ))}
                      <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] text-muted-foreground">
                        Discard {discard.length}
                      </span>
                    </div>
                  )}
                </div>
              </PlayZone>
            }
            youHand={
              yourHand.length > 0 ? (
                <CardFan
                  cards={yourHand}
                  cardWidth={cardW}
                  maxAngle={isWide ? 26 : 18}
                  interactive={isYourTurn}
                  disabledIds={isYourTurn ? [] : yourHand.map((c) => c.id)}
                  onCardClick={(c) => playYourCard(c.id)}
                />
              ) : (
                <div className="flex h-24 items-center text-sm text-muted-foreground">
                  {dealt ? "Your hand is empty — draw a card." : "Deal to receive your hand."}
                </div>
              )
            }
            youActions={
              <>
                {!dealt ? (
                  <Button onClick={deal}>
                    <Sparkles className="size-4" aria-hidden />
                    Deal
                  </Button>
                ) : (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch({ type: "draw", playerId: "you" })}
                    >
                      <HandIcon className="size-3.5" aria-hidden />
                      Draw
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => dispatch({ type: "collect" })}
                      disabled={trick.length === 0}
                    >
                      <Layers className="size-3.5" aria-hidden />
                      Collect
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => dispatch({ type: "nextTurn" })}
                      disabled={!isYourTurn}
                    >
                      End turn
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => dispatch({ type: "reshuffle" })}>
                      <RotateCcw className="size-3.5" aria-hidden />
                      Reshuffle
                    </Button>
                  </>
                )}
              </>
            }
          />
        </div>

        <AnimatePresence>
          {state.message && (
            <motion.div
              key={state.message}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="pointer-events-none absolute bottom-2 left-1/2 z-20 -translate-x-1/2 rounded-full border border-border/60 bg-popover/90 px-4 py-1 text-xs text-muted-foreground backdrop-blur"
            >
              {state.message}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}
