'use client'

import { signOut } from 'next-auth/react'
import { startTransition, useEffect, useRef, useState } from 'react'
import type { AppSnapshot } from '@/lib/app-types'
import { cn } from '@/lib/utils'
import { Navigation } from '@/components/rey30/navigation'
import { DashboardShowcase } from '@/components/rey30/dashboard-showcase'
import { ChatSystem } from '@/components/rey30/chat-system'
import { GameLobby } from '@/components/rey30/game-lobby'
import { CardGame } from '@/components/rey30/card-game'
import { Marketplace } from '@/components/rey30/marketplace'
import { LiveStreaming } from '@/components/rey30/live-streaming'
import { CardCustomization } from '@/components/rey30/card-customization'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Activity,
  Bell,
  Crown,
  Gamepad2,
  Home,
  LogOut,
  MessageCircle,
  Palette,
  Radio,
  RefreshCcw,
  Search,
  ShoppingBag,
  Sparkles,
  Wifi,
  WifiOff,
} from 'lucide-react'

type SectionId = 'home' | 'chat' | 'games' | 'live' | 'market' | 'customize' | 'profile'
type ConnectionState = 'connecting' | 'connected' | 'syncing' | 'reconnecting' | 'offline'

const sectionMeta: Record<SectionId, { title: string; subtitle: string }> = {
  home: {
    title: 'Centro de control',
    subtitle: 'Vista ejecutiva del ecosistema social gaming de REY30VERSE.',
  },
  chat: {
    title: 'Chats en tiempo real',
    subtitle: 'Canales globales, salas privadas y coordinacion de partidas.',
  },
  games: {
    title: 'Lobbies y partidas',
    subtitle: 'Matchmaking, torneos y acceso rapido a la mesa activa.',
  },
  live: {
    title: 'Streaming en vivo',
    subtitle: 'Transmision, regalos y comunidad en una sola interfaz.',
  },
  market: {
    title: 'Marketplace',
    subtitle: 'Addons, barajas premium y economia del producto.',
  },
  customize: {
    title: 'Card Lab',
    subtitle: 'Curacion visual del mazo, cartas unicas y estilos premium.',
  },
  profile: {
    title: 'Perfil del creador',
    subtitle: 'Presencia, progreso, comunidad y logros del jugador.',
  },
}

