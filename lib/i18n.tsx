"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

export type Locale = "en" | "de"

export const TRANSLATIONS = {
  en: {
    title: "Oldenburg V",
    sandboxDemo: "Sandbox Demo",
    round: "Round",
    turn: "Turn",
    you: "YOU",
    playing: "Playing…",
    inRound: "In the round",
    ready: "Ready",
    draw: "Draw",
    table1: "Table 1",
    table2: "Table 2",
    discard: "Discard",
    pot: "Pot",
    bet: "Bet",
    addBet: "Add Bet",
    playHere: "Play here",
    select: "Select",
    select1: "Select 1",
    select2: "Select 2",
    deal: "Deal",
    collect: "Collect",
    endTurn: "End turn",
    reshuffle: "Reshuffle",
    resetTable: "Reset table",
    shuffling: "Shuffling Deck...",
    distributeSips: "Distribute Sips!",
    redCardSips: "You played a Red Card! Select who takes the remaining {{count}} sips.",
    opponentPlaysRed: "{{name}} plays a Red Card! They distribute {{count}} sips.",
    opponentPlaysBlack: "{{name}} plays a Black Card! They take {{count}} sips.",
    emptyHand: "Your hand is empty — draw a card.",
    dealToReceive: "Deal to receive your hand.",
    mute: "Mute",
    unmute: "Unmute",
    fullscreen: "Toggle fullscreen",
    numPlayers: "Number of players",
    preferredLang: "Language",
    playingCard: "Card",
    faceDown: "face down",
    hand: "Hand",
    sips: "Sips",
    loginTitle: "Login to Oldenburg V",
    loginSubtitle: "Choose a social provider to enter the table.",
    continueWithGoogle: "Continue with Google",
    continueWithGitHub: "Continue with GitHub",
    continueWithApple: "Continue with Apple",
    continueWithDiscord: "Continue with Discord",
    lobbyDashboard: "Lobby Dashboard",
    logout: "Logout",
    createLobby: "Create a Lobby",
    joinLobby: "Join a Lobby",
    enterLobbyCode: "Enter lobby code...",
    joinBtn: "Join",
    lobbyBrowserTitle: "Lobby Browser",
    activeLobbies: "Active Lobbies",
    lobbyCode: "Lobby Code",
    host: "Host",
    players: "Players",
    noActiveLobbies: "No active lobbies found.",
    copyInvite: "Copy Invite Link",
    copied: "Copied!",
    notReady: "Waiting",
    startGame: "Start Game",
    leaveLobby: "Leave Lobby",
    waitingForHost: "Waiting for Host to start...",
    gameStartingIn: "Starting in {{count}}s...",
    lobbyTitle: "Lobby Room",
    email: "Email Address",
    password: "Password",
    signIn: "Sign In",
    signUp: "Sign Up",
    needAccount: "Need an account? Sign Up",
    haveAccount: "Already have an account? Sign In",
    addBot: "Add Bot",
    addBotHint: "You can fill empty seats with bots",
    remove: "Remove",
    kickedAlert: "You have been removed from the lobby.",
    gameSettingsTitle: "Game Selection & Settings",
    selectGame: "Select Game",
    busfahren: "Busfahren",
    pferderennen: "Pferderennen",
    roundLength: "Round Length",
    short: "Short (Skip Haltestelle, 1-4 Sips)",
    long: "Long (With Haltestelle, 1 Sip each)",
    punishmentCards: "Punishment Cards",
    punishmentPlayers: "Punishment Players Count",
  },
  de: {
    title: "Oldenburg V",
    sandboxDemo: "Sandbox-Demo",
    round: "Runde",
    turn: "Zug",
    you: "DU",
    playing: "Spielt…",
    inRound: "In der Runde",
    ready: "Bereit",
    draw: "Ziehen",
    table1: "Tisch 1",
    table2: "Tisch 2",
    discard: "Ablagestapel",
    pot: "Pot",
    bet: "Setzen",
    addBet: "Erhöhen",
    playHere: "Hier spielen",
    select: "Auswählen",
    select1: "Wähle 1",
    select2: "Wähle 2",
    deal: "Geben",
    collect: "Einsammeln",
    endTurn: "Zug beenden",
    reshuffle: "Mischen",
    resetTable: "Zurücksetzen",
    shuffling: "Karten werden gemischt...",
    distributeSips: "Schlucke verteilen!",
    redCardSips: "Du hast eine rote Karte gespielt! Bestimme, wer die verbleibenden {{count}} Schlucke trinkt.",
    opponentPlaysRed: "{{name}} spielt eine rote karte! Er/Sie verteilt {{count}} Schlucke.",
    opponentPlaysBlack: "{{name}} spielt eine schwarze Karte! Er/Sie trinkt {{count}} Schlucke.",
    emptyHand: "Deine Hand ist leer — ziehe eine Karte.",
    dealToReceive: "Gib Karten aus, um deine Hand zu erhalten.",
    mute: "Stummschalten",
    unmute: "Ton an",
    fullscreen: "Vollbild umschalten",
    numPlayers: "Spieleranzahl",
    preferredLang: "Sprache",
    playingCard: "Karte",
    faceDown: "verdeckt",
    hand: "Hand",
    sips: "Schlucke",
    loginTitle: "Bei Oldenburg V anmelden",
    loginSubtitle: "Wähle einen Anbieter, um dem Tisch beizutreten.",
    continueWithGoogle: "Weiter mit Google",
    continueWithGitHub: "Weiter mit GitHub",
    continueWithApple: "Weiter mit Apple",
    continueWithDiscord: "Weiter mit Discord",
    lobbyDashboard: "Lobby-Dashboard",
    logout: "Abmelden",
    createLobby: "Lobby erstellen",
    joinLobby: "Lobby beitreten",
    enterLobbyCode: "Code eingeben...",
    joinBtn: "Beitreten",
    lobbyBrowserTitle: "Lobby-Browser",
    activeLobbies: "Aktive Lobbys",
    lobbyCode: "Lobby-Code",
    host: "Ersteller",
    players: "Spieler",
    noActiveLobbies: "Keine aktiven Lobbys gefunden.",
    copyInvite: "Einladungslink kopieren",
    copied: "Kopiert!",
    notReady: "Wartet",
    startGame: "Spiel starten",
    leaveLobby: "Lobby verlassen",
    waitingForHost: "Warte auf Spielstart durch Host...",
    gameStartingIn: "Start in {{count}}s...",
    lobbyTitle: "Lobbyraum",
    email: "E-Mail-Adresse",
    password: "Passwort",
    signIn: "Anmelden",
    signUp: "Registrieren",
    needAccount: "Noch kein Konto? Registrieren",
    haveAccount: "Bereits ein Konto? Anmelden",
    addBot: "Bot hinzufügen",
    addBotHint: "Freie Plätze mit Bots füllen",
    remove: "Entfernen",
    kickedAlert: "Du wurdest aus der Lobby entfernt.",
    gameSettingsTitle: "Spielauswahl & Einstellungen",
    selectGame: "Spiel auswählen",
    busfahren: "Busfahren",
    pferderennen: "Pferderennen",
    roundLength: "Rundenlänge",
    short: "Kurz (Keine Haltestelle, 1-4 Schlucke)",
    long: "Lang (Mit Haltestelle, je 1 Schluck)",
    punishmentCards: "Strafkarten (Busfahren)",
    punishmentPlayers: "Strafteilnehmer (Busfahrer)",
  }
}

