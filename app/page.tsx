import Image from "next/image"
import Link from "next/link"
import { Layers, Users, Sparkles, LayoutGrid, EyeOff, Trophy } from "lucide-react"
import { Button } from "@/components/ui/button"

const FEATURES = [
  {
    icon: Users,
    title: "N players, any device",
    body: "Seat 2–8 players around a responsive table. Your hand sits at the bottom; everyone else fans around the felt.",
  },
  {
    icon: EyeOff,
    title: "Open or closed cards",
    body: "Flip hands face-up or keep them hidden per game. A 3D flip animation sells every reveal.",
  },
  {
    icon: LayoutGrid,
    title: "Central & personal zones",
    body: "A shared play surface for tricks and stacks, plus per-player areas for melds, bets, and captured cards.",
  },
  {
    icon: Sparkles,
    title: "Fluid card motion",
    body: "Spring-based deal, draw, and play animations powered by shared-layout transitions — cards travel, never teleport.",
  },
  {
    icon: Trophy,
    title: "Turn & stat HUD",
    body: "Live turn indicator, sip counters, points, and hand sizes rendered as glowing seat chips.",
  },
  {
    icon: Layers,
    title: "Reusable framework",
    body: "Drop the GameTable, DeckStack, and CardFan primitives into any card or dice game you build next.",
  },
]

export default function HomePage() {
  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      {/* ambient glows */}
      <div className="pointer-events-none absolute -left-40 top-0 size-[36rem] rounded-full bg-primary/10 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 size-[32rem] rounded-full bg-accent/10 blur-[120px]" />

      <section className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pt-16 pb-12 text-center sm:pt-24">
        <Image
          src="/logo.png"
          alt="Oldenburg V crest"
          width={180}
          height={180}
          priority
          className="drop-shadow-[0_0_35px_oklch(0.55_0.2_25/0.45)]"
        />
        <p className="mt-6 font-mono text-xs uppercase tracking-[0.35em] text-primary">
          The Card &amp; Dice Table
        </p>
        <h1 className="mt-3 text-balance font-display text-5xl font-bold leading-tight sm:text-7xl">
          Oldenburg V
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground">
          A web platform for playing simple card and dice games with friends. One device per player,
          beautiful animations, and a framework that adapts to however many players sit down.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg">
            <Link href="/play">
              <Sparkles className="size-4" aria-hidden />
              Enter the table
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href="#features">See features</Link>
          </Button>
        </div>
      </section>

      <section id="features" className="relative mx-auto max-w-6xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <article
              key={f.title}
              className="group rounded-xl border border-border/60 bg-card/60 p-6 backdrop-blur transition-colors hover:border-primary/50"
            >
              <div className="mb-4 inline-flex size-11 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 text-primary">
                <f.icon className="size-5" aria-hidden />
              </div>
              <h2 className="font-display text-xl font-semibold text-foreground">{f.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </article>
          ))}
        </div>

        <div className="mt-12 flex justify-center">
          <Button asChild size="lg">
            <Link href="/play">
              <Layers className="size-4" aria-hidden />
              Play the demo
            </Link>
          </Button>
        </div>
      </section>
    </main>
  )
}
