"use client"

import {
  useEffect,
  useMemo,
  useReducer,
  useState,
  useRef,
  useCallback,
} from "react"
import { AnimatePresence, LayoutGroup, motion } from "motion/react"
import {
  Layers,
  RotateCcw,
  Sparkles,
  Hand as HandIcon,
  Users,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
} from "lucide-react"
import { useMediaQuery } from "@/hooks/use-media-query"
import {
  demoReducer,
  initState,
  deckCards,
  handCards,
  play1Cards,
  play2Cards,
  discardCards,
  potCards,
  currentPlayer,
} from "@/lib/demo-game"
import { buildDeck, shuffle, RANK_VALUE } from "@/lib/deck"
import type { CardState } from "@/lib/game-types"
import type { PlayerInfo } from "@/lib/game-types"
import { GameHud } from "@/components/game/game-hud"
import { GameTable } from "@/components/game/game-table"
import { PlayZone } from "@/components/game/play-zone"
import { DeckStack } from "@/components/game/deck-stack"
import { CardFan } from "@/components/game/card-fan"
import { PlayingCard } from "@/components/game/playing-card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { useTranslation } from "@/lib/i18n"

// ─── helpers ──────────────────────────────────────────────────────────────────
function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.match(new RegExp("(?:^|; )" + name + "=([^;]*)"))
  return match ? decodeURIComponent(match[1]) : null
}

const PLAYER_OPTIONS = [2, 3, 4, 5, 6, 7, 8]

interface CardFlyAnimation {
  id: string
  card: CardState
  fromX: number
  fromY: number
  toX: number
  toY: number
}

