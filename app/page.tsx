"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import {
  Users,
  Sparkles,
  Layers,
  LogIn,
  LogOut,
  Copy,
  Check,
  Plus,
  Play,
  ArrowRight,
  Globe,
  Lock,
  Code,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation, getCookie, setCookie } from "@/lib/i18n"
import { supabase } from "@/lib/supabase"
import { cn } from "@/lib/utils"
import type { RealtimeChannel } from "@supabase/supabase-js"

interface MockUser {
  name: string
  avatar: string
  provider: string
  avatarUrl?: string
}

interface LobbyPlayer {
  name: string
  isYou: boolean
  ready: boolean
  isHost?: boolean
  isBot?: boolean
  avatarUrl?: string | null
}

interface DbLobby {
  id?: string
  code: string
  name: string
  host_name: string
  players_count: number
  status: string
}

const MOCK_LOBBIES: DbLobby[] = [
  { code: "OL5-882", name: "Felt Tavern", host_name: "Auron", players_count: 3, status: "waiting" },
  { code: "OL5-194", name: "High Stakes", host_name: "Vex", players_count: 2, status: "waiting" },
  { code: "OL5-742", name: "Gold Palace", host_name: "Dorn", players_count: 1, status: "waiting" },
]

export default function HomePage() {
  const { locale, setLocale, t } = useTranslation()
  const router = useRouter()

  // Authentication State
  const [user, setUser] = useState<MockUser | null>(null)
  const [isLoadingAuth, setIsLoadingAuth] = useState<string | null>(null)

  // Email Auth State
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSignUp, setIsSignUp] = useState(false)
  const [authMsg, setAuthMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Real Lobbies lists from DB (with fallback state)
  const [lobbies, setLobbies] = useState<DbLobby[]>([])
  const [dbError, setDbError] = useState<boolean>(false)
  const [showSqlGuide, setShowSqlGuide] = useState<boolean>(false)

  // Matchmaking states
  const [lobbyCode, setLobbyCode] = useState("")
  const [activeLobby, setActiveLobby] = useState<DbLobby | null>(null)
  const [lobbyPlayers, setLobbyPlayers] = useState<LobbyPlayer[]>([])
  const [localBots, setLocalBots] = useState<LobbyPlayer[]>([])
  const [isCopied, setIsCopied] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [isReady, setIsReady] = useState(false)

  // Game settings states
  const [selectedGame, setSelectedGame] = useState("busfahren")
  const [busRoundLength, setBusRoundLength] = useState("short")
  const [busPunishmentCards, setBusPunishmentCards] = useState(5)
  const [busPunishmentPlayers, setBusPunishmentPlayers] = useState(1)

  const BOT_NAMES = ["Auron", "Vex", "Merlin", "Cogsworth", "Bruno", "Kára", "Dorn", "Solène"]

  // Realtime channel reference
  const channelRef = useRef<RealtimeChannel | null>(null)

  // SQL instructions for user dashboard setup
  const SQL_GUIDE_TEXT = `-- 1. Create the lobbies table in your Supabase SQL Editor:
create table if not exists public.lobbies (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  name text not null,
  host_name text not null,
  players_count int default 1,
  status text default 'waiting', -- 'waiting', 'playing'
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Real-time synchronization for the lobbies table:
alter publication supabase_realtime add table lobbies;

-- 3. Enable Row-Level Security (RLS) and add public gaming policies:
alter table public.lobbies enable row level security;

create policy "Allow public read access to lobbies"
  on public.lobbies for select to anon, authenticated using (true);

create policy "Allow public to create lobbies"
  on public.lobbies for insert to anon, authenticated with check (true);

create policy "Allow public to update lobbies"
  on public.lobbies for update to anon, authenticated using (true) with check (true);

create policy "Allow public to delete lobbies"
  on public.lobbies for delete to anon, authenticated using (true);`

  // 1. Initial mounting & Session loading
  useEffect(() => {
    // Detect OAuth errors redirected back from Supabase (e.g. bad client secret)
    const params = new URLSearchParams(window.location.search)
    const oauthError = params.get("error_description") || params.get("error")
    if (oauthError) {
      setAuthMsg({ type: "error", text: decodeURIComponent(oauthError.replace(/\+/g, " ")) })
      // Clean the ugly error URL immediately
      window.history.replaceState(null, "", window.location.pathname)
    }

    // Check Supabase Auth state first
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const metadata = session.user.user_metadata
        const fullName = metadata?.custom_claims?.global_name || metadata?.global_name || metadata?.full_name || metadata?.name || "Player"
        const firstName = fullName.split(" ")[0] // Grab first name
        setUser({
          name: firstName,
          avatar: firstName[0].toUpperCase(),
          provider: session.user.app_metadata.provider || "anonymous",
          avatarUrl: metadata?.avatar_url || metadata?.picture || undefined,
        })
      } else {
        // Fallback to legacy cookie user
        const saved = getCookie("preferred_user")
        if (saved) {
          try {
            setUser(JSON.parse(saved))
          } catch (e) {}
        }
      }
    })

    // Listen to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const metadata = session.user.user_metadata
        const fullName = metadata?.custom_claims?.global_name || metadata?.global_name || metadata?.full_name || metadata?.name || "Player"
        const firstName = fullName.split(" ")[0] // Grab first name
        const loggedUser = {
          name: firstName,
          avatar: firstName[0].toUpperCase(),
          provider: session.user.app_metadata.provider || "anonymous",
          avatarUrl: metadata?.avatar_url || metadata?.picture || undefined,
        }
        setUser(loggedUser)
        setCookie("preferred_user", JSON.stringify(loggedUser))

        // Clean up the #access_token hash from the URL so it's not visible
        if (event === "SIGNED_IN" && window.location.hash.includes("access_token")) {
          window.history.replaceState(null, "", window.location.pathname)
        }
      } else if (event === "SIGNED_OUT") {
        setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // 2. Fetch active lobbies from database
  const fetchLobbies = async () => {
    try {
      const { data, error } = await supabase
        .from("lobbies")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: false })

      if (error) {
        throw error
      }
      setLobbies(data || [])
      setDbError(false)
    } catch (e) {
      console.warn("Lobbies table not setup in database yet. Falling back to mocks.", e)
      setLobbies(MOCK_LOBBIES)
      setDbError(true)
    }
  };

  useEffect(() => {
    fetchLobbies()

    // Subscribe to DB changes for lobbies list (Realtime publication)
    const dbChannel = supabase
      .channel("public-lobbies-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lobbies" },
        () => {
          fetchLobbies()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(dbChannel)
    }
  }, [])

  // 3. Process invite links: ?lobby=OL5-XXX
  useEffect(() => {
    if (!user) return
    const params = new URLSearchParams(window.location.search)
    const code = params.get("lobby") || params.get("join")
    if (code) {
      const codeClean = code.toUpperCase()
      setLobbyCode(codeClean)
      handleJoinLobby(codeClean, user)
      // Clean query params so user doesn't get stuck joining on refresh
      window.history.replaceState({}, document.title, window.location.pathname)
    }
  }, [user])

  // 4. Realtime Matchmaking Room subscriptions
  useEffect(() => {
    if (!activeLobby || !user) return

    // Create presence and broadcast channel
    const chan = supabase.channel(`lobby-room:${activeLobby.code}`, {
      config: { presence: { key: user.name } },
    })

    channelRef.current = chan

    // Sync presence to build player list
    chan.on("presence", { event: "sync" }, () => {
      const state = chan.presenceState()
      const playersMap = new Map<string, LobbyPlayer>()

      Object.values(state)
        .flat()
        .forEach((p: any) => {
          if (p.name) {
            playersMap.set(p.name, {
              name: p.name,
              isYou: p.name === user.name,
              ready: p.ready || false,
              isHost: p.isHost || false,
              isBot: false,
              avatarUrl: p.avatarUrl || null,
            })
          }

          // Add their bots if any
          if (p.bots && Array.isArray(p.bots)) {
            p.bots.forEach((b: any) => {
              if (b.name) {
                playersMap.set(b.name, {
                  name: b.name,
                  isYou: false,
                  ready: b.ready || false,
                  isHost: false,
                  isBot: true,
                  avatarUrl: null,
                })
              }
            })
          }
        })

      const players = Array.from(playersMap.values())

      // Check if there is currently a host in the presence list
      const hostExists = players.some((p) => p.isHost)

      // If there are players, but NO host exists (e.g. host just left)
      if (players.length > 0 && !hostExists) {
        const humanPlayers = players.filter((p) => !p.isBot)
        if (humanPlayers.length > 0) {
          humanPlayers.sort((a, b) => a.name.localeCompare(b.name))
          const designatedHost = humanPlayers[0]

          if (designatedHost.name === user.name) {
            // I take over as host!
            const isHost = true
            chan.track({
              name: user.name,
              avatar: user.avatar,
              ready: true, // Host is ready by default
              isHost,
              avatarUrl: user.avatarUrl || null,
              bots: localBots.map((b) => ({ name: b.name, ready: b.ready, isBot: true })),
            })

            if (!dbError) {
              supabase
                .from("lobbies")
                .update({ host_name: user.name })
                .eq("code", activeLobby.code)
                .then(() => {
                  setActiveLobby((prev) => prev ? { ...prev, host_name: user.name } : null)
                })
            }
          }
        }
      }

      // Check if host updated in presence
      const currentHost = players.find((p) => p.isHost)
      if (currentHost && activeLobby && activeLobby.host_name !== currentHost.name) {
        setActiveLobby((prev) => prev ? { ...prev, host_name: currentHost.name } : null)
      }

      // Extract settings from the host (if we are a guest)
      const hostPresence = Object.values(state).flat().find((p: any) => p.isHost)
      if (hostPresence && hostPresence.settings && activeLobby.host_name !== user.name) {
        const s = hostPresence.settings
        setSelectedGame(s.game)
        setBusRoundLength(s.roundLength)
        setBusPunishmentCards(s.punishmentCards)
        setBusPunishmentPlayers(s.punishmentPlayers)
      }

      // Sort: Host always first
      players.sort((a, b) => (b.isHost ? 1 : 0) - (a.isHost ? 1 : 0))
      setLobbyPlayers(players)

      // Auto update active players list to cookies for table loader
      setCookie(
        "active_players",
        JSON.stringify(players.map((p) => ({ name: p.name, avatarUrl: p.avatarUrl })))
      )
    })

    // Listen to host triggers to launch game
    chan.on("broadcast", { event: "start_game" }, () => {
      setCountdown(3)
    })

    // Listen to kick player event
    chan.on("broadcast", { event: "kick_player" }, ({ payload }) => {
      if (payload?.name === user.name) {
        handleLeaveLobby()
        alert(t("kickedAlert"))
      }
    })

    // Subscribe to channel
    chan.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        const isHost = activeLobby.host_name === user.name
        await chan.track({
          name: user.name,
          avatar: user.avatar,
          ready: isHost, // Host is ready by default
          isHost,
          avatarUrl: user.avatarUrl || null,
          bots: localBots.map((b) => ({ name: b.name, ready: b.ready, isBot: true })),
          settings: isHost ? {
            game: selectedGame,
            roundLength: busRoundLength,
            punishmentCards: busPunishmentCards,
            punishmentPlayers: busPunishmentPlayers,
          } : null,
        })
      }
    })

    return () => {
      chan.unsubscribe()
      channelRef.current = null
    }
  }, [activeLobby, user])

  // 5. Auto-countdown router to felt table
  useEffect(() => {
    if (countdown === null) return
    if (countdown <= 0) {
      router.push("/play")
      return
    }
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000)
    return () => clearTimeout(timer)
  }, [countdown, router])

  // Handles logins using Supabase Social OAuth
  async function handleLogin(provider: "discord") {
    setIsLoadingAuth(provider)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider === "apple" ? "apple" : provider as any,
        options: {
          redirectTo: window.location.origin,
        },
      })
      if (error) throw error
    } catch (e) {
      console.warn(`Supabase OAuth failed for ${provider}. Falling back to anonymous/mock login.`, e)
      // Fallback local auth if Supabase has config errors
      const names = { google: "Galahad", github: "Octocat", apple: "Cupertino", discord: "Wumpus" }
      const name = names[provider] || "Player"
      try {
        const { error: anonError } = await supabase.auth.signInAnonymously({
          options: {
            data: { name, avatar: name[0] },
          },
        })
        if (anonError) throw anonError
      } catch (ae) {
        const mock: MockUser = {
          name,
          avatar: name[0].toUpperCase(),
          provider,
        }
        setUser(mock)
        setCookie("preferred_user", JSON.stringify(mock))
      }
    } finally {
      setIsLoadingAuth(null)
    }
  }

  // Handles email and password sign-in/up
  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !password) return
    setIsLoadingAuth("email")
    setAuthMsg(null)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: email.split("@")[0],
              avatar: email[0].toUpperCase(),
            },
          },
        })
        if (error) throw error
        setAuthMsg({
          type: "success",
          text:
            locale === "de"
              ? "Registrierung erfolgreich! Überprüfe deine E-Mails zur Bestätigung."
              : "Sign up successful! Please check your email for confirmation.",
        })
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        if (error) throw error
      }
    } catch (err: any) {
      setAuthMsg({ type: "error", text: err.message })
    } finally {
      setIsLoadingAuth(null)
    }
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
    setActiveLobby(null)
    setCountdown(null)
    setCookie("preferred_user", "", -1)
  }

  // Create lobby
  async function handleCreateLobby() {
    if (!user) return
    const randomCode = `OL5-${Math.floor(100 + Math.random() * 900)}`
    const lobbyName = `${user.name}'s Table`

    const newLobby: DbLobby = {
      code: randomCode,
      name: lobbyName,
      host_name: user.name,
      players_count: 1,
      status: "waiting",
    }

    // Try to save to Supabase DB (ignore if database table is missing)
    if (!dbError) {
      await supabase.from("lobbies").insert(newLobby)
    }

    setActiveLobby(newLobby)
    setIsReady(true)
  }

  // Join lobby
  async function handleJoinLobby(code: string, activeUser?: MockUser | null) {
    const targetUser = activeUser || user
    if (!targetUser) return

    const codeClean = code.trim().toUpperCase()
    if (!codeClean) return

    // Query DB for this lobby if operational
    let matched: DbLobby | undefined
    if (!dbError) {
      const { data } = await supabase.from("lobbies").select("*").eq("code", codeClean).single()
      if (data) matched = data
    }

    if (!matched) {
      matched = lobbies.find((l) => l.code === codeClean)
    }

    const lobbyToJoin = matched || {
      code: codeClean,
      name: `Table ${codeClean}`,
      host_name: "Auron",
      players_count: 2,
      status: "waiting",
    }

    // Increment player count in DB
    if (!dbError && matched?.id) {
      await supabase
        .from("lobbies")
        .update({ players_count: (matched.players_count || 1) + 1 })
        .eq("id", matched.id)
    }

    setActiveLobby(lobbyToJoin)
    setIsReady(false)
  }

  // Ready State Toggler
  async function handleToggleReady() {
    if (!channelRef.current || !user || !activeLobby) return
    const nextReady = !isReady
    setIsReady(nextReady)

    // Update presence metadata state
    await channelRef.current.track({
      name: user.name,
      avatar: user.avatar,
      ready: nextReady,
      isHost: activeLobby.host_name === user.name,
      avatarUrl: user.avatarUrl || null,
    })
  }

  // Helper to track presence
  const trackMyPresence = async (
    readyVal: boolean,
    botsVal: LobbyPlayer[],
    gameVal?: string,
    roundLengthVal?: string,
    punishmentCardsVal?: number,
    punishmentPlayersVal?: number
  ) => {
    if (!channelRef.current || !user || !activeLobby) return
    const isHost = activeLobby.host_name === user.name
    await channelRef.current.track({
      name: user.name,
      avatar: user.avatar,
      ready: readyVal,
      isHost,
      avatarUrl: user.avatarUrl || null,
      bots: botsVal.map((b) => ({ name: b.name, ready: b.ready, isBot: true })),
      settings: isHost ? {
        game: gameVal ?? selectedGame,
        roundLength: roundLengthVal ?? busRoundLength,
        punishmentCards: punishmentCardsVal ?? busPunishmentCards,
        punishmentPlayers: punishmentPlayersVal ?? busPunishmentPlayers,
      } : null,
    })
  }

  // Leave Lobby
  async function handleLeaveLobby() {
    if (activeLobby && !dbError) {
      const { data } = await supabase.from("lobbies").select("*").eq("code", activeLobby.code).single()
      if (data) {
        // Find other human players in the lobby room
        const otherHumans = lobbyPlayers.filter(p => !p.isYou && !p.isBot)
        
        if (data.host_name === user?.name && otherHumans.length === 0) {
          // Delete lobby if I am the host and no other humans are left
          await supabase.from("lobbies").delete().eq("id", data.id)
        } else {
          // If I am the host and others are left, promote the next human player
          let nextHostName = data.host_name
          if (data.host_name === user?.name && otherHumans.length > 0) {
            otherHumans.sort((a, b) => a.name.localeCompare(b.name))
            nextHostName = otherHumans[0].name
          }
          
          await supabase
            .from("lobbies")
            .update({
              host_name: nextHostName,
              players_count: Math.max(1, data.players_count - 1)
            })
            .eq("id", data.id)
        }
      }
    }
    setActiveLobby(null)
    setCountdown(null)
    setIsReady(false)
    setLocalBots([]) // Clear bots on leave
  }

  // Add Bot
  function handleAddBot() {
    if (!activeLobby || !user) return
    const usedNames = new Set(lobbyPlayers.map((p) => p.name))
    const available = BOT_NAMES.filter((n) => !usedNames.has(n))
    if (!available.length || lobbyPlayers.length >= 10) return
    const botName = available[0]
    const newBot: LobbyPlayer = { name: botName, isYou: false, ready: true, isBot: true }
    const updatedBots = [...localBots, newBot]
    setLocalBots(updatedBots)
    
    // Update presence track with new bots list
    const isHost = activeLobby.host_name === user.name
    trackMyPresence(isHost || isReady, updatedBots)
  }

  // Remove Bot
  function handleRemoveBot(botName: string) {
    const updated = localBots.filter((b) => b.name !== botName)
    setLocalBots(updated)
    const isHost = activeLobby.host_name === user.name
    trackMyPresence(isHost || isReady, updated)
  }

  // Kick Player (human or bot)
  async function handleKickPlayer(playerName: string, isBotFlag?: boolean) {
    if (!activeLobby || !user) return
    
    if (isBotFlag) {
      handleRemoveBot(playerName)
    } else {
      if (channelRef.current) {
        await channelRef.current.send({
          type: "broadcast",
          event: "kick_player",
          payload: { name: playerName },
        })
      }
    }
  }

  // Settings Handlers
  const handleGameChange = (game: string) => {
    setSelectedGame(game)
    trackMyPresence(true, localBots, game, busRoundLength, busPunishmentCards, busPunishmentPlayers)
  }

  const handleRoundLengthChange = (length: string) => {
    setBusRoundLength(length)
    trackMyPresence(true, localBots, selectedGame, length, busPunishmentCards, busPunishmentPlayers)
  }

  const handlePunishmentCardsChange = (cards: number) => {
    setBusPunishmentCards(cards)
    trackMyPresence(true, localBots, selectedGame, busRoundLength, cards, busPunishmentPlayers)
  }

  const handlePunishmentPlayersChange = (players: number) => {
    setBusPunishmentPlayers(players)
    trackMyPresence(true, localBots, selectedGame, busRoundLength, busPunishmentCards, players)
  }

  // Host starts the game: Broadcasts "start_game" trigger to everyone in the room
  async function handleHostStartGame() {
    if (!channelRef.current || !activeLobby) return

    // Bake final player list (humans + bots) into cookie before launch
    setCookie(
      "active_players",
      JSON.stringify(lobbyPlayers.map((p) => ({ name: p.name, avatarUrl: p.avatarUrl || null })))
    )

    // Bake final game settings into cookie before launch
    setCookie(
      "game_settings",
      JSON.stringify({
        selectedGame,
        busRoundLength,
        busPunishmentCards,
        busPunishmentPlayers,
      })
    )

    // Update state to "playing" in database
    if (!dbError) {
      await supabase.from("lobbies").update({ status: "playing" }).eq("code", activeLobby.code)
    }

    // Broadcast launch
    await channelRef.current.send({
      type: "broadcast",
      event: "start_game",
      payload: {},
    })

    setCountdown(3)
  }

  // Copies the invite link to clipboard
  function handleCopyInvite() {
    if (!activeLobby) return
    const inviteUrl = `${window.location.origin}/?lobby=${activeLobby.code}`
    navigator.clipboard.writeText(inviteUrl)
    setIsCopied(true)
    setTimeout(() => setIsCopied(false), 2000)
  }

  return (
    <main className="relative min-h-[100dvh] flex flex-col justify-between overflow-hidden table-vignette text-foreground">
      {/* Top Header Toolbar */}
      <header className="w-full flex items-center justify-between px-6 py-4 border-b border-white/5 bg-black/20 backdrop-blur-sm z-10 select-none">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.png"
            alt="Oldenburg V crest"
            width={34}
            height={34}
            priority
            className="drop-shadow-[0_0_10px_oklch(0.78_0.13_82_/_0.3)]"
          />
          <h1 className="font-display text-lg font-bold tracking-widest text-primary uppercase">
            Oldenburg V
          </h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Language Switcher */}
          <Button
            size="sm"
            variant="outline"
            onClick={() => setLocale(locale === "en" ? "de" : "en")}
            aria-label={t("preferredLang")}
            className="font-mono text-xs uppercase h-8 px-2.5"
          >
            <Globe className="size-3.5 mr-1 text-primary/80" />
            {locale === "en" ? "DE" : "EN"}
          </Button>

          {/* User profile info & logout */}
          {user && (
            <div className="flex items-center gap-2.5 pl-2.5 border-l border-white/10">
              {user.avatarUrl ? (
                <img
                  src={user.avatarUrl}
                  alt={user.name}
                  className="size-7 rounded-full object-cover border border-primary/40 shadow-[0_0_8px_oklch(0.78_0.13_82_/_0.2)]"
                />
              ) : (
                <div className="flex size-7 items-center justify-center rounded-full bg-primary/25 border border-primary/40 font-display text-xs font-bold text-primary shadow-[0_0_8px_oklch(0.78_0.13_82_/_0.2)]">
                  {user.avatar}
                </div>
              )}
              <span className="hidden sm:inline text-xs font-semibold text-foreground/95">
                {user.name}
              </span>
              <button
                onClick={handleLogout}
                className="text-muted-foreground hover:text-primary transition-colors text-xs ml-1 flex items-center gap-1 font-medium cursor-pointer"
                title={t("logout")}
              >
                <LogOut className="size-3.5" />
                <span className="hidden md:inline">{t("logout")}</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Panel Content Container */}
      <section className="flex-1 flex flex-col items-center justify-center p-6 z-10 min-h-0">
        
        {/* Supabase Schema Installation banner (Developer Alert) */}
        {dbError && !activeLobby && (
          <div className="max-w-2xl w-full mb-6 rounded-xl border border-dashed border-amber-500/25 bg-amber-500/5 p-4 text-left backdrop-blur-sm animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-500 font-mono text-xs font-bold uppercase tracking-wider">
                <Code className="size-4" />
                Database setup instructions
              </div>
              <button
                onClick={() => setShowSqlGuide(!showSqlGuide)}
                className="text-xs font-semibold text-primary underline hover:text-primary-foreground cursor-pointer"
              >
                {showSqlGuide ? "Hide SQL" : "Show SQL Code"}
              </button>
            </div>
             <p className="text-[10px] text-muted-foreground mt-1 leading-relaxed">
              Your app is currently running in <strong>local offline demo mode</strong>. To enable production database synchronization, open your Supabase dashboard SQL editor and execute the schema commands below.
              <br />
              <strong className="text-amber-500">Authentication Note:</strong> Make sure to enable <strong>Anonymous Sign-ins</strong> in your Supabase console under <strong>Authentication ➔ Providers ➔ Anonymous</strong> so users can authenticate.
            </p>
            {showSqlGuide && (
              <pre className="mt-3 overflow-x-auto rounded bg-black/60 p-3 text-[9px] font-mono text-amber-400/90 border border-white/5 select-all">
                {SQL_GUIDE_TEXT}
              </pre>
            )}
          </div>
        )}

        {!user ? (
          /* SOCIAL LOGIN PORTAL */
          <div className="max-w-md w-full rounded-2xl border border-white/10 bg-black/60 p-8 shadow-2xl backdrop-blur-md text-center animate-in fade-in zoom-in-95 duration-300">
            <div className="relative mx-auto mb-6 w-20 h-20 rounded-2xl border border-white/10 shadow-2xl flex items-center justify-center bg-black/40 overflow-hidden">
              <Lock className="size-8 text-primary animate-pulse" />
            </div>
            <h2 className="font-display text-2xl font-bold tracking-widest text-primary uppercase mb-2">
              {t("loginTitle")}
            </h2>
            <p className="text-sm text-muted-foreground mb-8 max-w-xs mx-auto leading-relaxed">
              {t("loginSubtitle")}
            </p>

            <div className="space-y-3.5">
              {/* Discord Button */}
              <button
                disabled={isLoadingAuth !== null}
                onClick={() => handleLogin("discord")}
                className="w-full flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold hover:bg-white/10 hover:border-white/20 transition-all active:scale-98 disabled:opacity-40 cursor-pointer hover:text-[#5865F2] hover:border-[#5865F2]/30"
              >
                {isLoadingAuth === "discord" ? (
                  <div className="size-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                ) : (
                  <svg className="size-4.5 fill-current" viewBox="0 0 127.14 96.36">
                    <path d="M107.7,8.07A105.15,105.15,0,0,0,77.26,0a77.19,77.19,0,0,0-3.3,6.83A96.67,96.67,0,0,0,53.22,6.83,77.19,77.19,0,0,0,49.88,0,105.15,105.15,0,0,0,19.44,8.07C3.66,31.58-1.86,54.65,1,77.53A105.73,105.73,0,0,0,32,96.36a77.7,77.7,0,0,0,6.63-10.85,68.43,68.43,0,0,1-10.5-5c.88-.65,1.72-1.34,2.51-2a75.58,75.58,0,0,0,73,0c.79.71,1.63,1.4,2.51,2a68.43,68.43,0,0,1-10.5,5A77.7,77.7,0,0,0,95.14,85.51a105.73,105.73,0,0,0,31-18.83C129,54.65,122.94,31.58,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53S36.18,40.36,42.45,40.36,53.84,46,53.84,53,48.72,65.69,42.45,65.69Zm42.24,0C78.42,65.69,73.24,60,73.24,53S78.42,40.36,84.69,40.36,96.08,46,96.08,53,91,65.69,84.69,65.69Z" />
                  </svg>
                )}
                {t("continueWithDiscord")}
              </button>
              
              <div className="flex items-center gap-3 py-3">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[9px] font-mono text-muted-foreground uppercase tracking-widest">
                  OR
                </span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <form onSubmit={handleEmailAuth} className="space-y-3.5 text-left">
                {authMsg && (
                  <div
                    className={cn(
                      "p-3 rounded-lg text-xs leading-normal border",
                      authMsg.type === "success"
                        ? "bg-green-500/10 border-green-500/20 text-green-400"
                        : "bg-red-500/10 border-red-500/20 text-red-400"
                    )}
                  >
                    {authMsg.text}
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    {t("email")}
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/30 transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-bold">
                    {t("password")}
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/30 transition-colors"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isLoadingAuth !== null}
                  className="w-full h-10 mt-1 flex items-center justify-center gap-2 text-xs"
                >
                  {isLoadingAuth === "email" ? (
                    <div className="size-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                  ) : (
                    <LogIn className="size-4" />
                  )}
                  {isSignUp ? t("signUp") : t("signIn")}
                </Button>

                <div className="text-center pt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setIsSignUp(!isSignUp)
                      setAuthMsg(null)
                    }}
                    className="text-[10px] font-semibold text-primary/80 hover:text-primary-foreground transition-colors cursor-pointer underline"
                  >
                    {isSignUp ? t("haveAccount") : t("needAccount")}
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : !activeLobby ? (
          /* LOBBY DASHBOARD SCREEN */
          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8 items-start animate-in fade-in zoom-in-95 duration-300">
            
            {/* Actions Card (Create / Join) */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-6">
              <h2 className="font-display text-xl font-bold tracking-wider text-primary uppercase pb-3 border-b border-white/5 flex items-center gap-2">
                <Users className="size-5 text-primary/80" />
                {t("lobbyDashboard")}
              </h2>

              <div className="flex flex-col gap-2">
                <Button
                  onClick={handleCreateLobby}
                  size="lg"
                  className="w-full flex items-center justify-center gap-2"
                >
                  <Plus className="size-4.5" />
                  {t("createLobby")}
                </Button>
                <p className="text-[10px] text-muted-foreground text-center font-mono">
                  Generates an OL5 table room code instantly
                </p>
              </div>

              <div className="flex items-center gap-3 py-1">
                <div className="h-px bg-white/10 flex-1" />
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  OR
                </span>
                <div className="h-px bg-white/10 flex-1" />
              </div>

              <div className="flex flex-col gap-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-mono">
                  {t("joinLobby")}
                </h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder={t("enterLobbyCode")}
                    value={lobbyCode}
                    onChange={(e) => setLobbyCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-black/40 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-mono text-foreground focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/60 transition-colors uppercase"
                  />
                  <Button
                    onClick={() => handleJoinLobby(lobbyCode)}
                    disabled={!lobbyCode.trim()}
                    className="flex items-center gap-1.5 px-5 shrink-0"
                  >
                    {t("joinBtn")}
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Lobby Browser List */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-6 md:p-8 shadow-2xl backdrop-blur-md flex flex-col gap-5 h-full">
              <h2 className="font-display text-xl font-bold tracking-wider text-primary uppercase pb-3 border-b border-white/5 flex items-center gap-2">
                <Globe className="size-5 text-primary/80" />
                {t("lobbyBrowserTitle")}
              </h2>

              <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                {lobbies.length > 0 ? (
                  lobbies.map((lobby) => (
                    <div
                      key={lobby.code}
                      className="flex items-center justify-between p-3.5 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary tracking-wider animate-pulse">
                            {lobby.code}
                          </span>
                          <span className="text-xs font-medium text-foreground/80">
                            {lobby.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-mono">
                          <span>
                            {t("host")}: <strong className="text-foreground/70">{lobby.host_name}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            {t("players")}: {lobby.players_count}/8
                          </span>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleJoinLobby(lobby.code)}
                        className="h-8 px-3 text-xs"
                      >
                        {t("joinBtn")}
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground font-mono italic text-center py-4">
                    {t("noActiveLobbies")}
                  </p>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* ACTIVE LOBBY ROOM (2-COLUMN GRID) */
          <div className="max-w-4xl w-full grid md:grid-cols-2 gap-6 items-stretch animate-in fade-in zoom-in-95 duration-300">
            
            {/* Left Column: Player Selection & Lobby List */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4 justify-between">
              <div>
                {/* Header: Code & Copy Link on One Line */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex flex-col text-left">
                    <span className="text-[9px] font-mono uppercase tracking-widest text-primary/80">
                      {t("lobbyTitle")}
                    </span>
                    <h2 className="font-mono text-xl font-bold tracking-widest text-primary leading-none mt-0.5">
                      {activeLobby.code}
                    </h2>
                  </div>

                  <button
                    onClick={handleCopyInvite}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold hover:bg-white/10 hover:border-white/20 transition-all text-muted-foreground hover:text-foreground active:scale-95 cursor-pointer"
                  >
                    {isCopied ? (
                      <>
                        <Check className="size-3.5 text-green-500" />
                        <span className="text-green-400 font-mono text-[10px]">{t("copied")}</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5" />
                        <span className="font-mono text-[10px]">{t("copyInvite")}</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Condensed Players List (Fixed space for 10) */}
                <div className="space-y-2.5 py-3">
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground/75 font-bold">
                    {t("players")} ({lobbyPlayers.length}/10)
                  </h3>
                  
                  <div className="space-y-1.5 min-h-[340px] max-h-[340px] overflow-y-auto pr-1">
                    {/* Render active players/bots */}
                    {lobbyPlayers.map((player, idx) => (
                      <div
                        key={idx}
                        className={cn(
                          "flex items-center justify-between p-1.5 px-3 rounded-xl border transition-colors",
                          player.isYou
                            ? "border-primary/20 bg-primary/5"
                            : "border-white/5 bg-white/5"
                        )}
                      >
                        <div className="flex items-center gap-2.5">
                          {player.avatarUrl ? (
                            <img
                              src={player.avatarUrl}
                              alt={player.name}
                              className="size-5.5 rounded-full object-cover border border-primary/20 shadow-md"
                            />
                          ) : (
                            <div
                              className={cn(
                                "flex size-5.5 items-center justify-center rounded-full text-[9px] font-bold font-display shadow-md",
                                player.isYou
                                  ? "bg-primary/20 border border-primary/40 text-primary"
                                  : "bg-white/10 border border-white/20 text-muted-foreground"
                              )}
                            >
                              {player.name[0].toUpperCase()}
                            </div>
                          )}
                          <span
                            className={cn(
                              "text-xs font-semibold",
                              player.isYou ? "text-foreground" : "text-foreground/80"
                            )}
                          >
                            {player.name}
                            {player.isYou && (
                              <span className="ml-1.5 text-[9px] font-mono text-primary/80 uppercase px-1 py-0.5 rounded border border-primary/20 bg-primary/5">
                                YOU
                              </span>
                            )}
                            {player.isHost && (
                              <span className="ml-1 text-[9px] font-mono text-muted-foreground/60 uppercase">
                                (Host)
                              </span>
                            )}
                            {player.isBot && (
                              <span className="ml-1 text-[9px] font-mono text-blue-400/80 uppercase px-1 py-0.5 rounded border border-blue-400/20 bg-blue-400/5">
                                BOT
                              </span>
                            )}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-[9px] font-mono font-semibold select-none shadow-sm",
                              player.ready
                                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                                : "bg-amber-500/10 border border-amber-500/20 text-amber-400"
                            )}
                          >
                            {player.ready ? t("ready") : t("notReady")}
                          </div>

                          {/* Kick player button (Host only, cannot kick self) */}
                          {activeLobby.host_name === user.name && !player.isYou && (
                            <button
                              onClick={() => handleKickPlayer(player.name, player.isBot)}
                              className="text-xs font-semibold text-red-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors cursor-pointer"
                              title={t("remove")}
                            >
                              <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                              </svg>
                            </button>
                          )}
                        </div>
                      </div>
                    ))}

                    {/* Placeholder empty slots up to 10 */}
                    {Array.from({ length: Math.max(0, 10 - lobbyPlayers.length) }).map((_, idx) => (
                      <div
                        key={`empty-${idx}`}
                        className="flex items-center justify-between p-1.5 px-3 rounded-xl border border-dashed border-white/5 bg-white/2"
                      >
                        <div className="flex items-center gap-2.5 opacity-30">
                          <div className="flex size-5.5 items-center justify-center rounded-full border border-dashed border-white/40 text-[9px] font-bold font-mono">
                            {lobbyPlayers.length + idx + 1}
                          </div>
                          <span className="text-[11px] font-semibold tracking-wide text-foreground/50">
                            Empty Seat
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Lobby Action Buttons */}
              <div className="pt-3 border-t border-white/5 flex flex-col gap-2">
                {countdown !== null ? (
                  <div className="w-full text-center py-2 rounded-xl border border-primary/20 bg-primary/5 text-primary text-sm font-semibold tracking-wider font-mono animate-pulse shadow-[0_0_15px_oklch(0.78_0.13_82_/_0.15)]">
                    {t("gameStartingIn", { count: countdown })}
                  </div>
                ) : (
                  <div className="flex gap-2">
                    {/* Host Actions: Inline buttons row */}
                    {activeLobby.host_name === user.name ? (
                      <>
                        {lobbyPlayers.length < 10 && (
                          <Button
                            variant="outline"
                            onClick={handleAddBot}
                            className="flex-1 text-[11px] h-9 gap-1 border-blue-400/20 text-blue-300 hover:bg-blue-400/10 hover:border-blue-400/40"
                          >
                            <svg className="size-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="11" width="18" height="10" rx="2"/>
                              <circle cx="12" cy="5" r="2"/>
                              <path d="M12 7v4M8 15h.01M16 15h.01"/>
                            </svg>
                            Bot
                          </Button>
                        )}
                        
                        <Button
                          variant="outline"
                          onClick={handleLeaveLobby}
                          className="flex-1 text-[11px] h-9"
                        >
                          {t("leaveLobby")}
                        </Button>

                        <Button
                          onClick={handleHostStartGame}
                          disabled={lobbyPlayers.length < 2}
                          className="flex-1 text-[11px] h-9 gap-1.5"
                        >
                          <Play className="size-3.5" />
                          {t("startGame")} ({lobbyPlayers.length})
                        </Button>
                      </>
                    ) : (
                      <>
                        {/* Guest Actions */}
                        <Button
                          variant="outline"
                          onClick={handleLeaveLobby}
                          className="flex-1 text-[11px] h-9"
                        >
                          {t("leaveLobby")}
                        </Button>

                        <Button
                          onClick={handleToggleReady}
                          className="flex-1 text-[11px] h-9 gap-1.5"
                        >
                          <Sparkles className="size-3.5 animate-pulse" />
                          {isReady ? t("notReady") : t("ready")}
                        </Button>
                      </>
                    )}
                  </div>
                )}

                {activeLobby.host_name !== user.name && countdown === null && (
                  <p className="text-[10px] text-muted-foreground text-center font-mono italic">
                    {t("waitingForHost")}
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: Game Selection & Settings */}
            <div className="rounded-2xl border border-white/10 bg-black/60 p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4 justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-widest text-primary font-bold mb-4 pb-2 border-b border-white/5">
                  {t("gameSettingsTitle")}
                </h3>

                {/* Game Selector */}
                <div className="space-y-1.5 mb-5">
                  <label className="text-[10px] font-mono uppercase text-muted-foreground">
                    {t("selectGame")}
                  </label>
                  <select
                    disabled={activeLobby.host_name !== user.name}
                    value={selectedGame}
                    onChange={(e) => handleGameChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60 cursor-pointer"
                  >
                    <option value="busfahren">{t("busfahren")} (Card Game)</option>
                    <option value="pferderennen">{t("pferderennen")} (Horse Race - Mock)</option>
                  </select>
                </div>

                {/* Specific Settings for Busfahren */}
                {selectedGame === "busfahren" && (
                  <div className="space-y-4">
                    {/* Round Length (Short vs Long) */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-mono uppercase text-muted-foreground">
                        {t("roundLength")}
                      </label>
                      <select
                        disabled={activeLobby.host_name !== user.name}
                        value={busRoundLength}
                        onChange={(e) => handleRoundLengthChange(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-primary/50 disabled:opacity-60 cursor-pointer"
                      >
                        <option value="short">{t("short")}</option>
                        <option value="long">{t("long")}</option>
                      </select>
                    </div>

                    {/* Punishment Cards (Busfahren) */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase">
                        <span className="text-muted-foreground">{t("punishmentCards")}</span>
                        <span className="text-primary font-bold">{busPunishmentCards} Cards</span>
                      </div>
                      <input
                        type="range"
                        min="3"
                        max="10"
                        disabled={activeLobby.host_name !== user.name}
                        value={busPunishmentCards}
                        onChange={(e) => handlePunishmentCardsChange(Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-40"
                      />
                    </div>

                    {/* Punishment Players Count */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-[10px] font-mono uppercase">
                        <span className="text-muted-foreground">{t("punishmentPlayers")}</span>
                        <span className="text-primary font-bold">{busPunishmentPlayers} Player(s)</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="3"
                        disabled={activeLobby.host_name !== user.name}
                        value={busPunishmentPlayers}
                        onChange={(e) => handlePunishmentPlayersChange(Number(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-40"
                      />
                    </div>
                  </div>
                )}

                {/* Settings for Pferderennen */}
                {selectedGame === "pferderennen" && (
                  <p className="text-[11px] text-muted-foreground italic py-4">
                    Settings for Pferderennen will be available when implemented.
                  </p>
                )}
              </div>

              {/* Status Hint */}
              <div className="text-[10px] font-mono italic text-muted-foreground/60 text-center border-t border-white/5 pt-3">
                {activeLobby.host_name === user.name
                  ? "You are hosting. Guests can see your settings live."
                  : "Settings are read-only. Only the Host can modify them."}
              </div>
            </div>

          </div>
        )}
      </section>

      {/* Footer copyright */}
      <footer className="w-full text-center py-4 border-t border-white/5 bg-black/10 select-none">
        <p className="text-[10px] text-muted-foreground font-mono tracking-wider">
          © {new Date().getFullYear()} Oldenburg V Table. All Rights Reserved.
        </p>
      </footer>
    </main>
  )
}
