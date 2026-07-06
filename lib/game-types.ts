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
  /** Real profile image URL from social logins */
  avatarUrl?: string
}

/** Where a card currently lives. Drives shared-layout animations. */
export type CardZone =
  | { type: "deck" }
  | { type: "hand"; playerId: string }
  | { type: "play1"; playerId?: string }
  | { type: "play2"; playerId?: string }
  | { type: "discard" }
  | { type: "pot" }

export interface CardState extends CardData {
  zone: CardZone
}
