'use client'

import { cn } from '@/lib/utils'
import type { DashboardSnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowRight,
  Bell,
  Camera,
  Crown,
  Flame,
  Gamepad2,
  Gift,
  MessageCircle,
  Mic,
  Palette,
  Radio,
  Search,
  Send,
  Sparkles,
  Star,
  Trophy,
  Users,
  Video,
} from 'lucide-react'

interface DashboardShowcaseProps {
  onNavigate: (tab: string) => void
  onOpenGame: (roomId?: string) => void
  data?: DashboardSnapshot
}

const storytellers = [
  { name: 'Mia', accent: 'from-fuchsia-500 to-violet-500' },
  { name: 'Rex', accent: 'from-cyan-500 to-sky-500' },
  { name: 'Nova', accent: 'from-pink-500 to-rose-500' },
  { name: 'Kira', accent: 'from-violet-500 to-indigo-500' },
  { name: 'Axel', accent: 'from-amber-400 to-orange-500' },
]

const liveChats = [
  { room: 'Chat Global', note: '125 mensajes activos', accent: 'text-cyan-300', badge: '125' },
  { room: 'Team Vikings', note: 'Torneo esta noche', accent: 'text-fuchsia-300', badge: '8' },
  { room: 'Duo Nocturno', note: 'Invitacion a partida', accent: 'text-violet-300', badge: '3' },
  { room: 'Sala de Voz', note: '5 personas conectadas', accent: 'text-amber-300', badge: 'EN' },
  { room: 'Card Masters', note: 'Nuevo regalo recibido', accent: 'text-cyan-300', badge: '12' },
]

const topMetrics = [
  { label: 'Puntos', value: '13', hint: 'Cada corazon vale 1' },
  { label: 'Victorias', value: '1,248', hint: 'Temporada actual' },
  { label: 'ELO', value: '2,350', hint: 'Competitivo' },
]

const activeRooms = [
  { id: 'alex-room', name: 'Sala de AlexKing', players: '3/4', cta: 'Entrar' },
  { id: 'duelo-rapido', name: 'Duelo Rapido', players: '2/2', cta: 'Lleno' },
  { id: 'sala-torneo', name: 'Sala de Torneo', players: '4/4', cta: 'Lleno' },
  { id: 'partida-casual', name: 'Partida Casual', players: '1/4', cta: 'Entrar' },
]

const chatFeed = [
  { user: 'Charlie', text: 'Buena suerte a todos' },
  { user: 'Mia', text: 'La reina cae esta ronda' },
  { user: 'AlexKing', text: 'Tu turno en 5 segundos' },
  { user: 'SamuraiQ', text: 'Voy por ese combo' },
]

const deckStyles = ['Nebula', 'Arcade', 'Aurora', 'Obsidian', 'Neon Ink', 'Royal Gold']

const mobileQuickActions = [
  { title: 'Chats', note: '125 mensajes activos', icon: MessageCircle, tab: 'chat', badge: '125' },
  { title: 'Salas', note: '4 mesas encendidas', icon: Gamepad2, tab: 'games', badge: '4' },
  { title: 'Live', note: 'Stream destacado ahora', icon: Radio, tab: 'live', badge: 'ON' },
  { title: 'Card Lab', note: '6 estilos listos', icon: Palette, tab: 'customize', badge: 'LAB' },
]

function PanelTitle({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="text-[0.65rem] font-semibold uppercase tracking-[0.34em] text-violet-300/70">
          REY30VERSE
        </p>
        <h3 className="mt-1 text-xl font-semibold text-white">{title}</h3>
        {subtitle ? <p className="mt-1 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  )
}

function TinyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/5 px-4 py-3">
      <p className="text-[0.7rem] uppercase tracking-[0.28em] text-zinc-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  )
}

function isWarmCard(value: string) {
  return value.includes('♥') || value.includes('♦')
}

function PreviewPlayingCard({
  value,
  className,
}: {
  value: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-[1.35rem] border bg-white font-bold shadow-[0_14px_40px_rgba(0,0,0,0.32)]',
        isWarmCard(value) ? 'border-red-200 text-rose-500' : 'border-white/20 text-slate-900',
        className
      )}
    >
      {value}
    </div>
  )
}

