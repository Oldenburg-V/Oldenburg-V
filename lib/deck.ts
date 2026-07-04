// Card engine — models a German-suited deck backed by the Oldenburg V card art.

export type Suit = "herz" | "karo" | "kreuz" | "pik"
export type Rank =
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "bube"
  | "dame"
  | "koenig"
  | "ass"

export interface CardData {
  /** Stable unique id used as the Framer Motion layoutId for shared animations. */
  id: string
  suit: Suit
  rank: Rank
  faceUp: boolean
}

export const SUITS: Suit[] = ["herz", "karo", "kreuz", "pik"]
export const RANKS: Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "bube",
  "dame",
  "koenig",
  "ass",
]

export const SUIT_SYMBOL: Record<Suit, string> = {
  herz: "♥",
  karo: "♦",
  kreuz: "♣",
  pik: "♠",
}

export const SUIT_LABEL: Record<Suit, string> = {
  herz: "Hearts",
  karo: "Diamonds",
  kreuz: "Clubs",
  pik: "Spades",
}

export const RANK_LABEL: Record<Rank, string> = {
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  bube: "J",
  dame: "Q",
  koenig: "K",
  ass: "A",
}

/** Numeric ordering value, useful for game logic (higher/lower demos). */
export const RANK_VALUE: Record<Rank, number> = {
  "2": 2,
  "3": 3,
  "4": 4,
  "5": 5,
  "6": 6,
  "7": 7,
  "8": 8,
  "9": 9,
  "10": 10,
  bube: 11,
  dame: 12,
  koenig: 13,
  ass: 14,
}

export function isRed(suit: Suit): boolean {
  return suit === "herz" || suit === "karo"
}

/** Path to the SVG face art for a card. */
export function faceSrc(card: Pick<CardData, "suit" | "rank">): string {
  return `/cards/faces/${card.suit}_${card.rank}.svg`
}

export type CardBack = "ol5" | "hollan"

export function backSrc(back: CardBack = "ol5"): string {
  return `/cards/backs/${back}.jpg`
}

/** Build a fresh ordered deck. `decks` > 1 stacks multiple copies (e.g. 104 cards). */
export function buildDeck(decks = 1, faceUp = false): CardData[] {
  const cards: CardData[] = []
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) {
      for (const rank of RANKS) {
        cards.push({ id: `${suit}_${rank}_${d}`, suit, rank, faceUp })
      }
    }
  }
  return cards
}

/** Fisher–Yates shuffle returning a new array. Optional seed for reproducibility. */
export function shuffle<T>(input: T[], seed?: number): T[] {
  const arr = [...input]
  let rng = seed !== undefined ? mulberry32(seed) : Math.random
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function mulberry32(a: number): () => number {
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