// ─── component ────────────────────────────────────────────────────────────────
export function TableDemo() {
  const { locale, t } = useTranslation()
  const [state, dispatch] = useReducer(demoReducer, undefined, () => initState(4, false))
  const isWide = useMediaQuery("(min-width: 768px)")

  // ── game settings from lobby ──────────────────────────────────────────────
  const [activeSettings, setActiveSettings] = useState<{
    selectedGame: string
    busRoundLength?: string
    busPunishmentCards?: number
    busPunishmentPlayers?: number
  } | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const cookie = getCookie("game_settings")
      if (cookie) {
        try { setActiveSettings(JSON.parse(cookie)) } catch {}
      }
    }
  }, [])

  // ── audio / fullscreen ────────────────────────────────────────────────────
  const [muted, setMuted] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener("fullscreenchange", handler)
    return () => document.removeEventListener("fullscreenchange", handler)
  }, [])

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.()
    } else {
      document.exitFullscreen?.()
    }
  }

  // ── canvas liquid stream ──────────────────────────────────────────────────
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const particlesRef = useRef<any[]>([])
  const splashesRef = useRef<any[]>([])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    function resize() {
      canvas!.width = window.innerWidth
      canvas!.height = window.innerHeight
    }
    resize()
    window.addEventListener("resize", resize)

    let animId: number
    function render() {
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height)

      particlesRef.current = particlesRef.current.filter((p) => {
        p.t += p.speed
        if (p.t >= 1) {
          // Arrival — trigger splash
          splashesRef.current.push(
            ...Array.from({ length: 8 }, () => ({
              x: p.p2.x,
              y: p.p2.y,
              vx: (Math.random() - 0.5) * 4,
              vy: (Math.random() - 0.5) * 4,
              alpha: 1,
              size: 3 + Math.random() * 3,
              color: p.color,
              targetPlayerId: p.targetPlayerId,
            })),
          )
          if (p.onArrive) p.onArrive()
          return false
        }
        const t = p.t
        const mt = 1 - t
        const x = mt * mt * p.p0.x + 2 * mt * t * p.p1.x + t * t * p.p2.x
        const y = mt * mt * p.p0.y + 2 * mt * t * p.p1.y + t * t * p.p2.y

        ctx!.save()
        ctx!.globalAlpha = p.alpha
        ctx!.fillStyle = p.color
        ctx!.beginPath()
        ctx!.arc(x, y, p.size, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
        return true
      })

      splashesRef.current = splashesRef.current.filter((s) => {
        s.x += s.vx
        s.y += s.vy
        s.alpha -= 0.04
        if (s.alpha <= 0) return false

        ctx!.save()
        ctx!.globalAlpha = s.alpha
        ctx!.fillStyle = s.color
        ctx!.beginPath()
        ctx!.arc(s.x, s.y, s.size, 0, Math.PI * 2)
        ctx!.fill()
        ctx!.restore()
        return true
      })

      animId = requestAnimationFrame(render)
    }

    render()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", resize)
    }
  }, [])

  function triggerLiquidStream(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    targetPlayerId: string,
    onArrive?: () => void,
  ) {
    const centerX = window.innerWidth / 2
    const centerY = window.innerHeight / 2
    const midX = (fromX + toX) / 2
    const midY = (fromY + toY) / 2
    const vecX = centerX - midX
    const vecY = centerY - midY
    const p1 = { x: midX + vecX * 0.45, y: midY + vecY * 0.45 }
    const p0 = { x: fromX, y: fromY }
    const p2 = { x: toX, y: toY }

    const count = 14
    for (let i = 0; i < count; i++) {
      const delay = i * 0.012
      particlesRef.current.push({
        t: -delay,
        speed: 0.022 + Math.random() * 0.008,
        size: 5 + Math.random() * 4,
        p0, p1, p2,
        color: "rgb(245, 158, 11)", // Amber-500 standard color
        alpha: 1,
        targetPlayerId,
        onArrive: i === count - 1 ? () => {
          if (onArrive) onArrive()
          playSipSound()
        } : undefined,
      })
    }
  }

  function triggerMultipleSips(
    fromX: number,
    fromY: number,
    toX: number,
    toY: number,
    targetPlayerId: string,
    count: number,
  ) {
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        triggerLiquidStream(fromX, fromY, toX, toY, targetPlayerId, () => {
          dispatch({ type: "addSips", playerId: targetPlayerId, amount: 1 })
        })
      }, i * 350)
    }
  }

  // ── card sound ────────────────────────────────────────────────────────────
  const playCardSound = useCallback(() => {
    if (muted) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const buf = ctx.createBuffer(1, ctx.sampleRate * 0.18, ctx.sampleRate)
      const data = buf.getChannelData(0)
      for (let i = 0; i < data.length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03))
      }
      const src = ctx.createBufferSource()
      src.buffer = buf
      const gain = ctx.createGain()
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      src.connect(gain)
      gain.connect(ctx.destination)
      src.start()
    } catch {}
  }, [muted])

  // ── gulp/sip sound ────────────────────────────────────────────────────────
  const playSipSound = useCallback(() => {
    if (muted) return
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = "sine"
      osc.frequency.setValueAtTime(140, ctx.currentTime)
      osc.frequency.exponentialRampToValueAtTime(70, ctx.currentTime + 0.15)
      gain.gain.setValueAtTime(0.18, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + 0.2)
    } catch {}
  }, [muted])

  // ── reshuffle animation ───────────────────────────────────────────────────
  const [reshufflePhase, setReshufflePhase] = useState<"idle" | "gathering" | "shuffling" | "flying" | "returning">("idle")

  function triggerReshuffle() {
    if (reshufflePhase !== "idle") return
    setReshufflePhase("gathering")
    setTimeout(() => {
      dispatch({ type: "gatherToDeck" })
      setReshufflePhase("shuffling")
    }, 600)
    setTimeout(() => setReshufflePhase("flying"), 900)
    setTimeout(() => {
      dispatch({ type: "reshuffle" })
      setReshufflePhase("returning")
    }, 1400)
    setTimeout(() => setReshufflePhase("idle"), 2000)
  }

  // ── image preload ─────────────────────────────────────────────────────────
  const [imagesLoaded, setImagesLoaded] = useState(false)
  const [loadedCount, setLoadedCount] = useState(0)

  useEffect(() => {
    const suits = ["herz", "karo", "kreuz", "pik"]
    const ranks = ["2","3","4","5","6","7","8","9","10","bube","dame","koenig","ass"]
    const urls = [
      "/cards/backs/ol5.jpg",
      "/cards/backs/hollan.jpg",
      ...suits.flatMap((s) => ranks.map((r) => `/cards/faces/${s}_${r}.svg`)),
    ]
    let loaded = 0
    urls.forEach((url) => {
      const img = new Image()
      img.src = url
      const done = () => {
        loaded++
        setLoadedCount(loaded)
        if (loaded >= urls.length) setImagesLoaded(true)
      }
      img.onload = done
      img.onerror = done
    })
  }, [])

  const backSrc = (name: string) => `/cards/backs/${name}.jpg`

  // ── sandbox state helpers ─────────────────────────────────────────────────
  const deck = deckCards(state)
  const trick1 = play1Cards(state)
  const trick2 = play2Cards(state)
  const discard = discardCards(state)
  const pot = potCards(state)
  const current = currentPlayer(state)
  const isYourTurn = current.id === "you"

  const [draggedCardId, setDraggedCardId] = useState<string | null>(null)
  const [hoveredZoneId, setHoveredZoneId] = useState<string | null>(null)
  const [selectedCardIdForTarget, setSelectedCardIdForTarget] = useState<string | null>(null)
  const draggingCardIdRef = useRef<string | null>(null)
  const wasJustDraggingRef = useRef<boolean>(false)
  const [sipsToDistribute, setSipsToDistribute] = useState(0)

  const dealt = useMemo(() => state.cards.some((c) => c.zone.type !== "deck"), [state.cards])
  const yourHand = activeSettings?.selectedGame === "busfahren"
    ? [] // will be overridden below by busPlayersHand
    : handCards(state, "you")

  // overlap calculations
  const trick1Overlap = useMemo(() => {
    if (trick1.length <= 1) return 0.5
    return Math.max(0.05, Math.min(0.6, 1 - trick1.length * 0.06))
  }, [trick1.length])
  const trick2Overlap = useMemo(() => {
    if (trick2.length <= 1) return 0.5
    return Math.max(0.05, Math.min(0.6, 1 - trick2.length * 0.06))
  }, [trick2.length])

  // ── Shuffle on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    dispatch({ type: "shuffle" })
  }, [])

  // ── PlayerInfo for table layout ───────────────────────────────────────────
  const players: PlayerInfo[] = state.players.map((p) => ({
    id: p.id,
    name: p.name,
    isYou: p.isYou,
    accent: p.accent,
    status: current.id === p.id ? "Playing…" : dealt ? "In the round" : "Ready",
    stats: [
      { label: "Hand", value: handCards(state, p.id).length, tone: "default" as const },
      { label: "Sips", value: state.sips[p.id] ?? 0, tone: "crimson" as const },
    ],
  }))

  // ── Opponent autoplay (sandbox) ───────────────────────────────────────────
  useEffect(() => {
    if (activeSettings?.selectedGame === "busfahren") return
    if (!dealt || isYourTurn) return
    let cancelled = false

    const t1 = setTimeout(() => {
      if (cancelled) return
      const hand = handCards(state, current.id)
      if (hand.length > 0) {
        const pick = hand[Math.floor(Math.random() * hand.length)]
        const isRed = pick.suit === "herz" || pick.suit === "karo"
        const count1 = state.cards.filter((c) => c.zone.type === "play1").length
        const count2 = state.cards.filter((c) => c.zone.type === "play2").length
        const targetZone = count1 <= count2 ? "play1" : "play2"
        const tableZone = document.querySelector(`[data-dropzone-id="${targetZone}"]`)
        const oppSeat = document.getElementById(`seat-${current.id}`)

        if (isRed) {
          const candidates = state.players.filter((p) => p.id !== current.id)
          const target = candidates[Math.floor(Math.random() * candidates.length)]
          const toSeat = document.getElementById(target.id === "you" ? "seat-you" : `seat-${target.id}`)
          if (oppSeat && toSeat) {
            const fromRect = oppSeat.getBoundingClientRect()
            const toRect = toSeat.getBoundingClientRect()
            triggerMultipleSips(
              fromRect.left + fromRect.width / 2, fromRect.top + fromRect.height / 2,
              toRect.left + toRect.width / 2, toRect.top + toRect.height / 2,
              target.id, 3,
            )
          }
        } else {
          if (tableZone && oppSeat) {
            const fromRect = tableZone.getBoundingClientRect()
            const toRect = oppSeat.getBoundingClientRect()
            triggerMultipleSips(
              fromRect.left + fromRect.width / 2, fromRect.top + fromRect.height / 2,
              toRect.left + toRect.width / 2, toRect.top + toRect.height / 2,
              current.id, 2,
            )
          }
        }
      }
      dispatch({ type: "opponentPlay", playerId: current.id })
    }, 850)

    const t2 = setTimeout(() => {
      if (!cancelled) dispatch({ type: "nextTurn" })
    }, 3200)

    return () => {
      cancelled = true
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [state.turn, dealt, isYourTurn, current.id, activeSettings?.selectedGame])

  // ── Drop zone detection ───────────────────────────────────────────────────
  function getDropzoneId(x: number, y: number, _cardId?: string): string | null {
    const elements = document.elementsFromPoint(x, y)
    for (const el of elements) {
      const zoneId = (el as HTMLElement).dataset?.dropzoneId
      if (zoneId) return zoneId
    }
    return null
  }

  // ── Sandbox card play ─────────────────────────────────────────────────────
  function giveSip(targetPlayerId: string) {
    if (sipsToDistribute <= 0) return
    const nextSips = sipsToDistribute - 1
    setSipsToDistribute(nextSips)
    const toSeat = document.getElementById(targetPlayerId === "you" ? "seat-you" : `seat-${targetPlayerId}`)
    if (toSeat) {
      const toRect = toSeat.getBoundingClientRect()
      triggerLiquidStream(
        window.innerWidth / 2, window.innerHeight - 80,
        toRect.left + toRect.width / 2, toRect.top + toRect.height / 2,
        targetPlayerId,
        () => dispatch({ type: "addSips", playerId: targetPlayerId, amount: 1 }),
      )
    } else {
      dispatch({ type: "addSips", playerId: targetPlayerId, amount: 1 })
    }
    if (nextSips === 0) {
      setTimeout(() => dispatch({ type: "nextTurn" }), 1400)
    }
  }

  function deal() {
    if (dealt) return
    const order: string[] = []
    for (let r = 0; r < 5; r++) for (const p of state.players) order.push(p.id)
    order.forEach((pid, i) =>
      setTimeout(() => dispatch({ type: "dealOne", playerId: pid }), i * 110),
    )
  }

  function playYourCard(cardId: string, targetZone: "play1" | "play2" = "play1") {
    if (!isYourTurn) return
    const card = state.cards.find((c) => c.id === cardId)
    dispatch({ type: "playCard", cardId, targetZone })
    if (card) {
      const isRed = card.suit === "herz" || card.suit === "karo"
      if (isRed) {
        setSipsToDistribute(3)
        return
      } else {
        const tableZone = document.querySelector(`[data-dropzone-id="${targetZone}"]`)
        const toSeat = document.getElementById("seat-you")
        if (tableZone && toSeat) {
          const fromRect = tableZone.getBoundingClientRect()
          const toRect = toSeat.getBoundingClientRect()
          triggerMultipleSips(
            fromRect.left + fromRect.width / 2, fromRect.top + fromRect.height / 2,
            toRect.left + toRect.width / 2, toRect.top + toRect.height / 2,
            "you", 2,
          )
        }
      }
    }
    setTimeout(() => dispatch({ type: "nextTurn" }), 1400)
  }

  function handleCardClick(card: any) {
    // Busfahren pyramid phase — clicking a matching card discards it
    if (activeSettings?.selectedGame === "busfahren") {
      if (busPhase === "pyramid" && busPyramidFlipIndex !== -1) {
        const flippedCard = busPyramidCards[busPyramidFlipIndex]
        if (flippedCard && card.rank === flippedCard.rank) {
          discardMatchingCard()
        }
      }
      return
    }

    if (wasJustDraggingRef.current) {
      wasJustDraggingRef.current = false
      return
    }
    if (!isYourTurn) return
    const viableTargets = ["play1", "play2"]
    if (viableTargets.length === 1) {
      playYourCard(card.id, viableTargets[0] as "play1" | "play2")
    } else {
      if (selectedCardIdForTarget === card.id) {
        setSelectedCardIdForTarget(null)
      } else {
        setSelectedCardIdForTarget(card.id)
      }
    }
  }

  function handleSelectTarget(zoneId: "play1" | "play2" | "discard" | "pot") {
    if (!selectedCardIdForTarget) return
    const cardId = selectedCardIdForTarget
    if (zoneId === "play1" || zoneId === "play2") {
      playYourCard(cardId, zoneId)
    } else if (zoneId === "discard") {
      dispatch({ type: "discardCard", cardId })
    } else if (zoneId === "pot") {
      dispatch({ type: "betCard", cardId })
    }
    setSelectedCardIdForTarget(null)
  }

  function handleDragStart(cardId: string) {
    draggingCardIdRef.current = cardId
    setDraggedCardId(cardId)
    setSelectedCardIdForTarget(null)
  }

  function handleDrag(event: any, info: any, cardId: string) {
    if (draggingCardIdRef.current !== cardId) return
    const zoneId = getDropzoneId(info.point.x, info.point.y, cardId)
    if (zoneId === "play1" || zoneId === "play2" || zoneId === "discard" || zoneId === "pot") {
      setHoveredZoneId(zoneId)
    } else {
      setHoveredZoneId(null)
    }
  }

  function handleDragEnd(cardId: string) {
    draggingCardIdRef.current = null
    const targetZone = hoveredZoneId
    setDraggedCardId(null)
    setHoveredZoneId(null)
    wasJustDraggingRef.current = true

    if (targetZone === "play1" || targetZone === "play2") {
      playYourCard(cardId, targetZone)
    } else if (targetZone === "discard") {
      dispatch({ type: "discardCard", cardId })
    } else if (targetZone === "pot") {
      dispatch({ type: "betCard", cardId })
    }
  }

  const cardW = isWide ? 96 : 62
  const oppCardW = isWide ? 40 : 34

  // ═══════════════════════════════════════════════════════════════════════════
  //  BUSFAHREN GAME ENGINE
  // ═══════════════════════════════════════════════════════════════════════════

  const [busDeck, setBusDeck] = useState<CardState[]>([])
  const [busPlayersHand, setBusPlayersHand] = useState<Record<string, CardState[]>>({})
  const [busPhase, setBusPhase] = useState<"dealing" | "pyramid" | "busride" | "ended">("dealing")
  const [busDealtCount, setBusDealtCount] = useState(0)
  const [busTurn, setBusTurn] = useState(0)
  const [busPredictionStep, setBusPredictionStep] = useState<Record<string, number>>({})
  const [busPredictionStatus, setBusPredictionStatus] = useState<{
    text: string; isCorrect: boolean | null; active: boolean
  }>({ text: "", isCorrect: null, active: false })
  // Sip distribution gate: { distributorId, sipsLeft } — next turn blocked until zero
  const [busSipDist, setBusSipDist] = useState<{ distributorId: string; sipsLeft: number } | null>(null)
  const [busPredictionInProgress, setBusPredictionInProgress] = useState(false)
  const [flyingCards, setFlyingCards] = useState<CardFlyAnimation[]>([])
  const [pyramidDiscards, setPyramidDiscards] = useState<Record<number, CardState[]>>({})
  const [busPyramidCards, setBusPyramidCards] = useState<CardState[]>([])
  const [busPyramidFlipped, setBusPyramidFlipped] = useState<boolean[]>(Array(10).fill(false))
  const [busPyramidFlipIndex, setBusPyramidFlipIndex] = useState(-1)
  const [busDriverId, setBusDriverId] = useState("")
  const [busRideCards, setBusRideCards] = useState<CardState[]>([])
  const [busRideIndex, setBusRideIndex] = useState(0)
  const [busRideMessage, setBusRideMessage] = useState("")

  const busIsActive = activeSettings?.selectedGame === "busfahren"
  const busYourHand = busIsActive ? (busPlayersHand["you"] || []) : []

  const initBusfahrenGame = useCallback(() => {
    const freshDeck = buildDeck(1, false).map((c, idx) => ({
      ...c,
      id: `bus-${c.suit}-${c.rank}-${idx}`,
      zone: { type: "deck" as const },
      faceUp: false,
    }))
    const shuffled = shuffle(freshDeck)
    const pyramid: CardState[] = []
    for (let i = 0; i < 10; i++) {
      const popped = shuffled.pop()
      if (popped) pyramid.push(popped)
    }
    const initialHands: Record<string, CardState[]> = {}
    state.players.forEach((p) => { initialHands[p.id] = [] })
    setBusPyramidCards(pyramid)
    setBusPyramidFlipped(Array(10).fill(false))
    setBusPyramidFlipIndex(-1)
    setBusPlayersHand(initialHands)
    setBusPredictionStep(Object.fromEntries(state.players.map((p) => [p.id, 0])))
    setBusDeck(shuffled)
    setBusPhase("dealing")
    setBusDealtCount(0)
    setBusTurn(0)
    setBusPredictionStatus({ text: "", isCorrect: null, active: false })
    setBusSipDist(null)
    setBusPredictionInProgress(false)
    setFlyingCards([])
    setPyramidDiscards({})
    setBusDriverId("")
    setBusRideCards([])
    setBusRideIndex(0)
    setBusRideMessage("")
  }, [state.players])

  useEffect(() => {
    if (busIsActive && state.players.length > 0) {
      initBusfahrenGame()
    }
  }, [busIsActive, state.players.length]) // eslint-disable-line

  // Give a bus sip from the current distributor to a target player
  const giveBusSip = useCallback((targetId: string) => {
    setBusSipDist((prev) => {
      if (!prev || prev.sipsLeft <= 0) return null
      const next = prev.sipsLeft - 1
      // Animate sip stream
      requestAnimationFrame(() => {
        const fromSeat = document.getElementById(
          prev.distributorId === "you" ? "seat-you" : `seat-${prev.distributorId}`
        )
        const toSeat = document.getElementById(targetId === "you" ? "seat-you" : `seat-${targetId}`)
        if (fromSeat && toSeat) {
          const fr = fromSeat.getBoundingClientRect()
          const tr = toSeat.getBoundingClientRect()
          triggerLiquidStream(
            fr.left + fr.width / 2, fr.top + fr.height / 2,
            tr.left + tr.width / 2, tr.top + tr.height / 2,
            targetId,
            () => dispatch({ type: "addSips", playerId: targetId, amount: 1 }),
          )
        } else {
          dispatch({ type: "addSips", playerId: targetId, amount: 1 })
        }
      })
      return next > 0 ? { ...prev, sipsLeft: next } : null
    })
  }, [])

  // Card placement animation helper
  const triggerCardFly = useCallback((card: CardState, fromElId: string, toElId: string, onDone: () => void) => {
    const fromEl = document.getElementById(fromElId)
    const toEl = document.getElementById(toElId)
    if (!fromEl || !toEl) {
      onDone()
      return
    }
    const fromRect = fromEl.getBoundingClientRect()
    const toRect = toEl.getBoundingClientRect()

    const newAnim: CardFlyAnimation = {
      id: Math.random().toString(),
      card,
      fromX: fromRect.left + fromRect.width / 2,
      fromY: fromRect.top + fromRect.height / 2,
      toX: toRect.left + toRect.width / 2,
      toY: toRect.top + toRect.height / 2,
    }

    setFlyingCards((prev) => [...prev, newAnim])
    playCardSound()

    setTimeout(() => {
      setFlyingCards((prev) => prev.filter((a) => a.id !== newAnim.id))
      onDone()
    }, 600)
  }, [playCardSound])

  // Advance bus turn — called after sip distribution is done
  const advanceBusTurn = useCallback((
    nextDealt: number,
    nextStep: number,
    updatedHand: CardState[],
    curPlayerId: string,
    handsSnapshot: Record<string, CardState[]>,
  ) => {
    setBusPredictionStatus((prev) => ({ ...prev, active: false }))
    const allDealt = nextDealt >= 0 && nextDealt >= (state.players.length * 4)
    if (allDealt) {
      state.players.forEach((p) => {
        const hand = p.id === curPlayerId ? updatedHand : (handsSnapshot[p.id] || [])
        const reds = hand.filter((c) => c.suit === "herz" || c.suit === "karo").length
        if (reds === 4) dispatch({ type: "addSips", playerId: p.id, amount: 4 })
        else if (reds === 0) dispatch({ type: "addSips", playerId: p.id, amount: 4 })
      })
      setBusPhase("pyramid")
    } else {
      setBusTurn((prev) => (prev + 1) % state.players.length)
    }
    setBusPredictionInProgress(false)
  }, [state.players])

  const handleBusPrediction = useCallback((choice: string) => {
    if (busPhase !== "dealing") return
    if (busSipDist !== null) return  // blocked until sips distributed
    if (busPredictionInProgress) return
    setBusPredictionInProgress(true)

    const curPlayer = state.players[busTurn]
    if (!curPlayer) {
      setBusPredictionInProgress(false)
      return
    }
    const curHand = busPlayersHand[curPlayer.id] || []
    const step = busPredictionStep[curPlayer.id] ?? 0

    const nextDeck = [...busDeck]
    const drawn = nextDeck.pop()
    if (!drawn) return
    setBusDeck(nextDeck)

    let correct = false
    const isRed = drawn.suit === "herz" || drawn.suit === "karo"
    if (step === 0) {
      correct = (choice === "rot" && isRed) || (choice === "schwarz" && !isRed)
    } else if (step === 1) {
      const prev = RANK_VALUE[curHand[0].rank]
      const cur = RANK_VALUE[drawn.rank]
      if (choice === "hoeher") correct = cur > prev
      else if (choice === "tiefer") correct = cur < prev
      else correct = cur === prev
    } else if (step === 2) {
      const v1 = RANK_VALUE[curHand[0].rank]
      const v2 = RANK_VALUE[curHand[1].rank]
      const lo = Math.min(v1, v2), hi = Math.max(v1, v2)
      const cur = RANK_VALUE[drawn.rank]
      const inside = cur > lo && cur < hi
      correct = (choice === "innerhalb" && inside) || (choice === "ausserhalb" && !inside)
    } else {
      correct = drawn.suit === choice
    }

    const isShort = activeSettings?.busRoundLength === "short"
    const sipMap = isShort ? [1, 2, 3, 4] : [1, 1, 1, 1]
    const sips = sipMap[step] ?? 1

    const updatedHand = [...curHand, { ...drawn, faceUp: true }]
    setBusPlayersHand((prev) => ({ ...prev, [curPlayer.id]: updatedHand }))

    const label = step === 0 ? (choice === "rot" ? "Rot" : "Schwarz") : choice.toUpperCase()
    const suitLabel = drawn.suit === "herz" ? "♥" : drawn.suit === "karo" ? "♦" : drawn.suit === "pik" ? "♠" : "♣"
    setBusPredictionStatus({
      text: `${curPlayer.name} → ${label} · ${drawn.rank.toUpperCase()} ${suitLabel} · ${correct ? "✓ Richtig!" : "✗ Falsch!"}`,
      isCorrect: correct,
      active: true,
    })
    playCardSound()

    const nextStep = step + 1
    const nextDealt = busDealtCount + 1
    setBusDealtCount(nextDealt)
    setBusPredictionStep((prev) => ({ ...prev, [curPlayer.id]: nextStep }))

    // After a short reveal delay, trigger sips then gate the next turn
    setTimeout(() => {
      // Animate sip stream between deck and seat (defer to next frame for DOM)
      requestAnimationFrame(() => {
        const deckElem = document.getElementById("bus-deck-stack")
        const curSeatId = curPlayer.id === "you" ? "seat-you" : `seat-${curPlayer.id}`
        const curSeat = document.getElementById(curSeatId)
        const deckRect = deckElem?.getBoundingClientRect()
        const seatRect = curSeat?.getBoundingClientRect()
        const fromX = deckRect ? deckRect.left + deckRect.width / 2 : window.innerWidth / 2
        const fromY = deckRect ? deckRect.top + deckRect.height / 2 : window.innerHeight / 2
        const toX = seatRect ? seatRect.left + seatRect.width / 2 : window.innerWidth / 2
        const toY = seatRect ? seatRect.top + seatRect.height / 2 : window.innerHeight * 0.8

        if (correct) {
          // Winner distributes sips to others
          if (curPlayer.id === "you") {
            // Human must click opponents — gate the turn, store advance payload
            setBusSipDist({ distributorId: "you", sipsLeft: sips })
            pendingBusAdvanceRef.current = {
              nextDealt, nextStep, hand: updatedHand,
              curPlayerId: curPlayer.id, hands: busPlayersHand,
            }
          } else {
            // AI auto-picks a random target
            const candidates = state.players.filter((p) => p.id !== curPlayer.id)
            for (let i = 0; i < sips; i++) {
              const target = candidates[Math.floor(Math.random() * candidates.length)]
              const tgtSeatId = target.id === "you" ? "seat-you" : `seat-${target.id}`
              const tgtSeat = document.getElementById(tgtSeatId)
              const tgtRect = tgtSeat?.getBoundingClientRect()
              const tgtX = tgtRect ? tgtRect.left + tgtRect.width / 2 : window.innerWidth / 2
              const tgtY = tgtRect ? tgtRect.top + tgtRect.height / 2 : window.innerHeight * 0.2
              setTimeout(() => {
                triggerLiquidStream(toX, toY, tgtX, tgtY, target.id,
                  () => dispatch({ type: "addSips", playerId: target.id, amount: 1 }))
              }, i * 350)
            }
            // AI auto-advances after animations play out
            setTimeout(() => {
              setBusPredictionStatus((prev) => ({ ...prev, active: false }))
              advanceBusTurn(nextDealt, nextStep, updatedHand, curPlayer.id, busPlayersHand)
            }, sips * 350 + 800)
          }
        } else {
          // Loser drinks — animate from deck to their seat
          for (let i = 0; i < sips; i++) {
            setTimeout(() => {
              triggerLiquidStream(fromX, fromY, toX, toY, curPlayer.id,
                () => dispatch({ type: "addSips", playerId: curPlayer.id, amount: 1 }))
            }, i * 350)
          }
          // After sips land, advance turn automatically
          setTimeout(() => {
            setBusPredictionStatus((prev) => ({ ...prev, active: false }))
            advanceBusTurn(nextDealt, nextStep, updatedHand, curPlayer.id, busPlayersHand)
          }, sips * 350 + 800)
        }
      })
    }, 1200)
  }, [busPhase, busTurn, busDealtCount, busDeck, busPlayersHand, busPredictionStep, busSipDist, state.players, activeSettings, playCardSound, advanceBusTurn])



  // When human finishes distributing their last sip, advance the bus turn
  const pendingBusAdvanceRef = useRef<{
    nextDealt: number; nextStep: number; hand: CardState[];
    curPlayerId: string; hands: Record<string, CardState[]>;
  } | null>(null)

  useEffect(() => {
    if (busSipDist === null && pendingBusAdvanceRef.current !== null) {
      const p = pendingBusAdvanceRef.current
      pendingBusAdvanceRef.current = null
      setBusPredictionStatus((prev) => ({ ...prev, active: false }))
      advanceBusTurn(p.nextDealt, p.nextStep, p.hand, p.curPlayerId, p.hands)
    }
  }, [busSipDist, advanceBusTurn])

  // AI auto-play during dealing phase
  useEffect(() => {
    if (!busIsActive || busPhase !== "dealing") return
    if (busSipDist !== null) return  // wait for sip distribution to finish
    const curPlayer = state.players[busTurn]
    if (!curPlayer || curPlayer.id === "you") return
    const timer = setTimeout(() => {
      const step = busPredictionStep[curPlayer.id] ?? 0
      const curHand = busPlayersHand[curPlayer.id] || []
      let choice = "rot"
      if (step === 0) choice = Math.random() > 0.5 ? "rot" : "schwarz"
      else if (step === 1) choice = RANK_VALUE[curHand[0]?.rank] <= 7 ? "hoeher" : "tiefer"
      else if (step === 2) {
        const v1 = RANK_VALUE[curHand[0]?.rank], v2 = RANK_VALUE[curHand[1]?.rank]
        choice = Math.abs(v1 - v2) >= 5 ? "innerhalb" : "ausserhalb"
      } else {
        const suits = ["herz", "karo", "pik", "kreuz"]
        choice = suits[Math.floor(Math.random() * suits.length)]
      }
      handleBusPrediction(choice)
    }, 2200)
    return () => clearTimeout(timer)
  }, [busIsActive, busPhase, busTurn, busPredictionStep, busPlayersHand, busSipDist, state.players, handleBusPrediction])

  const flipPyramidCard = useCallback(() => {
    if (busPhase !== "pyramid") return
    const nextIdx = busPyramidFlipIndex + 1
    if (nextIdx >= 10) return
    setBusPyramidFlipIndex(nextIdx)
    setBusPyramidFlipped((prev) => { const c = [...prev]; c[nextIdx] = true; return c })
    playCardSound()
    const flippedCard = busPyramidCards[nextIdx]
    let rowSips = 1
    if (nextIdx >= 4 && nextIdx <= 6) rowSips = 2
    else if (nextIdx >= 7 && nextIdx <= 8) rowSips = 3
    else if (nextIdx === 9) rowSips = 4

    setTimeout(() => {
      const updatedHands = { ...busPlayersHand }
      state.players.forEach((p) => {
        if (p.id === "you") return
        const hand = updatedHands[p.id] || []
        const matchIdx = hand.findIndex((c) => c.rank === flippedCard.rank)
        if (matchIdx !== -1) {
          const matchedCard = hand[matchIdx]
          updatedHands[p.id] = hand.filter((_, i) => i !== matchIdx)
          
          // Animate card flying from bot seat to the pyramid card slot
          triggerCardFly(matchedCard, `seat-${p.id}`, `pyramid-card-${nextIdx}`, () => {
            // Push matched card to slot's stack
            setPyramidDiscards((prev) => ({
              ...prev,
              [nextIdx]: [...(prev[nextIdx] || []), matchedCard],
            }))
            
            // Bot drinks as compensation! Sips fly from pyramid slot back to bot seat
            const pyramidSlot = document.getElementById(`pyramid-card-${nextIdx}`)
            const botSeat = document.getElementById(`seat-${p.id}`)
            if (pyramidSlot && botSeat) {
              const pr = pyramidSlot.getBoundingClientRect()
              const sr = botSeat.getBoundingClientRect()
              triggerMultipleSips(
                pr.left + pr.width / 2, pr.top + pr.height / 2,
                sr.left + sr.width / 2, sr.top + sr.height / 2,
                p.id,
                rowSips
              )
            } else {
              dispatch({ type: "addSips", playerId: p.id, amount: rowSips })
            }
          })
        }
      })
      setBusPlayersHand(updatedHands)
    }, 1500)
  }, [busPhase, busPyramidFlipIndex, busPyramidCards, busPlayersHand, state.players, playCardSound, triggerCardFly, triggerMultipleSips])

  const discardMatchingCard = useCallback(() => {
    if (busPhase !== "pyramid" || busPyramidFlipIndex === -1) return
    const flippedCard = busPyramidCards[busPyramidFlipIndex]
    const hand = busPlayersHand["you"] || []
    const matchIdx = hand.findIndex((c) => c.rank === flippedCard?.rank)
    if (matchIdx === -1) return
    const matchedCard = hand[matchIdx]
    setBusPlayersHand((prev) => ({ ...prev, you: hand.filter((_, i) => i !== matchIdx) }))
    
    let rowSips = 1
    if (busPyramidFlipIndex >= 4 && busPyramidFlipIndex <= 6) rowSips = 2
    else if (busPyramidFlipIndex >= 7 && busPyramidFlipIndex <= 8) rowSips = 3
    else if (busPyramidFlipIndex === 9) rowSips = 4

    // Animate card flying from your seat to the pyramid card slot
    triggerCardFly(matchedCard, "seat-you", `pyramid-card-${busPyramidFlipIndex}`, () => {
      // Push matched card to slot's stack
      setPyramidDiscards((prev) => ({
        ...prev,
        [busPyramidFlipIndex]: [...(prev[busPyramidFlipIndex] || []), matchedCard],
      }))
      
      // You drink! Sips fly from pyramid slot back to your seat
      const pyramidSlot = document.getElementById(`pyramid-card-${busPyramidFlipIndex}`)
      const youSeat = document.getElementById("seat-you")
      if (pyramidSlot && youSeat) {
        const pr = pyramidSlot.getBoundingClientRect()
        const yr = youSeat.getBoundingClientRect()
        triggerMultipleSips(
          pr.left + pr.width / 2, pr.top + pr.height / 2,
          yr.left + yr.width / 2, yr.top + yr.height / 2,
          "you",
          rowSips
        )
      } else {
        dispatch({ type: "addSips", playerId: "you", amount: rowSips })
      }
    })
  }, [busPhase, busPyramidFlipIndex, busPyramidCards, busPlayersHand, triggerCardFly, triggerMultipleSips])

  const determineBusDriver = useCallback(() => {
    let maxCards = -1, loserId = "you"
    state.players.forEach((p) => {
      const count = (busPlayersHand[p.id] || []).length
      if (count > maxCards) { maxCards = count; loserId = p.id }
    })
    setBusDriverId(loserId)
    setBusPhase("busride")
    const count = activeSettings?.busPunishmentCards ?? 5
    const nextDeck = [...busDeck]
    const punishCards: CardState[] = []
    for (let i = 0; i < count; i++) {
      const popped = nextDeck.pop()
      if (popped) punishCards.push({ ...popped, faceUp: false })
    }
    setBusRideCards(punishCards)
    setBusRideIndex(0)
    setBusDeck(nextDeck)
    const loserName = state.players.find((p) => p.id === loserId)?.name ?? loserId
    setBusRideMessage(`${loserName} must ride the Bus!`)
  }, [state.players, busPlayersHand, busDeck, activeSettings])

  const handleBusridePrediction = useCallback((choice: string) => {
    if (busPhase !== "busride") return
    const card = busRideCards[busRideIndex]
    if (!card) return
    const updatedCards = [...busRideCards]
    updatedCards[busRideIndex] = { ...card, faceUp: true }
    setBusRideCards(updatedCards)
    playCardSound()
    const isRed = card.suit === "herz" || card.suit === "karo"
    const correct = (choice === "rot" && isRed) || (choice === "schwarz" && !isRed)
    if (correct) {
      const nextIdx = busRideIndex + 1
      if (nextIdx >= busRideCards.length) {
        const driverName = state.players.find((p) => p.id === busDriverId)?.name ?? busDriverId
        setBusRideMessage(`${driverName} got off the Bus! 🎉`)
        setBusPhase("ended")
      } else {
        setBusRideIndex(nextIdx)
        setBusRideMessage("Correct! Predict the next card.")
      }
    } else {
      const penalty = busRideIndex + 1
      setBusRideMessage(`Wrong! Drink ${penalty} sip${penalty > 1 ? "s" : ""}. Starting over!`)
      const seatId = busDriverId === "you" ? "seat-you" : `seat-${busDriverId}`
      const driverSeat = document.getElementById(seatId)
      const activeCardElem = document.getElementById(`bus-ride-card-${busRideIndex}`)
      if (driverSeat && activeCardElem) {
        const cr = activeCardElem.getBoundingClientRect(), sr = driverSeat.getBoundingClientRect()
        triggerMultipleSips(cr.left + cr.width / 2, cr.top + cr.height / 2, sr.left + sr.width / 2, sr.top + sr.height / 2, busDriverId, penalty)
      }
      setTimeout(() => {
        let currentDeck = [...busDeck]
        if (currentDeck.length < busRideCards.length) {
          const freshDeck = buildDeck(1, false).map((c, idx) => ({
            ...c, id: `bus-reset-${c.suit}-${c.rank}-${idx}`, zone: { type: "deck" as const }, faceUp: false,
          }))
          currentDeck = shuffle(freshDeck)
        }
        const newCards: CardState[] = []
        for (let i = 0; i < busRideCards.length; i++) {
          const popped = currentDeck.pop()
          if (popped) newCards.push({ ...popped, faceUp: false })
        }
        setBusRideCards(newCards)
        setBusRideIndex(0)
        setBusDeck(currentDeck)
      }, 2500)
    }
  }, [busPhase, busRideCards, busRideIndex, busDriverId, busDeck, state.players, playCardSound])

  // AI busride
  useEffect(() => {
    if (!busIsActive || busPhase !== "busride" || busDriverId === "you") return
    const timer = setTimeout(() => {
      handleBusridePrediction(Math.random() > 0.5 ? "rot" : "schwarz")
    }, 2800)
    return () => clearTimeout(timer)
  }, [busIsActive, busPhase, busDriverId, busRideIndex, handleBusridePrediction])

  // ── render ────────────────────────────────────────────────────────────────
  const finalYourHand = busIsActive ? busYourHand : yourHand

  // ── Loading screen ────────────────────────────────────────────────────────
  if (!imagesLoaded) {
    const total = 54
    const pct = Math.round((loadedCount / total) * 100)
    return (
      <div className="flex h-[100dvh] flex-col items-center justify-center bg-[#0a0e1a] gap-4">
        <div className="flex flex-col items-center gap-3">
          <div className="relative h-2 w-48 overflow-hidden rounded-full bg-white/10">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-[oklch(0.78_0.13_82)] transition-all duration-300"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-mono text-muted-foreground">Loading cards… {pct}%</span>
        </div>
      </div>
    )
  }

  return (
    <LayoutGroup>
      <div className="flex h-[100dvh] flex-col overflow-hidden">
        {/* HUD */}
        <GameHud
          gameName={
            busIsActive
              ? `Busfahren · Phase ${busPhase === "dealing" ? "1: Dealing" : busPhase === "pyramid" ? "2: Pyramid" : busPhase === "busride" ? "3: Bus Ride" : "Done"}`
              : `Sandbox Demo · Round ${state.round}`
          }
          info={
            busIsActive ? (
              <div className="rounded-full border border-border/60 bg-popover/70 px-4 py-1 text-sm">
                <span className="text-muted-foreground">
                  {activeSettings?.busRoundLength === "short" ? "Short" : "Long"} round ·{" "}
                  {activeSettings?.busPunishmentCards ?? 5} punishment cards
                </span>
              </div>
            ) : (
              <div className="rounded-full border border-border/60 bg-popover/70 px-4 py-1 text-sm">
                <span className="text-muted-foreground">Turn: </span>
                <span className="font-display font-semibold text-primary">{current.name}</span>
              </div>
            )
          }
          actions={
            <div className="flex items-center gap-1.5">
              {!busIsActive && (
                <>
                  <label className="hidden items-center gap-1.5 rounded-lg border border-border/60 bg-popover/70 px-2 py-1 text-xs sm:flex">
                    <Users className="size-3.5 text-primary" aria-hidden />
                    <select
                      aria-label="Number of players"
                      value={state.players.length}
                      onChange={(e) => dispatch({ type: "reset", playerCount: Number(e.target.value) })}
                      className="bg-transparent font-mono text-foreground outline-none"
                    >
                      {PLAYER_OPTIONS.map((n) => (
                        <option key={n} value={n} className="bg-popover">{n}</option>
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
                  </label>
                  <Button size="sm" variant="outline" onClick={() => dispatch({ type: "reset" })} aria-label="Reset">
                    <RotateCcw className="size-3.5" aria-hidden />
                  </Button>
                </>
              )}
              <Button size="sm" variant="ghost" onClick={() => setMuted((m) => !m)} aria-label="Mute">
                {muted ? <VolumeX className="size-3.5" /> : <Volume2 className="size-3.5" />}
              </Button>
              <Button size="sm" variant="ghost" onClick={toggleFullscreen} aria-label="Fullscreen">
                {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
              </Button>
            </div>
          }
        />

        <div className="min-h-0 flex-1">
          <GameTable
            players={players}
            currentPlayerId={busIsActive ? "you" : current.id}
            renderSeatCards={(p) =>
              p.isYou ? null : (
                <CardFan
                  cards={busIsActive ? (busPlayersHand[p.id] || []) : handCards(state, p.id)}
                  cardWidth={oppCardW}
                  maxAngle={14}
                  curve={6}
                  overlap={0.5}
                />
              )
            }
            onSeatClick={busIsActive && busSipDist !== null
              ? (pid) => giveBusSip(pid)
              : sipsToDistribute > 0 ? giveSip : undefined
            }
            center={
              busIsActive ? (
                /* ── BUSFAHREN CENTER BOARD ── */
                <div className="flex flex-col items-center justify-center gap-4 w-full h-full max-w-lg mx-auto z-10 py-2 animate-in fade-in duration-300">

                  {/* PHASE 1: Dealing */}
                  {busPhase === "dealing" && (
                    <div className="flex flex-col items-center gap-4 text-center w-full max-w-sm">
                      <div id="bus-deck-stack" className="relative">
                        <DeckStack cards={busDeck} cardWidth={cardW * 0.75} label="Bus Deck" />
                      </div>

                      {/* Sip distribution overlay */}
                      {busSipDist && busSipDist.distributorId === "you" && (
                        <motion.div
                          initial={{ scale: 0.9, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="w-full rounded-2xl border border-amber-500/40 bg-black/80 px-4 py-3 text-center shadow-xl backdrop-blur-md"
                        >
                          <div className="flex items-center justify-center gap-2 mb-2">
                            <Sparkles className="size-4 text-amber-400 animate-pulse" />
                            <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                              Verteile {busSipDist.sipsLeft} Schluck{busSipDist.sipsLeft !== 1 ? "e" : ""}
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-3">
                            Klicke auf einen Spieler-Sitz um einen Schluck zu verteilen.
                          </p>
                          <div className="flex flex-wrap gap-1.5 justify-center">
                            {state.players.filter((p) => p.id !== "you").map((p) => (
                              <Button
                                key={p.id}
                                size="sm"
                                variant="outline"
                                className="text-xs border-amber-500/30 text-amber-300 hover:bg-amber-500/15 h-8"
                                onClick={() => giveBusSip(p.id)}
                              >
                                {p.name} 🍺
                              </Button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                      {busPredictionStatus.active && (
                        <div className={cn(
                          "px-4 py-2 rounded-xl text-xs font-semibold font-mono border shadow-md animate-in zoom-in-95 duration-200",
                          busPredictionStatus.isCorrect === true
                            ? "bg-green-500/10 border-green-500/30 text-green-400"
                            : "bg-red-500/10 border-red-500/30 text-red-400",
                        )}>
                          {busPredictionStatus.text}
                        </div>
                      )}

                      <div className="bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md w-full flex flex-col items-center gap-3">
                        <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
                          Turn: {state.players[busTurn]?.name}
                        </span>

                        <h4 className="text-xs font-semibold text-foreground/90">
                          {state.players[busTurn]?.id === "you" ? (
                            busPredictionStep["you"] === 0 ? "Red or Black?" :
                            busPredictionStep["you"] === 1 ? "Higher or Lower?" :
                            busPredictionStep["you"] === 2 ? "Inside or Outside?" :
                            "Which Suit?"
                          ) : (
                            `AI is predicting…`
                          )}
                        </h4>

                        {state.players[busTurn]?.id === "you" && !busPredictionStatus.active && busSipDist === null && (
                          <div className="flex flex-wrap gap-2 justify-center mt-1">
                            {(busPredictionStep["you"] ?? 0) === 0 && (
                              <>
                                <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-semibold" onClick={() => handleBusPrediction("rot")}>Red</Button>
                                <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold" onClick={() => handleBusPrediction("schwarz")}>Black</Button>
                              </>
                            )}
                            {(busPredictionStep["you"] ?? 0) === 1 && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("hoeher")}>Higher ↑</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("tiefer")}>Lower ↓</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("gleich")}>Equal =</Button>
                              </>
                            )}
                            {(busPredictionStep["you"] ?? 0) === 2 && (
                              <>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("innerhalb")}>Inside ( )</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("ausserhalb")}>Outside ][ </Button>
                              </>
                            )}
                            {(busPredictionStep["you"] ?? 0) === 3 && (
                              <div className="grid grid-cols-2 gap-1.5 w-full">
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("herz")}>♥ Hearts</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("karo")}>♦ Diamonds</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("pik")}>♠ Spades</Button>
                                <Button size="sm" variant="outline" onClick={() => handleBusPrediction("kreuz")}>♣ Clubs</Button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PHASE 2: Pyramid */}
                  {busPhase === "pyramid" && (
                    <div className="flex flex-col items-center gap-3 w-full animate-in fade-in duration-300">
                      <div className="text-center">
                        <h4 className="text-xs font-mono uppercase tracking-widest text-primary mb-1">Phase 2: The Pyramid</h4>
                        <p className="text-[10px] text-muted-foreground italic">Flip cards bottom→top. Throw matching cards to give sips!</p>
                      </div>

                      {/* Pyramid grid (4-3-2-1 bottom to top) */}
                      <div className="flex flex-col gap-1.5 items-center select-none">
                        {/* Row 4 — top — index 9 */}
                        <div className="flex gap-1.5 justify-center">
                          {[9].map((idx) => (
                            <div key={idx} id={`pyramid-card-${idx}`} className={cn(
                              "relative transition-all duration-300 rounded-xl border overflow-hidden shadow-lg p-0.5",
                              busPyramidFlipIndex === idx ? "ring-2 ring-primary bg-primary/10 scale-105 border-primary/40" : "border-white/10 bg-black/40",
                            )}>
                              <PlayingCard card={{ ...busPyramidCards[idx], faceUp: busPyramidFlipped[idx] }} width={cardW * 0.52} />
                              {/* Stacked matched cards discards */}
                              {(pyramidDiscards[idx] || []).map((discCard, dIdx) => (
                                <div key={discCard.id} className="absolute inset-0 p-0.5 pointer-events-none" style={{ transform: `rotate(${(dIdx + 1) * 6 - 3}deg) translate(${dIdx * 2}px, ${dIdx * -2}px)` }}>
                                  <PlayingCard card={{ ...discCard, faceUp: true }} width={cardW * 0.52} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        {/* Row 3 */}
                        <div className="flex gap-1.5 justify-center">
                          {[7, 8].map((idx) => (
                            <div key={idx} id={`pyramid-card-${idx}`} className={cn(
                              "relative transition-all duration-300 rounded-xl border overflow-hidden shadow-lg p-0.5",
                              busPyramidFlipIndex === idx ? "ring-2 ring-primary bg-primary/10 scale-105 border-primary/40" : "border-white/10 bg-black/40",
                            )}>
                              <PlayingCard card={{ ...busPyramidCards[idx], faceUp: busPyramidFlipped[idx] }} width={cardW * 0.52} />
                              {/* Stacked matched cards discards */}
                              {(pyramidDiscards[idx] || []).map((discCard, dIdx) => (
                                <div key={discCard.id} className="absolute inset-0 p-0.5 pointer-events-none" style={{ transform: `rotate(${(dIdx + 1) * 6 - 3}deg) translate(${dIdx * 2}px, ${dIdx * -2}px)` }}>
                                  <PlayingCard card={{ ...discCard, faceUp: true }} width={cardW * 0.52} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        {/* Row 2 */}
                        <div className="flex gap-1.5 justify-center">
                          {[4, 5, 6].map((idx) => (
                            <div key={idx} id={`pyramid-card-${idx}`} className={cn(
                              "relative transition-all duration-300 rounded-xl border overflow-hidden shadow-lg p-0.5",
                              busPyramidFlipIndex === idx ? "ring-2 ring-primary bg-primary/10 scale-105 border-primary/40" : "border-white/10 bg-black/40",
                            )}>
                              <PlayingCard card={{ ...busPyramidCards[idx], faceUp: busPyramidFlipped[idx] }} width={cardW * 0.52} />
                              {/* Stacked matched cards discards */}
                              {(pyramidDiscards[idx] || []).map((discCard, dIdx) => (
                                <div key={discCard.id} className="absolute inset-0 p-0.5 pointer-events-none" style={{ transform: `rotate(${(dIdx + 1) * 6 - 3}deg) translate(${dIdx * 2}px, ${dIdx * -2}px)` }}>
                                  <PlayingCard card={{ ...discCard, faceUp: true }} width={cardW * 0.52} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                        {/* Row 1 — bottom */}
                        <div className="flex gap-1.5 justify-center">
                          {[0, 1, 2, 3].map((idx) => (
                            <div key={idx} id={`pyramid-card-${idx}`} className={cn(
                              "relative transition-all duration-300 rounded-xl border overflow-hidden shadow-lg p-0.5",
                              busPyramidFlipIndex === idx ? "ring-2 ring-primary bg-primary/10 scale-105 border-primary/40" : "border-white/10 bg-black/40",
                            )}>
                              <PlayingCard card={{ ...busPyramidCards[idx], faceUp: busPyramidFlipped[idx] }} width={cardW * 0.52} />
                              {/* Stacked matched cards discards */}
                              {(pyramidDiscards[idx] || []).map((discCard, dIdx) => (
                                <div key={discCard.id} className="absolute inset-0 p-0.5 pointer-events-none" style={{ transform: `rotate(${(dIdx + 1) * 6 - 3}deg) translate(${dIdx * 2}px, ${dIdx * -2}px)` }}>
                                  <PlayingCard card={{ ...discCard, faceUp: true }} width={cardW * 0.52} />
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="flex gap-2 justify-center w-full max-w-xs z-20">
                        {busPyramidFlipIndex < 9 ? (
                          <Button size="sm" className="w-full text-xs" onClick={flipPyramidCard}>
                            Flip Next Card
                          </Button>
                        ) : (
                          <Button size="sm" className="w-full text-xs bg-primary hover:bg-primary/90 text-black font-semibold animate-pulse" onClick={determineBusDriver}>
                            Determine Bus Driver →
                          </Button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PHASE 3: Busride */}
                  {busPhase === "busride" && (
                    <div className="flex flex-col items-center gap-4 w-full text-center animate-in fade-in duration-300">
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-widest text-primary font-bold">Phase 3: Riding the Bus</h4>
                        <span className="text-[11px] font-semibold text-red-400 font-mono">
                          Driver: {state.players.find((p) => p.id === busDriverId)?.name}
                        </span>
                      </div>

                      <div className="flex gap-2 items-center justify-center py-2 overflow-x-auto w-full">
                        {busRideCards.map((card, idx) => (
                          <div
                            key={idx}
                            id={`bus-ride-card-${idx}`}
                            className={cn(
                              "transition-all duration-300 rounded-xl border overflow-hidden shadow-lg p-0.5",
                              busRideIndex === idx
                                ? "ring-2 ring-red-500 bg-red-500/10 scale-105 animate-pulse border-red-500/40"
                                : idx < busRideIndex
                                ? "border-white/5 bg-black/20 opacity-50"
                                : "border-white/10 bg-black/40",
                            )}
                          >
                            <PlayingCard card={card} width={cardW * 0.7} />
                          </div>
                        ))}
                      </div>

                      <p className="text-xs font-semibold font-mono text-foreground/80 min-h-5">{busRideMessage}</p>

                      {busDriverId === "you" && (
                        <div className="bg-black/60 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-md flex flex-col items-center gap-3">
                          <span className="text-[10px] font-mono uppercase tracking-widest text-primary/80">
                            Card {busRideIndex + 1} — Red or Black?
                          </span>
                          <div className="flex gap-2">
                            <Button size="sm" className="bg-red-600 hover:bg-red-500 text-white font-semibold" onClick={() => handleBusridePrediction("rot")}>Red</Button>
                            <Button size="sm" className="bg-zinc-800 hover:bg-zinc-700 text-white font-semibold" onClick={() => handleBusridePrediction("schwarz")}>Black</Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ENDED */}
                  {busPhase === "ended" && (
                    <div className="flex flex-col items-center gap-4 text-center">
                      <div className="p-5 rounded-2xl border border-green-500/20 bg-green-500/5 flex flex-col items-center gap-2">
                        <Sparkles className="size-8 text-green-400 animate-bounce" />
                        <h4 className="text-sm font-bold text-green-400">Game Over!</h4>
                        <p className="text-xs text-muted-foreground">{busRideMessage}</p>
                      </div>
                      <Button size="sm" onClick={initBusfahrenGame}>Play Again</Button>
                    </div>
                  )}
                </div>
              ) : isWide ? (
                /* ── SANDBOX CENTER (wide) ── */
                <div className="flex w-full flex-col items-center gap-4 sm:gap-6 z-0">
                  <div className="flex flex-wrap w-full items-center justify-center gap-4 sm:gap-6">
                    <motion.div
                      animate={
                        reshufflePhase === "shuffling"
                          ? { opacity: 0, scale: 1 }
                          : reshufflePhase === "flying" || reshufflePhase === "returning"
                          ? { opacity: 1, scale: 1.15, zIndex: 30 }
                          : { opacity: 1, scale: 1, zIndex: 0 }
                      }
                      transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    >
                      <DeckStack cards={deck} cardWidth={cardW * 0.72} onDraw={() => { dispatch({ type: "draw", playerId: "you" }); playCardSound() }} label="Draw" />
                    </motion.div>

                    {/* Table 1 */}
                    <PlayZone data-dropzone-id="play1" label="Table 1" active={hoveredZoneId === "play1" || selectedCardIdForTarget !== null} className={cn("transition-all duration-200 min-h-28 min-w-28 sm:min-h-32 sm:min-w-32", hoveredZoneId === "play1" && "bg-primary/5 border-primary scale-102")}>
                      {selectedCardIdForTarget && (
                        <button onClick={(e) => { e.stopPropagation(); handleSelectTarget("play1") }} className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary bg-primary/15 flex items-center justify-center cursor-pointer z-20 hover:bg-primary/25 transition-colors">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">Select Table 1</span>
                        </button>
                      )}
                      {draggedCardId && (
                        <div className={cn("absolute inset-0 rounded-2xl border-2 border-dashed flex items-center justify-center bg-black/50 pointer-events-none z-10", hoveredZoneId === "play1" ? "border-primary opacity-100 animate-pulse" : "border-primary/20 opacity-60")}>
                          <span className="text-[10px] font-bold text-primary uppercase">{hoveredZoneId === "play1" ? "Play!" : "Table 1"}</span>
                        </div>
                      )}
                      <div className="flex min-h-24 min-w-24 items-center justify-center z-0">
                        {trick1.length > 0 ? (
                          <CardFan cards={trick1} cardWidth={cardW * 0.72} maxAngle={18} curve={8} overlap={trick1Overlap} interactive />
                        ) : !selectedCardIdForTarget && !draggedCardId && (
                          <span className="text-center text-[10px] text-muted-foreground select-none">{dealt ? "Play here" : "Table 1"}</span>
                        )}
                      </div>
                    </PlayZone>

                    {/* Table 2 */}
                    <PlayZone data-dropzone-id="play2" label="Table 2" active={hoveredZoneId === "play2" || selectedCardIdForTarget !== null} className={cn("transition-all duration-200 min-h-28 min-w-28 sm:min-h-32 sm:min-w-32", hoveredZoneId === "play2" && "bg-primary/5 border-primary scale-102")}>
                      {selectedCardIdForTarget && (
                        <button onClick={(e) => { e.stopPropagation(); handleSelectTarget("play2") }} className="absolute inset-0 rounded-2xl border-2 border-dashed border-primary bg-primary/15 flex items-center justify-center cursor-pointer z-20 hover:bg-primary/25 transition-colors">
                          <span className="text-[10px] font-bold text-primary uppercase tracking-widest animate-pulse">Select Table 2</span>
                        </button>
                      )}
                      {draggedCardId && (
                        <div className={cn("absolute inset-0 rounded-2xl border-2 border-dashed flex items-center justify-center bg-black/50 pointer-events-none z-10", hoveredZoneId === "play2" ? "border-primary opacity-100 animate-pulse" : "border-primary/20 opacity-60")}>
                          <span className="text-[10px] font-bold text-primary uppercase">{hoveredZoneId === "play2" ? "Play!" : "Table 2"}</span>
                        </div>
                      )}
                      <div className="flex min-h-24 min-w-24 items-center justify-center z-0">
                        {trick2.length > 0 ? (
                          <CardFan cards={trick2} cardWidth={cardW * 0.72} maxAngle={18} curve={8} overlap={trick2Overlap} interactive />
                        ) : !selectedCardIdForTarget && !draggedCardId && (
                          <span className="text-center text-[10px] text-muted-foreground select-none">{dealt ? "Play here" : "Table 2"}</span>
                        )}
                      </div>
                    </PlayZone>

                    {/* Discard */}
                    <PlayZone label="Discard" className="min-h-28 min-w-28 sm:min-h-32 sm:min-w-32 bg-black/20 border-white/5">
                      <div className="flex min-h-24 min-w-24 items-center justify-center">
                        {discard.length > 0 ? (
                          <CardFan cards={discard} cardWidth={cardW * 0.72} maxAngle={12} curve={4} overlap={0.15} interactive={false} />
                        ) : <span className="text-[10px] text-muted-foreground/45 font-mono">Discard</span>}
                      </div>
                    </PlayZone>

                    {/* Pot */}
                    <PlayZone label="Pot" className="min-h-28 min-w-28 sm:min-h-32 sm:min-w-32 bg-black/20 border-white/5">
                      <div className="flex min-h-24 min-w-24 items-center justify-center">
                        {pot.length > 0 ? (
                          <CardFan cards={pot} cardWidth={cardW * 0.72} maxAngle={16} curve={6} overlap={0.2} interactive={false} />
                        ) : <span className="text-[10px] text-muted-foreground/45 font-mono">Pot</span>}
                      </div>
                    </PlayZone>
                  </div>
                </div>
              ) : (
                /* ── SANDBOX CENTER (mobile) ── */
                <div className="flex w-full flex-col items-center gap-3 py-1">
                  <div className="flex items-center justify-center gap-3">
                    <motion.div animate={reshufflePhase === "shuffling" ? { opacity: 0 } : { opacity: 1 }} transition={{ type: "spring" }}>
                      <DeckStack cards={deck} cardWidth={cardW * 0.7} onDraw={() => { dispatch({ type: "draw", playerId: "you" }); playCardSound() }} label="Draw" />
                    </motion.div>
                    <PlayZone data-dropzone-id="play1" label="Table 1" active={hoveredZoneId === "play1" || selectedCardIdForTarget !== null} className={cn("transition-all duration-200 min-h-24 min-w-24", hoveredZoneId === "play1" && "bg-primary/5 border-primary scale-102")}>
                      <div className="flex min-h-20 min-w-20 items-center justify-center z-0">
                        {trick1.length > 0 ? <CardFan cards={trick1} cardWidth={cardW * 0.7} maxAngle={18} curve={8} overlap={trick1Overlap} interactive /> : <span className="text-[9px] text-muted-foreground select-none">{dealt ? "Play" : "Table 1"}</span>}
                      </div>
                    </PlayZone>
                    <PlayZone data-dropzone-id="play2" label="Table 2" active={hoveredZoneId === "play2" || selectedCardIdForTarget !== null} className={cn("transition-all duration-200 min-h-24 min-w-24", hoveredZoneId === "play2" && "bg-primary/5 border-primary scale-102")}>
                      <div className="flex min-h-20 min-w-20 items-center justify-center z-0">
                        {trick2.length > 0 ? <CardFan cards={trick2} cardWidth={cardW * 0.7} maxAngle={18} curve={8} overlap={trick2Overlap} interactive /> : <span className="text-[9px] text-muted-foreground select-none">{dealt ? "Play" : "Table 2"}</span>}
                      </div>
                    </PlayZone>
                  </div>
                </div>
              )
            }
            youHand={
              <div className="relative flex h-36 w-full items-center justify-center pb-3">
                {finalYourHand.length === 0 && (
                  <div className="absolute flex h-36 items-center text-sm text-muted-foreground pb-3">
                    {busIsActive ? "Your hand is empty" : dealt ? "Your hand is empty — draw a card." : "Deal to receive your hand."}
                  </div>
                )}
                <CardFan
                  cards={finalYourHand}
                  cardWidth={cardW}
                  maxAngle={isWide ? 26 : 18}
                  interactive={busIsActive ? busPhase === "pyramid" : isYourTurn}
                  disabledIds={busIsActive || isYourTurn ? [] : finalYourHand.map((c) => c.id)}
                  onCardClick={handleCardClick}
                  selectedIds={selectedCardIdForTarget ? [selectedCardIdForTarget] : []}
                  drag={!busIsActive && isYourTurn}
                  draggedCardId={draggedCardId}
                  hoveredZoneId={hoveredZoneId}
                  onDragStart={handleDragStart}
                  onDrag={handleDrag}
                  onDragEnd={handleDragEnd}
                />
              </div>
            }
            youActions={
              busIsActive ? (
                <div className="flex items-center gap-2">
                  {busPhase === "pyramid" && busPyramidFlipIndex !== -1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={discardMatchingCard}
                      disabled={!busYourHand.some((c) => c.rank === busPyramidCards[busPyramidFlipIndex]?.rank)}
                      className="border-green-500/20 text-green-300 hover:bg-green-500/10 text-xs h-9"
                    >
                      Throw Match!
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={initBusfahrenGame} className="text-xs h-9">
                    Restart
                  </Button>
                </div>
              ) : (
                <>
                  {!dealt ? (
                    <Button onClick={deal} size={isWide ? undefined : "sm"}>
                      <Sparkles className="size-4" aria-hidden />
                      Deal
                    </Button>
                  ) : (
                    <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 justify-end">
                      <Button variant="outline" size="sm" onClick={() => { dispatch({ type: "draw", playerId: "you" }); playCardSound() }} className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs">
                        <HandIcon className="size-3.5" aria-hidden /><span className="hidden xs:inline">Draw</span>
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => dispatch({ type: "collect" })} disabled={trick1.length === 0 && trick2.length === 0} className="h-7 px-2 text-[10px] sm:h-8 sm:px-3 sm:text-xs">
                        <Layers className="size-3.5" aria-hidden /><span className="hidden xs:inline">Collect</span>
                      </Button>
                      <Button size="sm" onClick={() => dispatch({ type: "nextTurn" })} disabled={!isYourTurn} className="h-7 px-2.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs font-semibold">
                        End turn
                      </Button>
                      {isWide && (
                        <Button variant="ghost" size="sm" onClick={triggerReshuffle} disabled={reshufflePhase !== "idle"}>
                          <RotateCcw className="size-3.5" aria-hidden /> Reshuffle
                        </Button>
                      )}
                    </div>
                  )}
                </>
              )
            }
          />
        </div>

        <AnimatePresence>
          {state.message && !busIsActive && (
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

        {/* Sip distribution popup */}
        {sipsToDistribute > 0 && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: -20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            className="absolute top-24 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-2 rounded-2xl border border-amber-500/40 bg-black/85 px-6 py-4 text-center shadow-[0_0_30px_rgba(245,158,11,0.25)] backdrop-blur-md"
          >
            <div className="flex size-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-500 ring-2 ring-amber-500/30 animate-pulse">
              <Sparkles className="size-5" />
            </div>
            <h3 className="font-display text-sm font-bold uppercase tracking-wider text-amber-500">Distribute Sips!</h3>
            <p className="text-xs text-muted-foreground max-w-[200px]">
              Select who takes the remaining{" "}
              <span className="font-bold text-foreground text-sm font-mono">{sipsToDistribute}</span> sip{sipsToDistribute !== 1 ? "s" : ""}.
            </p>
          </motion.div>
        )}

        {/* Reshuffle overlay */}
        <AnimatePresence>
          {reshufflePhase === "shuffling" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex flex-col items-center justify-center pointer-events-auto"
            >
              <div className="relative flex flex-col items-center gap-8 animate-in fade-in zoom-in-95 duration-200">
                <motion.h2
                  animate={{ opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
                  className="font-display text-sm font-bold uppercase tracking-widest text-primary"
                >
                  Shuffling…
                </motion.h2>
                <div className="relative h-44 w-64 flex items-center justify-center">
                  <motion.div className="absolute" initial={{ x: 0 }} animate={{ x: [-45, 12, -35, 8, 0], rotate: [-4, 0.5, -2, 0, 0] }} transition={{ duration: 1.1, ease: "easeInOut" }}>
                    <div className="rounded-[7%] border border-white/10 overflow-hidden" style={{ width: cardW * 1.1, height: cardW * 1.1 * 1.5 }}>
                      <img src="/cards/backs/ol5.jpg" alt="" className="h-full w-full object-cover" draggable={false} />
                    </div>
                  </motion.div>
                  <motion.div className="absolute" initial={{ x: 0 }} animate={{ x: [45, -12, 35, -8, 0], rotate: [4, -0.5, 2, 0, 0] }} transition={{ duration: 1.1, ease: "easeInOut" }}>
                    <div className="rounded-[7%] border border-white/10 overflow-hidden" style={{ width: cardW * 1.1, height: cardW * 1.1 * 1.5 }}>
                      <img src="/cards/backs/ol5.jpg" alt="" className="h-full w-full object-cover" draggable={false} />
                    </div>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Flying cards layer */}
        <AnimatePresence>
          {flyingCards.map((anim) => (
            <motion.div
              key={anim.id}
              initial={{
                position: "fixed",
                left: anim.fromX - cardW * 0.26,
                top: anim.fromY - cardW * 0.26 * 1.5,
                zIndex: 100,
                scale: 0.8,
                rotate: 0,
              }}
              animate={{
                left: anim.toX - cardW * 0.26,
                top: anim.toY - cardW * 0.26 * 1.5,
                scale: 0.52,
                rotate: 360,
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.55, ease: "easeInOut" }}
            >
              <PlayingCard card={anim.card} width={cardW * 0.52} />
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Canvas for liquid streams */}
        <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50 w-screen h-screen" />
      </div>
    </LayoutGroup>
  )
}