export function DashboardShowcase({ onNavigate, onOpenGame, data }: DashboardShowcaseProps) {
  const stories = data?.storytellers ?? storytellers
  const chats = data?.liveChats ?? liveChats
  const metrics = data?.topMetrics ?? topMetrics
  const rooms = data?.activeRooms ?? activeRooms
  const feed = data?.chatFeed ?? chatFeed
  const styles = data?.deckStyles ?? deckStyles
  const tractionSessions = data?.traction.sessions ?? '9.4K'
  const tractionDelta = data?.traction.delta ?? '+18%'
  const timeline = data?.timeline ?? [
    'Completar lobby competitivo',
    'Pulir chat y regalos',
    'Cerrar editor de cartas',
  ]
  const featuredStream = data?.featuredStream ?? {
    hostName: 'AlexKing',
    hostInitials: 'AK',
    title: 'AlexKing esta transmitiendo en vivo',
    subtitle: 'Evento: ronda clasica de corazones',
    viewers: '2.9K',
    comments: '78',
    reactions: '342',
    highlightCards: ['A♠', '10♥', 'K♣', 'Q♦'],
  }
  const dashboardProfile = data?.profile ?? {
    displayName: 'AlexRey30',
    username: '@rey30verse',
    bio: 'Gamer, streamer y creador del card lab.',
    following: '1.2K',
    followers: '25.8K',
    loves: '345K',
    statusItems: [
      'Desarrollando la experiencia premium',
      'Transmitiendo roadmap del producto',
      'Curando mazos para el marketplace',
    ],
  }
  const table = data?.table ?? {
    roomName: 'Sala de AlexKing',
    top: { name: 'MariaGamer', initials: 'MG', scoreLabel: '5/13' },
    left: { name: 'Charlie', initials: 'CH', scoreLabel: '5/13' },
    right: { name: 'SamuraiQ', initials: 'SQ', scoreLabel: '6/13' },
    bottom: { name: 'AlexKing', initials: 'AK', scoreLabel: 'Tu turno', statusLabel: 'Tu turno' },
    centerCards: ['J♥', 'Q♠', '3♦'],
    handCards: ['A♥', '10♦', 'K♣', 'J♦', 'Q♠'],
    zoom: '72%',
    cardSize: '64%',
    darkMode: 'On',
  }

  const tableActionButtons = [
    { icon: Mic, label: 'Chat', onClick: () => onNavigate('chat') },
    { icon: Radio, label: 'Live', onClick: () => onNavigate('live') },
    { icon: Sparkles, label: 'Card Lab', onClick: () => onNavigate('customize') },
  ]

  return (
    <>
      <div className="space-y-5 pb-28 lg:hidden">
        <section className="surface-panel surface-panel-strong surface-accent rounded-[1.85rem] p-5">
          <div className="relative z-10 space-y-5">
            <Badge className="status-chip border-0 bg-transparent px-0 py-0 text-xs font-medium shadow-none">
              <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
              Ecosistema activo
            </Badge>

            <div className="space-y-3">
              <p className="brand-display text-xs uppercase text-violet-300/80">Rey30 Studio</p>
              <h1 className="brand-display bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-[2.15rem] leading-[0.92] font-black text-transparent sm:text-[2.55rem]">
                REY30VERSE
              </h1>
              <p className="text-lg text-zinc-300">
                Plataforma social gaming con chats, salas, streaming, torneos y editor de cartas en una sola vista premium.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {['SOCIAL', 'STREAMING', 'SALAS', 'TORNEOS', 'CARD LAB'].map((chip) => (
                <span key={chip} className="status-chip px-3 py-2 text-xs tracking-[0.16em]">
                  {chip}
                </span>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => onOpenGame()}
                className="h-12 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-6 text-base font-semibold text-white hover:opacity-90"
              >
                Entrar a la mesa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate('live')}
                className="h-12 rounded-full border-violet-400/20 bg-[#120c20]/70 px-6 text-base text-zinc-100 hover:bg-violet-500/10"
              >
                <Radio className="mr-2 h-4 w-4 text-pink-300" />
                Ver stream
              </Button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="surface-glow rounded-[1.55rem] border border-violet-400/[0.15] bg-[#100b1c]/80 p-4">
                <p className="text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500">Traccion</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-4xl font-bold text-white">{tractionSessions}</p>
                    <p className="text-sm text-emerald-300">sesiones activas ahora</p>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/[0.12] px-3 py-2 text-right text-xs text-emerald-300">
                    {tractionDelta}
                    <br />
                    esta semana
                  </div>
                </div>
              </div>

              <div className="surface-glow rounded-[1.55rem] border border-white/[0.08] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[0.7rem] uppercase tracking-[0.3em] text-zinc-500">Timeline</p>
                    <p className="mt-2 text-xl font-semibold text-white">Sesion de hoy</p>
                  </div>
                  <Sparkles className="h-5 w-5 text-fuchsia-300" />
                </div>
                <div className="mt-4 space-y-2">
                  {timeline.map((item) => (
                    <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-2">
                      <span className="h-2 w-2 rounded-full bg-cyan-300" />
                      <span className="text-sm text-zinc-200">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid grid-cols-2 gap-3">
          {mobileQuickActions.map((action) => {
            const Icon = action.icon
            return (
              <button
                key={action.title}
                onClick={() => onNavigate(action.tab)}
                className="surface-panel rounded-[1.45rem] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.08]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-white">
                    <Icon className="h-5 w-5" />
                  </div>
                  <Badge className="rounded-full border-0 bg-violet-500/[0.18] px-2 py-1 text-[0.68rem] text-violet-100">
                    {action.badge}
                  </Badge>
                </div>
                <p className="mt-4 text-lg font-semibold text-white">{action.title}</p>
                <p className="mt-1 text-sm text-zinc-400">{action.note}</p>
              </button>
            )
          })}
        </section>

        <section className="surface-panel rounded-[1.75rem] p-5">
          <PanelTitle
            title="Pulso Social"
            subtitle="Feed, historias y stream destacado en una lectura"
            action={<Bell className="h-4 w-4 text-zinc-400" />}
          />

          <div className="mt-5 space-y-4">
            <div className="flex items-center gap-3 rounded-[1.25rem] border border-violet-400/10 bg-[#120c20] px-4 py-3">
              <Avatar className="h-10 w-10 border border-violet-400/30">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  R3
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-sm text-zinc-400">Que estas pensando, jugador?</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('chat')}
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                Publicar
              </Button>
            </div>

            <div className="flex gap-3 overflow-x-auto pb-1">
              {stories.map((story) => (
                <div key={story.name} className="min-w-[68px] text-center">
                  <div className={cn('mx-auto h-14 w-14 rounded-[1.1rem] bg-gradient-to-br p-[2px]', story.accent)}>
                    <div className="flex h-full w-full items-center justify-center rounded-[1rem] bg-[#120c20] text-base font-semibold text-white">
                      {story.name.slice(0, 1)}
                    </div>
                  </div>
                  <p className="mt-2 text-[0.68rem] tracking-[0.14em] text-zinc-400">{story.name}</p>
                </div>
              ))}
            </div>

            <div className="rounded-[1.6rem] border border-violet-400/[0.12] bg-gradient-to-br from-[#121935] via-[#0f1330] to-[#13102c] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <Avatar className="h-11 w-11 border border-violet-400/30">
                    <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white">
                      AK
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-white">{featuredStream.hostName} esta transmitiendo</p>
                    <p className="text-sm text-zinc-400">{featuredStream.subtitle}</p>
                  </div>
                </div>
                <Badge className="rounded-full border-0 bg-red-500/90 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-white">
                  Live
                </Badge>
              </div>

              <div className="mt-4 rounded-[1.4rem] border border-cyan-400/10 bg-[#0a1634]/90 p-4">
                <div className="h-40 rounded-[1.15rem] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.18),transparent_32%),linear-gradient(180deg,rgba(255,83,217,0.18),rgba(12,10,24,0.35))]" />
                <div className="mt-4 flex items-center justify-between text-sm text-zinc-300">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-300" />
                    {featuredStream.reactions}
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-cyan-300" />
                    {featuredStream.comments} comentarios
                  </span>
                  <span className="flex items-center gap-2 text-fuchsia-300">
                    <Gift className="h-4 w-4" />
                    Regalar
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[1.75rem] p-5">
          <PanelTitle
            title="GameHub"
            subtitle="Puntos, salas activas y acceso rapido"
            action={<Crown className="h-5 w-5 text-amber-300" />}
          />

          <div className="mt-5 grid grid-cols-3 gap-2">
            {metrics.map((metric) => (
              <div key={metric.label} className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-3">
                <p className="text-[0.62rem] uppercase tracking-[0.24em] text-zinc-500">{metric.label}</p>
                <p className="mt-2 text-2xl font-semibold text-white">{metric.value}</p>
                <p className="mt-1 text-xs text-zinc-400">{metric.hint}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 space-y-3">
            {rooms.map((room) => (
              <div key={room.name} className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{room.name}</p>
                    <p className="text-sm text-zinc-400">{room.players} jugadores conectados</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      if (room.cta === 'Entrar') {
                        onOpenGame(room.id)
                      }
                    }}
                    disabled={room.cta !== 'Entrar'}
                    className={cn(
                      'rounded-full px-4',
                      room.cta === 'Entrar'
                        ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-800'
                    )}
                  >
                    {room.cta}
                  </Button>
                </div>
              </div>
            ))}

            <Button
              onClick={() => onNavigate('games')}
              className="w-full rounded-[1.25rem] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-6 text-base font-semibold text-white hover:opacity-90"
            >
              Ver salas y torneos
            </Button>
          </div>
        </section>

        <section className="surface-panel rounded-[1.75rem] p-5">
          <PanelTitle
            title="Mesa Central"
            subtitle="Preview compacto de la partida activa"
            action={
              <Button
                variant="outline"
                onClick={() => onOpenGame()}
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                Abrir
              </Button>
            }
          />

          <div className="mt-5 table-stage min-h-[24rem] p-4">
            <div className="flex items-center justify-between gap-2">
              <div className="status-chip px-3 py-2 text-xs">
                <Gift className="h-4 w-4 text-fuchsia-300" />
                {table.roomName}
              </div>
              <div className="flex gap-2">
                {tableActionButtons.map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    aria-label={label}
                    className="rounded-full border border-white/10 bg-white/[0.08] p-2.5 text-zinc-200 transition hover:bg-white/[0.14]"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-5 min-h-[13rem]">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 text-center">
                <Avatar className="mx-auto h-10 w-10 border border-violet-300/[0.25]">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    {table.top.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-1 text-xs font-medium text-white">{table.top.name}</p>
              </div>

              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-center">
                <Avatar className="mx-auto h-10 w-10 border border-cyan-300/20">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-sky-500 text-white">
                    {table.left.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-1 text-xs font-medium text-white">{table.left.name}</p>
              </div>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-center">
                <Avatar className="mx-auto h-10 w-10 border border-fuchsia-300/20">
                  <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white">
                    {table.right.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-1 text-xs font-medium text-white">{table.right.name}</p>
              </div>

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <Avatar className="mx-auto h-10 w-10 border border-emerald-300/20">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                    {table.bottom.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-1 text-xs font-medium text-white">{table.bottom.name}</p>
                <p className="text-[0.68rem] text-emerald-300">{table.bottom.statusLabel ?? table.bottom.scoreLabel}</p>
              </div>

              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-2">
                {table.centerCards.map((value, index) => (
                  <PreviewPlayingCard
                    key={value}
                    className={cn(
                      'h-24 w-16 text-2xl shadow-[0_14px_40px_rgba(0,0,0,0.35)]',
                      index === 1
                        ? 'translate-y-2 rotate-[-2deg] border-violet-300'
                        : index === 0
                          ? 'rotate-[-9deg]'
                          : 'rotate-[9deg]'
                    )}
                    value={value}
                  />
                ))}
              </div>
            </div>

            <div className="mt-5 grid grid-cols-4 gap-2">
              {table.handCards.slice(0, 4).map((value, index) => (
                <PreviewPlayingCard
                  key={value}
                  className={cn(
                    'h-24 text-2xl',
                    index === 3
                      ? 'border-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.55)]'
                      : undefined
                  )}
                  value={value}
                />
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-300">Zoom de mesa</span>
                <span className="text-white">{table.zoom}</span>
              </div>
              <div className="mt-3 h-2 rounded-full bg-white/[0.08]">
                <div className="h-full w-[72%] rounded-full bg-gradient-to-r from-violet-500 to-cyan-400" />
              </div>
            </div>

            <div className="rounded-[1.25rem] border border-white/[0.08] bg-[#0f0b1a] p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="font-medium text-white">Chat de mesa</p>
                <Flame className="h-4 w-4 text-fuchsia-300" />
              </div>
              <div className="space-y-2">
                {feed.slice(0, 2).map((entry) => (
                  <div key={`${entry.user}-${entry.text}`} className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <span className="text-sm font-medium text-violet-200">{entry.user}: </span>
                    <span className="text-sm text-zinc-200">{entry.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[1.75rem] p-5">
          <PanelTitle
            title="Perfil + Card Lab"
            subtitle="Progreso del creador y biblioteca visual"
            action={<Palette className="h-5 w-5 text-fuchsia-300" />}
          />

          <div className="mt-5 rounded-[1.6rem] border border-violet-400/[0.12] bg-[#0b0a16] p-4">
            <div className="rounded-[1.45rem] bg-gradient-to-br from-cyan-500/[0.25] via-violet-500/30 to-fuchsia-500/[0.25] p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-16 w-16 border-2 border-white/[0.15]">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-xl text-white">
                    R3
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xl font-semibold text-white">{dashboardProfile.displayName}</p>
                  <p className="text-sm text-violet-200">{dashboardProfile.username}</p>
                  <p className="mt-2 text-sm text-zinc-200">{dashboardProfile.bio}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <TinyStat label="Siguiendo" value={dashboardProfile.following} />
              <TinyStat label="Seguidores" value={dashboardProfile.followers} />
              <TinyStat label="Loves" value={dashboardProfile.loves} />
            </div>

            <div className="mt-4 rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] p-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-white">Biblioteca visual</p>
                <Badge className="rounded-full border-0 bg-violet-500/[0.18] px-2 py-1 text-[0.68rem] text-violet-100">
                  6 estilos
                </Badge>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {styles.map((style) => (
                  <div
                    key={style}
                    className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.18] to-cyan-500/[0.14] px-2 py-4 text-center text-[0.68rem] font-medium tracking-[0.12em] text-zinc-100"
                  >
                    {style}
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <Button
                onClick={() => onNavigate('customize')}
                className="w-full rounded-[1.25rem] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-6 text-base font-semibold text-white hover:opacity-90"
              >
                Abrir Card Lab
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate('profile')}
                className="w-full rounded-[1.25rem] border-violet-400/20 bg-violet-500/10 py-6 text-base font-semibold text-violet-100 hover:bg-violet-500/20"
              >
                Ver perfil
              </Button>
            </div>
          </div>
        </section>
      </div>

      <div className="hidden space-y-6 pb-6 lg:block">
        <section className="surface-panel surface-panel-strong surface-accent rounded-[2rem] p-6 lg:p-8">
          <div className="relative z-10 grid gap-8 lg:grid-cols-[1.3fr_0.95fr] lg:items-end">
            <div className="space-y-6">
              <Badge className="status-chip border-0 bg-transparent px-0 py-0 text-xs font-medium shadow-none">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(74,222,128,0.9)]" />
              Ecosistema activo
            </Badge>

            <div className="space-y-4">
              <p className="brand-display text-sm uppercase text-violet-300/80">Rey30 Studio</p>
              <h1 className="max-w-3xl text-4xl font-black leading-none text-white sm:text-5xl xl:text-6xl">
                <span className="brand-display bg-gradient-to-r from-white via-violet-200 to-fuchsia-300 bg-clip-text text-transparent">
                  REY30VERSE
                </span>
              </h1>
              <p className="max-w-2xl text-lg text-zinc-300 sm:text-xl">
                Plataforma social gaming con chats, salas, streaming, torneos y editor de cartas en una sola vista premium.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              {['SOCIAL', 'STREAMING', 'SALAS', 'TORNEOS', 'CARD LAB'].map((chip) => (
                <span key={chip} className="status-chip text-sm tracking-[0.18em]">
                  {chip}
                </span>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => onOpenGame()}
                className="h-12 rounded-full bg-gradient-to-r from-violet-500 via-fuchsia-500 to-cyan-400 px-6 text-base font-semibold text-white hover:opacity-90"
              >
                Entrar a la mesa
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                onClick={() => onNavigate('live')}
                className="h-12 rounded-full border-violet-400/20 bg-[#120c20]/70 px-6 text-base text-zinc-100 hover:bg-violet-500/10"
              >
                <Radio className="mr-2 h-4 w-4 text-pink-300" />
                Ver stream
              </Button>
            </div>
          </div>

          <div className="grid gap-4">
            <div className="surface-glow rounded-[1.75rem] border border-violet-400/[0.15] bg-[#100b1c]/80 p-5">
              <p className="text-[0.72rem] uppercase tracking-[0.32em] text-zinc-500">Traccion</p>
              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <p className="text-3xl font-bold text-white">{tractionSessions}</p>
                  <p className="text-sm text-emerald-300">sesiones activas ahora</p>
                </div>
                <div className="rounded-2xl bg-emerald-500/[0.12] px-3 py-2 text-right text-xs text-emerald-300">
                  {tractionDelta}
                  <br />
                  esta semana
                </div>
              </div>
            </div>

            <div className="surface-glow rounded-[1.75rem] border border-white/[0.08] bg-white/[0.04] p-5 sm:col-span-2 xl:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[0.72rem] uppercase tracking-[0.32em] text-zinc-500">Timeline</p>
                  <p className="mt-2 text-xl font-semibold text-white">Sesion de hoy</p>
                </div>
                <Sparkles className="h-5 w-5 text-fuchsia-300" />
              </div>
              <div className="mt-4 space-y-3">
                {timeline.map((item) => (
                  <div key={item} className="flex items-center gap-3 rounded-2xl bg-black/20 px-3 py-2">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    <span className="text-sm text-zinc-200">{item}</span>
                  </div>
                ))}
              </div>
            </div>
            </div>
          </div>
        </section>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[1.15fr_0.92fr_0.82fr]">
        <section className="surface-panel rounded-[1.75rem] p-5 lg:p-6">
          <PanelTitle
            title="Inicio"
            subtitle="Feed curado con activacion social y multimedia"
            action={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-zinc-400 hover:bg-violet-500/10 hover:text-white"
                onClick={() => onNavigate('chat')}
              >
                <Bell className="h-4 w-4" />
              </Button>
            }
          />

          <div className="mt-5 rounded-[1.5rem] border border-white/6 bg-black/20 p-4">
            <div className="flex items-center gap-3 rounded-[1.2rem] border border-violet-400/10 bg-[#120c20] px-4 py-3">
              <Avatar className="h-10 w-10 border border-violet-400/30">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                  R3
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-sm text-zinc-400">Que estas pensando, jugador?</div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onNavigate('chat')}
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                Publicar
              </Button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {[
                { label: 'Video en vivo', icon: Video, onClick: () => onNavigate('live') },
                { label: 'Foto', icon: Camera, onClick: () => onNavigate('profile') },
                { label: 'Sala de juego', icon: Gamepad2, onClick: () => onOpenGame() },
              ].map(({ label, icon: Icon, onClick }) => (
                <button
                  key={label}
                  onClick={onClick}
                  className="status-chip text-sm text-zinc-200 transition hover:border-violet-400/30 hover:bg-violet-500/10"
                >
                  <Icon className="h-4 w-4 text-fuchsia-300" />
                  {label}
                </button>
              ))}
            </div>

            <div className="mt-5 flex gap-3 overflow-x-auto pb-1">
              {stories.map((story) => (
                <div key={story.name} className="min-w-[74px] text-center">
                  <div className={cn('mx-auto h-16 w-16 rounded-[1.25rem] bg-gradient-to-br p-[2px]', story.accent)}>
                    <div className="flex h-full w-full items-center justify-center rounded-[1.15rem] bg-[#120c20] text-lg font-semibold text-white">
                      {story.name.slice(0, 1)}
                    </div>
                  </div>
                  <p className="mt-2 text-xs tracking-[0.14em] text-zinc-400">{story.name}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-5 rounded-[1.6rem] border border-violet-400/[0.12] bg-gradient-to-br from-[#121935] via-[#0f1330] to-[#13102c] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <Avatar className="h-11 w-11 border border-violet-400/30">
                  <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-violet-500 text-white">
                    AK
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-semibold text-white">{featuredStream.hostName} esta transmitiendo en vivo</p>
                  <p className="text-sm text-zinc-400">{featuredStream.subtitle}</p>
                </div>
              </div>
              <Badge className="rounded-full border-0 bg-red-500/90 px-2.5 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-white">
                Live
              </Badge>
            </div>

            <div className="mt-4 rounded-[1.6rem] border border-cyan-400/10 bg-[#0a1634]/90 p-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.28em] text-zinc-500">
                <span>{featuredStream.viewers} mirando</span>
                <span>{featuredStream.comments} comentarios</span>
              </div>
              <div className="mt-4 grid grid-cols-4 gap-3">
                {featuredStream.highlightCards.map((value, index) => (
                  <PreviewPlayingCard
                    key={value}
                    className={cn(
                      'aspect-[3/4] text-3xl shadow-[0_18px_40px_rgba(0,0,0,0.35)]',
                      index === 3
                        ? 'border-cyan-300 bg-gradient-to-br from-sky-400/35 to-violet-400/40'
                        : 'bg-gradient-to-br from-white/[0.12] to-white/[0.04]'
                    )}
                    value={value}
                  />
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-4 text-sm text-zinc-300">
                  <span className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-pink-300" />
                    {featuredStream.reactions}
                  </span>
                  <span className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-cyan-300" />
                    Comentar
                  </span>
                </div>
                <span className="flex items-center gap-2 text-sm text-fuchsia-300">
                  <Gift className="h-4 w-4" />
                  Regalar
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[1.75rem] p-5 lg:p-6">
          <PanelTitle
            title="Chats"
            subtitle="Conversaciones, salas y presencia en tiempo real"
            action={
              <Button
                variant="ghost"
                size="icon"
                className="rounded-full text-zinc-400 hover:bg-violet-500/10 hover:text-white"
                onClick={() => onNavigate('chat')}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
            }
          />

          <div className="mt-5 rounded-[1.5rem] border border-white/6 bg-black/20 p-4">
            <div className="flex items-center gap-3 rounded-full border border-violet-400/10 bg-[#120c20] px-4 py-3">
              <Search className="h-4 w-4 text-zinc-500" />
              <span className="text-sm text-zinc-500">Buscar chats, amigos o grupos...</span>
            </div>

            <div className="mt-4 flex gap-2">
              {['Global', 'Amigos', 'Grupos', 'Salas'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => onNavigate('chat')}
                  className={cn(
                    'rounded-full px-4 py-2 text-sm transition',
                    index === 0
                      ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
                      : 'bg-[#171126] text-zinc-400 hover:text-white'
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2">
              {chats.map((chat) => (
                <button
                  key={chat.room}
                  onClick={() => onNavigate('chat')}
                  className="flex w-full items-center gap-3 rounded-[1.25rem] border border-transparent bg-white/[0.03] px-3 py-3 text-left transition hover:border-violet-400/[0.12] hover:bg-violet-500/[0.08]"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-[1.1rem] bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-white">
                    {chat.room.slice(0, 1)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">{chat.room}</p>
                    <p className={cn('truncate text-sm', chat.accent)}>{chat.note}</p>
                  </div>
                  <Badge className="rounded-full border-0 bg-violet-500/[0.18] px-2 py-1 text-xs text-violet-100">
                    {chat.badge}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        </section>

        <div className="space-y-6 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 xl:col-span-1 xl:block xl:space-y-6">
          <section className="phone-shell px-4 pb-5 pt-4">
            <div className="mx-auto mb-4 h-1.5 w-24 rounded-full bg-white/10" />
            <div className="rounded-[1.65rem] bg-gradient-to-br from-[#28154d] via-[#1b153c] to-[#0b0a19] p-4">
              <div className="flex items-center justify-between text-xs text-white/80">
                <span>EN VIVO</span>
                <span>9:41</span>
              </div>
              <div className="mt-3 rounded-[1.65rem] border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/[0.18] via-violet-500/[0.18] to-cyan-500/[0.12] p-4">
                <div className="mx-auto h-56 w-full rounded-[1.4rem] bg-[radial-gradient(circle_at_50%_30%,rgba(255,255,255,0.18),transparent_32%),linear-gradient(180deg,rgba(255,83,217,0.18),rgba(12,10,24,0.35))]" />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-white">MiaGamer</p>
                  <p className="text-sm text-zinc-400">Se juega el top del torneo</p>
                </div>
                <Badge className="rounded-full border-0 bg-white/10 px-2 py-1 text-[0.7rem] text-fuchsia-200">
                  1.1K
                </Badge>
              </div>
              <div className="mt-4 flex items-center justify-between text-zinc-400">
                {[
                  { icon: Sparkles, onClick: () => onNavigate('live') },
                  { icon: MessageCircle, onClick: () => onNavigate('chat') },
                  { icon: Send, onClick: () => onNavigate('chat') },
                  { icon: Gift, onClick: () => onNavigate('market') },
                ].map(({ icon: Icon, onClick }, index) => (
                  <button
                    key={index}
                    onClick={onClick}
                    className="rounded-full bg-white/5 p-3 transition hover:bg-white/10 hover:text-white"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="surface-panel rounded-[1.75rem] p-5">
            <PanelTitle
              title="GameHub"
              subtitle="Economia, progreso y acceso rapido"
              action={<Crown className="h-5 w-5 text-amber-300" />}
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              {metrics.map((metric) => (
                <div key={metric.label} className="rounded-[1.4rem] border border-white/[0.08] bg-white/[0.04] p-4">
                  <p className="text-[0.7rem] uppercase tracking-[0.28em] text-zinc-500">{metric.label}</p>
                  <p className="mt-2 text-3xl font-semibold text-white">{metric.value}</p>
                  <p className="mt-1 text-sm text-zinc-400">{metric.hint}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-[0.82fr_1.42fr_0.9fr]">
        <section className="surface-panel rounded-[1.75rem] p-5 lg:p-6">
          <PanelTitle
            title="Perfil"
            subtitle="Creador, jugador y hub social"
            action={<Star className="h-5 w-5 text-fuchsia-300" />}
          />

          <div className="mt-5 rounded-[1.8rem] border border-violet-400/[0.12] bg-[#0b0a16] p-4">
            <div className="rounded-[1.55rem] bg-gradient-to-br from-cyan-500/[0.25] via-violet-500/30 to-fuchsia-500/[0.25] p-4">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-white/[0.15]">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-2xl text-white">
                    R3
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-2xl font-semibold text-white">{dashboardProfile.displayName}</p>
                  <p className="text-sm text-violet-200">{dashboardProfile.username}</p>
                  <p className="mt-2 text-sm text-zinc-200">{dashboardProfile.bio}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <TinyStat label="Siguiendo" value={dashboardProfile.following} />
              <TinyStat label="Seguidores" value={dashboardProfile.followers} />
              <TinyStat label="Loves" value={dashboardProfile.loves} />
            </div>

            <div className="mt-4 rounded-[1.4rem] border border-white/[0.08] bg-white/[0.04] p-4">
              <p className="text-sm font-semibold text-white">Estado actual</p>
              <div className="mt-3 space-y-3">
                {[
                  ...dashboardProfile.statusItems,
                ].map((item) => (
                  <div key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                    <span className="h-2 w-2 rounded-full bg-cyan-300" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[1.75rem] p-5 lg:p-6">
          <PanelTitle
            title="Mesa Central"
            subtitle="Vista unificada de partida, control y ritmo competitivo"
            action={
              <Button
                variant="outline"
                onClick={() => onOpenGame()}
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                Abrir partida
              </Button>
            }
          />

          <div className="mt-5 table-stage min-h-[30rem] p-5 sm:p-6">
            <div className="flex justify-between gap-3">
              <div className="status-chip text-sm">
                <Gift className="h-4 w-4 text-fuchsia-300" />
                {table.roomName}
              </div>
              <div className="flex gap-2">
                {tableActionButtons.map(({ icon: Icon, label, onClick }) => (
                  <button
                    key={label}
                    onClick={onClick}
                    aria-label={label}
                    className="rounded-full border border-white/10 bg-white/[0.08] p-2.5 text-zinc-200 transition hover:bg-white/[0.14]"
                  >
                    <Icon className="h-4 w-4" />
                  </button>
                ))}
              </div>
            </div>

            <div className="relative mt-6 min-h-[20rem]">
              <div className="absolute left-1/2 top-0 -translate-x-1/2 text-center">
                <Avatar className="mx-auto h-12 w-12 border border-violet-300/[0.25]">
                  <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                    {table.top.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-medium text-white">{table.top.name}</p>
                <p className="text-xs text-zinc-400">{table.top.scoreLabel}</p>
              </div>

              <div className="absolute left-0 top-1/2 -translate-y-1/2 text-center">
                <Avatar className="mx-auto h-12 w-12 border border-cyan-300/20">
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-sky-500 text-white">
                    {table.left.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-medium text-white">{table.left.name}</p>
                <p className="text-xs text-zinc-400">{table.left.scoreLabel}</p>
              </div>

              <div className="absolute right-0 top-1/2 -translate-y-1/2 text-center">
                <Avatar className="mx-auto h-12 w-12 border border-fuchsia-300/20">
                  <AvatarFallback className="bg-gradient-to-br from-fuchsia-500 to-rose-500 text-white">
                    {table.right.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-medium text-white">{table.right.name}</p>
                <p className="text-xs text-zinc-400">{table.right.scoreLabel}</p>
              </div>

              <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
                <Avatar className="mx-auto h-12 w-12 border border-emerald-300/20">
                  <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                    {table.bottom.initials}
                  </AvatarFallback>
                </Avatar>
                <p className="mt-2 text-sm font-medium text-white">{table.bottom.name}</p>
                <p className="text-xs text-emerald-300">{table.bottom.statusLabel ?? table.bottom.scoreLabel}</p>
              </div>

              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-3">
                {table.centerCards.map((value, index) => (
                  <PreviewPlayingCard
                    key={value}
                    className={cn(
                      'h-28 w-20 text-3xl shadow-[0_14px_40px_rgba(0,0,0,0.35)]',
                      index === 1
                        ? 'translate-y-3 rotate-[-2deg] border-violet-300'
                        : index === 0
                          ? 'rotate-[-9deg]'
                          : 'rotate-[9deg]'
                    )}
                    value={value}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-3">
                {table.handCards.map((value, index) => (
                  <PreviewPlayingCard
                    key={value}
                    className={cn(
                      'h-28 w-20 text-3xl',
                      index === 4
                        ? 'border-cyan-300 text-slate-900 shadow-[0_0_24px_rgba(34,211,238,0.55)]'
                        : undefined
                    )}
                    value={value}
                  />
                ))}
              </div>
              <div className="status-chip bg-[#0b0b1d] text-sm text-zinc-100">
                <Send className="h-4 w-4 text-cyan-300" />
                Escribe un mensaje o arrastra un emoji
              </div>
            </div>
          </div>
        </section>

        <div className="space-y-6 lg:col-span-2 lg:grid lg:grid-cols-2 lg:gap-6 lg:space-y-0 xl:col-span-1 xl:block xl:space-y-6">
          <section className="surface-panel rounded-[1.75rem] p-5">
            <PanelTitle
              title="Salas Activas"
              subtitle="Acceso rapido a partidas y duelos"
              action={<Users className="h-5 w-5 text-cyan-300" />}
            />
            <div className="mt-5 space-y-3">
              {rooms.map((room) => (
                <div key={room.name} className="rounded-[1.35rem] border border-white/[0.08] bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-white">{room.name}</p>
                      <p className="text-sm text-zinc-400">{room.players} jugadores conectados</p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        if (room.cta === 'Entrar') {
                          onOpenGame(room.id)
                        }
                      }}
                      disabled={room.cta !== 'Entrar'}
                      className={cn(
                        'rounded-full px-4',
                        room.cta === 'Entrar'
                          ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90'
                          : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-800'
                      )}
                    >
                      {room.cta}
                    </Button>
                  </div>
                </div>
              ))}
              <Button
                onClick={() => onNavigate('games')}
                className="w-full rounded-[1.25rem] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-6 text-base font-semibold text-white hover:opacity-90"
              >
                + Crear sala
              </Button>
            </div>
          </section>

          <section className="surface-panel rounded-[1.75rem] p-5">
            <PanelTitle
              title="Ajustes y Chat"
              subtitle="Controles rapidos y estado de mesa"
              action={<Trophy className="h-5 w-5 text-amber-300" />}
            />

            <div className="mt-5 space-y-4">
              {[
                ['Zoom de mesa', table.zoom],
                ['Tamano de cartas', table.cardSize],
                ['Modo oscuro', table.darkMode],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.25rem] border border-white/[0.08] bg-white/[0.04] p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-zinc-300">{label}</span>
                    <span className="text-white">{value}</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-white/[0.08]">
                    <div
                      className={cn(
                        'h-full rounded-full bg-gradient-to-r from-violet-500 to-cyan-400',
                        label === 'Zoom de mesa'
                          ? 'w-[72%]'
                          : label === 'Tamano de cartas'
                            ? 'w-[64%]'
                            : 'w-[88%]'
                      )}
                    />
                  </div>
                </div>
              ))}

              <div className="rounded-[1.35rem] border border-white/[0.08] bg-[#0f0b1a] p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-medium text-white">Chat de mesa</p>
                  <Flame className="h-4 w-4 text-fuchsia-300" />
                </div>
                <div className="space-y-2">
                  {feed.map((entry) => (
                    <div key={`${entry.user}-${entry.text}`} className="rounded-xl bg-white/[0.04] px-3 py-2">
                      <span className="text-sm font-medium text-violet-200">{entry.user}: </span>
                      <span className="text-sm text-zinc-200">{entry.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="surface-panel rounded-[1.75rem] p-5 lg:col-span-2 xl:col-span-1">
            <PanelTitle
              title="Editor de Cartas"
              subtitle="Curacion visual para mazos y cartas especiales"
              action={
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-zinc-400 hover:bg-violet-500/10 hover:text-white"
                  onClick={() => onNavigate('customize')}
                >
                  <Palette className="h-4 w-4" />
                </Button>
              }
            />

            <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
              <div className="rounded-[1.5rem] border border-white/[0.08] bg-gradient-to-br from-white/[0.08] to-transparent p-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="flex aspect-[3/4] items-center justify-center rounded-[1.2rem] border border-white/[0.15] bg-white text-3xl font-bold text-slate-900">
                    Q♥
                  </div>
                  <div className="rounded-[1.2rem] border border-violet-400/[0.18] bg-gradient-to-br from-violet-500/[0.25] to-fuchsia-500/20 p-3">
                    <p className="text-sm text-zinc-300">Estilos</p>
                    <p className="mt-2 text-xl font-semibold text-white">10</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-cyan-400/[0.18] bg-gradient-to-br from-cyan-500/[0.22] to-sky-500/[0.14] p-3">
                    <p className="text-sm text-zinc-300">Aplicacion</p>
                    <p className="mt-2 text-xl font-semibold text-white">Mazo</p>
                  </div>
                </div>
              </div>

              <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-sm font-medium text-white">Biblioteca visual</p>
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {styles.map((style) => (
                    <div
                      key={style}
                      className="rounded-xl border border-white/[0.08] bg-gradient-to-br from-violet-500/[0.18] to-cyan-500/[0.14] px-3 py-4 text-center text-xs font-medium tracking-[0.14em] text-zinc-100"
                    >
                      {style}
                    </div>
                  ))}
                </div>
              </div>

              <div className="sm:col-span-2 xl:col-span-1">
                <Button
                  onClick={() => onNavigate('customize')}
                  className="w-full rounded-[1.25rem] bg-gradient-to-r from-violet-500 to-fuchsia-500 py-6 text-base font-semibold text-white hover:opacity-90"
                >
                  Abrir Card Lab
                </Button>
              </div>
            </div>
          </section>
        </div>
        </div>
      </div>
    </>
  )
}
