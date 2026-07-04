import {
  buildDeck,
  shuffle,
  RANK_VALUE,
  type CardData,
} from "./deck"
import type { CardState, StatTone } from "./game-types"

export interface PlayerMeta {
  id: string
  name: string
  accent: StatTone
  isYou: boolean
}

export interface DemoState {
  cards: CardState[]
  players: PlayerMeta[]
  turn: number
  openOpponents: boolean
  sips: Record<string, number>
  round: number
  message: string
}

const OPPONENT_NAMES = [
  "Vex",
  "Auron",
  "Merlin",
  "Cogsworth",
  "Bruno",
  "Kára",
  "Dorn",
]
const ACCENTS: StatTone[] = ["crimson", "gold", "gem", "default"]

export function makePlayers(count: number): PlayerMeta[] {
  const players: PlayerMeta[] = [
    { id: "you", name: "You", accent: "gold", isYou: true },
  ]
  for (let i = 0; i < count - 1; i++) {
    players.push({
      id: `p${i + 1}`,
      name: OPPONENT_NAMES[i % OPPONENT_NAMES.length],
      accent: ACCENTS[(i + 1) % ACCENTS.length],
      isYou: false,
    })
  }
  return players
}

export function initState(playerCount = 4, openOpponents = false): DemoState {
  const players = makePlayers(playerCount)
  // Ordered (unshuffled) so server and first client render match. We shuffle
  // client-side on mount via the `shuffle` action to avoid hydration mismatches.
  const deck: CardState[] = buildDeck(1, false).map((c: CardData) => ({
    ...c,
    zone: { type: "deck" as const },
  }))
  return {
    cards: deck,
    players,
    turn: 0,
    openOpponents,
    sips: Object.fromEntries(players.map((p) => [p.id, 0])),
    round: 1,
    message: "Deal cards to begin.",
  }
}

// ---- selectors ----
export const deckCards = (s: DemoState) => s.cards.filter((c) => c.zone.type === "deck")
export const handCards = (s: DemoState, pid: string) =>
  s.cards.filter((c) => c.zone.type === "hand" && c.zone.playerId === pid)
export const playCards = (s: DemoState) => s.cards.filter((c) => c.zone.type === "play")
export const discardCards = (s: DemoState) =>
  s.cards.filter((c) => c.zone.type === "discard")
export const currentPlayer = (s: DemoState) => s.players[s.turn]

// ---- actions ----
export type DemoAction =
  | { type: "reset"; playerCount?: number; openOpponents?: boolean }
  | { type: "shuffle" }
  | { type: "setOpen"; open: boolean }
  | { type: "dealOne"; playerId: string }
  | { type: "playCard"; cardId: string }
  | { type: "opponentPlay"; playerId: string }
  | { type: "draw"; playerId: string }
  | { type: "collect" }
  | { type: "nextTurn" }
  | { type: "reshuffle" }

function topDeckCard(s: DemoState): CardState | undefined {
  const deck = deckCards(s)
  return deck[deck.length - 1]
}

function update(s: DemoState, cardId: string, patch: Partial<CardState>): CardState[] {
  return s.cards.map((c) => (c.id === cardId ? { ...c, ...patch } : c))
}

export function demoReducer(s: DemoState, a: DemoAction): DemoState {
  switch (a.type) {
    case "reset":
      return initState(a.playerCount ?? s.players.length, a.openOpponents ?? s.openOpponents)

    case "shuffle": {
      // Only shuffle while every card is still in the deck (fresh, undealt table).
      if (s.cards.some((c) => c.zone.type !== "deck")) return s
      return { ...s, cards: shuffle(s.cards) }
    }

    case "setOpen": {
      // flip currently-dealt opponent hands to match the new setting
      const cards = s.cards.map((c) =>
        c.zone.type === "hand" && c.zone.playerId !== "you"
          ? { ...c, faceUp: a.open }
          : c,
      )
      return { ...s, openOpponents: a.open, cards }
    }

    case "dealOne": {
      const top = topDeckCard(s)
      if (!top) return s
      const faceUp = a.playerId === "you" ? true : s.openOpponents
      return {
        ...s,
        cards: update(s, top.id, { zone: { type: "hand", playerId: a.playerId }, faceUp }),
        message: "",
      }
    }

    case "playCard": {
      const card = s.cards.find((c) => c.id === a.cardId)
      if (!card || card.zone.type !== "hand") return s
      const owner = card.zone.playerId
      return {
        ...s,
        cards: update(s, a.cardId, { zone: { type: "play", playerId: owner }, faceUp: true }),
        sips: { ...s.sips, [owner]: (s.sips[owner] ?? 0) + RANK_VALUE[card.rank] },
        message: `${nameOf(s, owner)} plays ${card.rank.toUpperCase()}.`,
      }
    }

    case "opponentPlay": {
      const hand = handCards(s, a.playerId)
      if (hand.length === 0) {
        // draw instead if possible
        const top = topDeckCard(s)
        if (!top) return s
        return {
          ...s,
          cards: update(s, top.id, {
            zone: { type: "hand", playerId: a.playerId },
            faceUp: s.openOpponents,
          }),
          message: `${nameOf(s, a.playerId)} draws a card.`,
        }
      }
      // play the highest card for a bit of "strategy"
      const pick = [...hand].sort((x, y) => RANK_VALUE[y.rank] - RANK_VALUE[x.rank])[0]
      return {
        ...s,
        cards: update(s, pick.id, { zone: { type: "play", playerId: a.playerId }, faceUp: true }),
        sips: { ...s.sips, [a.playerId]: (s.sips[a.playerId] ?? 0) + RANK_VALUE[pick.rank] },
        message: `${nameOf(s, a.playerId)} plays ${pick.rank.toUpperCase()}.`,
      }
    }

    case "draw": {
      const top = topDeckCard(s)
      if (!top) return { ...s, message: "The deck is empty." }
      const faceUp = a.playerId === "you" ? true : s.openOpponents
      return {
        ...s,
        cards: update(s, top.id, { zone: { type: "hand", playerId: a.playerId }, faceUp }),
        message: `${nameOf(s, a.playerId)} draws a card.`,
      }
    }

    case "collect": {
      const inPlay = playCards(s)
      if (inPlay.length === 0) return s
      const cards = s.cards.map((c) =>
        c.zone.type === "play" ? { ...c, zone: { type: "discard" as const }, faceUp: true } : c,
      )
      return { ...s, cards, message: "Trick collected." }
    }

    case "nextTurn":
      return { ...s, turn: (s.turn + 1) % s.players.length }

    case "reshuffle": {
      const reshuffled = shuffle(
        s.cards.map((c) => ({ ...c, zone: { type: "deck" as const }, faceUp: false })),
      )
      return {
        ...s,
        cards: reshuffled,
        turn: 0,
        round: s.round + 1,
        sips: Object.fromEntries(s.players.map((p) => [p.id, 0])),
        message: "Reshuffled. Deal to begin the next round.",
      }
    }

    default:
      return s
  }
}

function nameOf(s: DemoState, pid: string) {
  return s.players.find((p) => p.id === pid)?.name ?? pid
}