interface LanguageContextProps {
  locale: Locale
  setLocale: (l: Locale) => void
  t: (key: keyof typeof TRANSLATIONS.en, replace?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextProps | undefined>(undefined)

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) return parts.pop()?.split(";").shift() ?? null
  return null
}

export function setCookie(name: string, value: string, days = 365) {
  if (typeof document === "undefined") return
  const date = new Date()
  date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000)
  document.cookie = `${name}=${value};path=/;expires=${date.toUTCString()};SameSite=Lax`
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en")

  useEffect(() => {
    // 1. Check Cookie first
    const saved = getCookie("preferred_lang") as Locale | null
    if (saved === "en" || saved === "de") {
      setLocaleState(saved)
    } else {
      // 2. Fallback to client browser language
      const browserLang = navigator.language.slice(0, 2).toLowerCase()
      if (browserLang === "de") {
        setLocaleState("de")
      }
    }
  }, [])

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale)
    setCookie("preferred_lang", newLocale)
  }

  const t = (key: keyof typeof TRANSLATIONS.en, replace?: Record<string, string | number>): string => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en
    let val = dict[key] || TRANSLATIONS.en[key] || String(key)
    if (replace) {
      Object.entries(replace).forEach(([k, v]) => {
        val = val.replace(`{{${k}}}`, String(v))
      })
    }
    return val
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useTranslation() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useTranslation must be used within a LanguageProvider")
  }
  return context
}
