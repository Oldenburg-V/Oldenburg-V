import type { CardData } from "./deck"

export type StatTone = "default" | "gold" | "crimson" | "gem"

export interface PlayerStat {
  label: string
  value: string | number
  tone?: StatTone
}

export interface PlayerInfo {
  id: string
  name: string
  /** The local player, seated at the bottom. */
  isYou?: boolean
  /** Short status line, e.g. "Betting", "Waiting", "Bus Driver". */
  status?: string
  /** Small stat chips shown on the seat, e.g. sips, score, lives. */
  stats?: PlayerStat[]
  /** Optional accent color seed for the avatar. */
  accent?: StatTone
  /** Marks a player as eliminated / folded. */
  out?: boolean
}

/** Where a card currently lives. Drives shared-layout animations. */
export type CardZone =
  | { type: "deck" }
  | { type: "hand"; playerId: string }
  | { type: "play"; playerId?: string }
  | { type: "discard" }

export interface CardState extends CardData {
  zone: CardZone
}