export default function HomePageShell() {
  const [activeTab, setActiveTab] = useState<SectionId>('home')
  const [showGame, setShowGame] = useState(false)
  const [activeGameRoomId, setActiveGameRoomId] = useState<string | null>(null)
  const [appData, setAppData] = useState<AppSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connectionState, setConnectionState] = useState<ConnectionState>('connecting')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)
  const [lastSyncAt, setLastSyncAt] = useState<string | null>(null)
  const activeTabRef = useRef<SectionId>('home')
  const appDataRef = useRef<AppSnapshot | null>(null)
  const latencyRef = useRef<number | null>(null)
  const refreshTimeoutRef = useRef<number | null>(null)
  const eventSourceRef = useRef<EventSource | null>(null)
  const pulseIntervalRef = useRef<number | null>(null)
  const isSigningOutRef = useRef(false)

  appDataRef.current = appData
  activeTabRef.current = activeTab
  latencyRef.current = latencyMs

  useEffect(() => {
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual'
    }

    window.scrollTo(0, 0)
  }, [])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [activeTab, showGame])

  useEffect(() => {
    if (!activeGameRoomId && appData?.lobby.rooms[0]?.id) {
      setActiveGameRoomId(appData.lobby.rooms[0].id)
    }
  }, [activeGameRoomId, appData])

  const loadAppData = async (reason = 'manual') => {
    const hasSnapshot = Boolean(appDataRef.current)

    if (hasSnapshot) {
      setIsSyncing(true)
      setConnectionState('syncing')
    } else {
      setIsLoading(true)
      setConnectionState('connecting')
    }

    setError(null)

    try {
      const response = await fetch('/api/bootstrap', { cache: 'no-store' })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar la app.')
      }

      startTransition(() => {
        setAppData(payload as AppSnapshot)
        setLastSyncAt(
          new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })
        )
      })
      setConnectionState('connected')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la app.')
      setConnectionState(hasSnapshot ? 'reconnecting' : 'offline')
    } finally {
      setIsLoading(false)
      setIsSyncing(false)
    }
  }

  useEffect(() => {
    void loadAppData('bootstrap')
  }, [])

  useEffect(() => {
    const queueRefresh = (reason = 'realtime') => {
      if (refreshTimeoutRef.current) {
        return
      }

      refreshTimeoutRef.current = window.setTimeout(() => {
        refreshTimeoutRef.current = null
        void loadAppData(reason)
      }, 180)
    }

    const eventSource = new EventSource('/api/realtime/stream')
    eventSourceRef.current = eventSource

    const handleRealtimeEvent = () => {
      queueRefresh('realtime-event')
    }

    eventSource.addEventListener('connected', () => {
      setConnectionState('connected')
    })
    eventSource.addEventListener('message-created', handleRealtimeEvent)
    eventSource.addEventListener('room-created', handleRealtimeEvent)
    eventSource.addEventListener('presence-updated', handleRealtimeEvent)
    eventSource.addEventListener('match-updated', handleRealtimeEvent)
    eventSource.addEventListener('stream-updated', handleRealtimeEvent)
    eventSource.addEventListener('inventory-updated', handleRealtimeEvent)
    eventSource.addEventListener('customize-updated', handleRealtimeEvent)
    eventSource.onerror = () => {
      setConnectionState((current) => (current === 'offline' ? 'offline' : 'reconnecting'))
    }

    return () => {
      if (refreshTimeoutRef.current) {
        window.clearTimeout(refreshTimeoutRef.current)
        refreshTimeoutRef.current = null
      }

      eventSource.close()
      if (eventSourceRef.current === eventSource) {
        eventSourceRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    let isDisposed = false

    const sendPulse = async (stateOverride?: 'online' | 'away' | 'offline') => {
      if (isSigningOutRef.current && stateOverride !== 'offline') {
        return
      }

      const startedAt = performance.now()

      try {
        await fetch('/api/presence/pulse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-store',
          keepalive: stateOverride === 'offline',
          body: JSON.stringify({
            screen: activeTabRef.current,
            state: stateOverride ?? (document.hidden ? 'away' : 'online'),
            latencyMs: latencyRef.current,
          }),
        })

        if (isDisposed) {
          return
        }

        setLatencyMs(Math.round(performance.now() - startedAt))
        setConnectionState((current) =>
          current === 'offline' || current === 'reconnecting' ? 'connected' : current
        )
      } catch {
        if (!isDisposed) {
          setConnectionState('offline')
        }
      }
    }

    const handleVisibilityChange = () => {
      if (isSigningOutRef.current) {
        return
      }

      void sendPulse(document.hidden ? 'away' : 'online')
    }

    const handlePageHide = () => {
      if (isSigningOutRef.current) {
        return
      }

      void sendPulse('offline')
    }

    void sendPulse()

    const pulseInterval = window.setInterval(() => {
      void sendPulse()
    }, 20_000)
    pulseIntervalRef.current = pulseInterval

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('pagehide', handlePageHide)

    return () => {
      isDisposed = true
      window.clearInterval(pulseInterval)
      if (pulseIntervalRef.current === pulseInterval) {
        pulseIntervalRef.current = null
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('pagehide', handlePageHide)
    }
  }, [])

  const handleSignOut = async () => {
    if (isSigningOutRef.current) {
      return
    }

    isSigningOutRef.current = true
    setConnectionState('offline')

    if (refreshTimeoutRef.current) {
      window.clearTimeout(refreshTimeoutRef.current)
      refreshTimeoutRef.current = null
    }

    if (pulseIntervalRef.current) {
      window.clearInterval(pulseIntervalRef.current)
      pulseIntervalRef.current = null
    }

    eventSourceRef.current?.close()
    eventSourceRef.current = null

    try {
      await fetch('/api/presence/pulse', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
        keepalive: true,
        body: JSON.stringify({
          screen: activeTabRef.current,
          state: 'offline',
          latencyMs: latencyRef.current,
        }),
      })
    } catch {
      // Ignore logout race conditions.
    }

    await signOut({ callbackUrl: '/login' })
  }

  const navigateTo = (tab: string) => {
    window.scrollTo(0, 0)
    setActiveTab(tab as SectionId)
  }

  const openTable = (roomId?: string) => {
    window.scrollTo(0, 0)
    if (roomId) {
      setActiveGameRoomId(roomId)
    } else if (appData?.lobby.rooms[0]?.id) {
      setActiveGameRoomId(appData.lobby.rooms[0].id)
    }
    setShowGame(true)
    setActiveTab('games')
  }

  const navigationBadges = {
    chatBadge: appData ? String(appData.chat.rooms.reduce((total, room) => total + room.unread, 0)) : '5',
    gamesBadge: appData ? String(appData.lobby.rooms.filter((room) => room.status === 'waiting').length) : '2',
    liveBadge: appData ? String(appData.live.streams.filter((stream) => stream.isLive).length) : 'On',
    currentStatus: appData?.presence.label,
    onlineUsers: appData?.presence.onlineUsers,
  }

  const connectionMeta = {
    icon:
      connectionState === 'offline'
        ? WifiOff
        : connectionState === 'syncing' || isSyncing
          ? RefreshCcw
          : Wifi,
    label:
      connectionState === 'offline'
        ? 'Offline'
        : connectionState === 'reconnecting'
          ? 'Reconectando'
          : connectionState === 'syncing' || isSyncing
            ? 'Sincronizando'
            : appData?.presence.label ?? 'Online',
    detail:
      connectionState === 'offline'
        ? 'Sin enlace con el canal realtime'
        : `${appData?.presence.onlineUsers ?? '0'} online${latencyMs ? ` • ${latencyMs}ms` : ''}${lastSyncAt ? ` • sync ${lastSyncAt}` : ''}`,
  }

  const renderContent = () => {
    if (isLoading && !appData) {
      return <StatusPanel title="Cargando ecosistema" description="Estamos levantando perfiles, salas, streams y marketplace desde Prisma." />
    }

    if (error && !appData) {
      return <StatusPanel title="Error de carga" description={error} onRetry={loadAppData} />
    }

    if (!appData) {
      return <StatusPanel title="Sin datos" description="Aun no hay snapshot disponible para REY30VERSE." onRetry={loadAppData} />
    }

    if (activeTab === 'home') {
      return <DashboardShowcase data={appData.dashboard} onNavigate={navigateTo} onOpenGame={openTable} />
    }

    if (activeTab === 'chat') {
      return <ChatSystem data={appData.chat} onRefresh={loadAppData} />
    }

    if (activeTab === 'games') {
      if (showGame) {
        return (
          <div className="space-y-4">
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={() => setShowGame(false)}
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                Volver al lobby
              </Button>
            </div>
            <div className="surface-panel rounded-[1.8rem] p-2 sm:p-3">
              <CardGame roomId={activeGameRoomId ?? appData.lobby.rooms[0]?.id ?? null} />
            </div>
          </div>
        )
      }

      return (
        <div className="space-y-6">
          <GameLobby data={appData.lobby} onRefresh={loadAppData} onEnterRoom={openTable} />
          <div className="surface-panel rounded-[1.6rem] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Mesa destacada</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {appData.lobby.rooms[0]?.name ?? 'Sala relampago lista para entrar'}
                </h3>
                <p className="mt-1 text-zinc-400">Carga la mesa activa y entra directo al turno competitivo.</p>
              </div>
              <Button
                onClick={() => openTable(appData.lobby.rooms[0]?.id)}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 py-6 text-base font-semibold text-white hover:opacity-90"
              >
                <Gamepad2 className="mr-2 h-4 w-4" />
                Entrar a la mesa activa
              </Button>
            </div>
          </div>
        </div>
      )
    }

    if (activeTab === 'live') {
      return <LiveStreaming data={appData.live} />
    }

    if (activeTab === 'market') {
      return <Marketplace data={appData.market} />
    }

    if (activeTab === 'customize') {
      return <CardCustomization data={appData.customize} />
    }

    return <ProfileSection profile={appData.profile} onGoHome={() => setActiveTab('home')} />
  }

  const mobileTabs = [
    { id: 'home' as const, label: 'Inicio', icon: Home },
    { id: 'chat' as const, label: 'Chats', icon: MessageCircle },
    { id: 'games' as const, label: 'Salas', icon: Gamepad2 },
    { id: 'live' as const, label: 'Live', icon: Radio },
    { id: 'market' as const, label: 'Addons', icon: ShoppingBag },
    { id: 'customize' as const, label: 'Card Lab', icon: Palette },
  ]

  const currentSection = sectionMeta[activeTab]
  const ConnectionIcon = connectionMeta.icon

  return (
    <div className="min-h-screen">
      <Navigation
        activeTab={activeTab}
        setActiveTab={navigateTo}
        onSignOut={handleSignOut}
        currentUser={appData?.currentUser}
        activity={navigationBadges}
      />

      <main className="min-h-screen lg:ml-72">
        <header className="sticky top-0 z-40 border-b border-violet-400/10 bg-[#090613]/78 backdrop-blur-xl">
          <div className="flex flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.34em] text-violet-300/70">REY30VERSE</p>
                <h2 className="mt-2 text-2xl font-semibold text-white sm:text-3xl">{currentSection.title}</h2>
                <p className="mt-1 text-sm text-zinc-400 sm:text-base">
                  {currentSection.subtitle}
                  {error && appData ? ` • ${error}` : ''}
                </p>
              </div>

              <div className="hidden items-center gap-3 md:flex">
                <Badge className="status-chip border-0 bg-transparent px-3 py-2 text-xs shadow-none">
                  <ConnectionIcon
                    className={cn(
                      'h-3.5 w-3.5',
                      connectionState === 'offline'
                        ? 'text-rose-300'
                        : connectionState === 'syncing' || isSyncing
                          ? 'animate-spin text-cyan-300'
                          : connectionState === 'reconnecting'
                            ? 'text-amber-300'
                            : 'text-emerald-300'
                    )}
                  />
                  {connectionMeta.label}
                </Badge>
                <Badge className="rounded-full border border-violet-400/15 bg-white/[0.04] px-3 py-2 text-[0.72rem] text-zinc-300">
                  <Activity className="mr-1.5 h-3.5 w-3.5 text-cyan-300" />
                  {connectionMeta.detail}
                </Badge>
                <Button
                  variant="outline"
                  onClick={() => setActiveTab('customize')}
                  className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Pulir UI
                </Button>
              </div>
            </div>

            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-xl">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <Input
                  placeholder="Buscar salas, chats, streamers o addons..."
                  className="h-12 rounded-full border-violet-400/10 bg-black/25 pl-11 text-white placeholder:text-zinc-500"
                />
              </div>

              <div className="flex items-center gap-3 self-end md:self-auto">
                <div className="hidden rounded-full border border-violet-400/15 bg-white/[0.04] px-3 py-2 text-xs text-zinc-300 sm:flex md:hidden">
                  {appData?.presence.onlineUsers ?? '0'} online
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full bg-white/[0.04] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <Bell className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void handleSignOut()}
                  className="rounded-full bg-white/[0.04] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <LogOut className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setActiveTab('profile')}
                  className="rounded-full bg-white/[0.04] text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                >
                  <Avatar className="h-8 w-8 border border-violet-400/20">
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      {appData?.currentUser.initials ?? 'R3'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="px-4 py-5 sm:px-6 lg:px-8 lg:py-8">{renderContent()}</div>

        <footer className="border-t border-violet-400/10 px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-violet-400/15 bg-gradient-to-br from-violet-500/18 to-fuchsia-500/12">
                <Crown className="h-5 w-5 text-amber-300" />
              </div>
              <div>
                <p className="brand-display text-sm text-white">REY30VERSE</p>
                <p className="text-sm text-zinc-500">Donde el juego se vuelve comunidad.</p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-500">
              <span>UI premium</span>
              <span>Chat + Juego + Stream</span>
              <span>© 2026 Rey30 Studio</span>
            </div>
          </div>
        </footer>
      </main>

      <nav className="surface-panel !fixed bottom-3 left-3 right-3 z-50 rounded-[1.6rem] px-2 py-2 lg:hidden">
        <div className="grid grid-cols-6 gap-1">
          {mobileTabs.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  'flex flex-col items-center gap-1 rounded-[1rem] px-2 py-2 text-[0.68rem] transition',
                  activeTab === item.id
                    ? 'bg-gradient-to-br from-violet-500/20 to-fuchsia-500/15 text-white'
                    : 'text-zinc-400'
                )}
              >
                <Icon className="h-4 w-4" />
                <span>{item.label}</span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

function StatusPanel({
  title,
  description,
  onRetry,
}: {
  title: string
  description: string
  onRetry?: () => Promise<void> | void
}) {
  return (
    <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
      <div className="max-w-2xl space-y-4">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">REY30VERSE Data Core</p>
        <h3 className="text-3xl font-semibold text-white">{title}</h3>
        <p className="text-zinc-400">{description}</p>
        {onRetry ? (
          <Button
            onClick={() => void onRetry()}
            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90"
          >
            Reintentar
          </Button>
        ) : null}
      </div>
    </section>
  )
}

function ProfileSection({
  onGoHome,
  profile,
}: {
  onGoHome: () => void
  profile: AppSnapshot['profile']
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
      <section className="surface-panel rounded-[1.8rem] p-5 lg:p-6">
        <div className="rounded-[1.8rem] bg-gradient-to-br from-cyan-500/[0.22] via-violet-500/[0.28] to-fuchsia-500/[0.2] p-5">
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24 border-2 border-white/[0.16]">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl text-white">
                {profile.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-3xl font-semibold text-white">{profile.displayName}</p>
              <p className="mt-1 text-sm uppercase tracking-[0.24em] text-violet-200">{profile.roleLine}</p>
              <p className="mt-3 max-w-lg text-zinc-200">{profile.bio}</p>
            </div>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            ['Nivel', profile.level],
            ['Victorias', profile.wins],
            ['Seguidores', profile.followers],
            ['Puntos', profile.points],
          ].map(([label, value]) => (
            <div key={label} className="rounded-[1.3rem] border border-white/[0.08] bg-white/[0.04] p-4 text-center">
              <p className="text-[0.72rem] uppercase tracking-[0.28em] text-zinc-500">{label}</p>
              <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          <Button className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90">
            Editar perfil
          </Button>
          <Button
            variant="outline"
            onClick={onGoHome}
            className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          >
            Volver al hub
          </Button>
        </div>
      </section>

      <section className="surface-panel rounded-[1.8rem] p-5 lg:p-6">
        <div className="grid gap-5 lg:grid-cols-2">
          <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Logros</p>
            <div className="mt-4 flex flex-wrap gap-3">
              {profile.achievements.map((badge) => (
                <div
                  key={badge}
                  className="flex h-14 w-14 items-center justify-center rounded-[1.1rem] border border-violet-400/15 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/12 text-2xl"
                >
                  {badge}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-4">
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Coleccion destacada</p>
            <div className="mt-4 grid grid-cols-4 gap-3">
              {profile.collection.map((symbol) => (
                <div
                  key={symbol}
                  className="flex aspect-[3/4] items-center justify-center rounded-[1.1rem] border border-white/[0.12] bg-white text-2xl font-bold text-slate-900"
                >
                  {symbol}
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/[0.08] bg-white/[0.04] p-4 lg:col-span-2">
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Roadmap personal</p>
            <div className="mt-4 space-y-3">
              {profile.roadmap.map((item) => (
                <div key={item} className="flex items-center gap-3 rounded-[1rem] bg-black/20 px-4 py-3 text-zinc-200">
                  <span className="h-2 w-2 rounded-full bg-cyan-300" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
