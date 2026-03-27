'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { LiveGiftOptionSnapshot, LiveSnapshot, StreamSnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Clapperboard,
  Crown,
  Diamond,
  Eye,
  Flame,
  Gift,
  Maximize,
  MessageCircle,
  Play,
  Radio,
  Send,
  Sparkles,
  Star,
  Users,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface LiveStreamingProps {
  data?: LiveSnapshot
}

function GiftGlyph({ image }: { image: string }) {
  const Icon =
    image === 'pulse'
      ? Sparkles
      : image === 'diamond'
        ? Diamond
        : image === 'crown'
          ? Crown
          : image === 'trophy'
            ? Crown
            : Gift

  const className =
    image === 'pulse'
      ? 'text-fuchsia-300'
      : image === 'diamond'
        ? 'text-cyan-300'
        : image === 'crown'
          ? 'text-amber-300'
          : 'text-zinc-200'

  return <Icon className={cn('h-4 w-4', className)} />
}

function StreamCard({
  stream,
  isActive,
  onSelect,
}: {
  stream: StreamSnapshot
  isActive: boolean
  onSelect: () => void
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'surface-panel rounded-[1.45rem] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.08]',
        isActive && 'border-violet-400/30 bg-violet-500/[0.08]'
      )}
    >
      <div className="relative overflow-hidden rounded-[1.2rem] border border-violet-400/10 bg-gradient-to-br from-violet-500/20 via-fuchsia-500/14 to-cyan-500/14 p-4">
        <div className="absolute right-3 top-3 flex items-center gap-2">
          {stream.isLive ? (
            <Badge className="border-0 bg-red-500 text-white">
              <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
              EN VIVO
            </Badge>
          ) : null}
          <Badge className="border-0 bg-black/30 text-zinc-100">
            <Eye className="mr-1 h-3 w-3" />
            {stream.viewers.toLocaleString()}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12 border border-violet-400/20">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${stream.streamer.avatar}`} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              {stream.streamer.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-white">{stream.streamer.name}</p>
              {stream.streamer.isVerified ? <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> : null}
            </div>
            <p className="truncate text-sm text-zinc-300">{stream.title}</p>
            <p className="text-xs text-zinc-500">{stream.statusLine}</p>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-sm">
        <div className="flex items-center gap-3 text-zinc-400">
          <span className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-fuchsia-300" />
            {stream.likes.toLocaleString()}
          </span>
          <span className="flex items-center gap-1">
            <MessageCircle className="h-4 w-4 text-cyan-300" />
            {stream.comments.toLocaleString()}
          </span>
        </div>
        <span className="rounded-full border border-violet-400/15 bg-white/[0.04] px-3 py-1 text-xs text-zinc-200">
          {stream.game}
        </span>
      </div>
    </button>
  )
}

export function LiveStreaming({ data }: LiveStreamingProps) {
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(data ?? null)
  const [selectedStreamId, setSelectedStreamId] = useState<string | null>(data?.activeStreamId ?? null)
  const [chatMessage, setChatMessage] = useState('')
  const [muted, setMuted] = useState(false)
  const [isLoading, setIsLoading] = useState(!data)
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!data) {
      return
    }

    setSnapshot(data)
    setSelectedStreamId((current) => current ?? data.activeStreamId ?? data.streams[0]?.id ?? null)
  }, [data])

  const loadSnapshot = async (streamId?: string | null, showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const query = streamId ? `?streamId=${streamId}` : ''
      const response = await fetch(`/api/live/state${query}`, {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar el modulo en vivo.')
      }

      setSnapshot(payload as LiveSnapshot)
      setSelectedStreamId(payload.activeStreamId ?? payload.streams[0]?.id ?? null)
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar el modulo en vivo.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!snapshot) {
      void loadSnapshot(selectedStreamId, true)
    }
  }, [snapshot, selectedStreamId])

  useEffect(() => {
    if (!selectedStreamId || !snapshot || selectedStreamId === snapshot.activeStreamId) {
      return
    }

    void loadSnapshot(selectedStreamId)
  }, [selectedStreamId, snapshot])

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/stream')

    const handleRealtime = (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { streamId?: string }

        if (!payload.streamId || payload.streamId === (selectedStreamId ?? snapshot?.activeStreamId ?? null)) {
          void loadSnapshot(selectedStreamId ?? snapshot?.activeStreamId ?? null)
        }
      } catch {
        void loadSnapshot(selectedStreamId ?? snapshot?.activeStreamId ?? null)
      }
    }

    eventSource.addEventListener('stream-updated', handleRealtime as EventListener)

    return () => {
      eventSource.close()
    }
  }, [selectedStreamId, snapshot?.activeStreamId])

  const activeStreamId = selectedStreamId ?? snapshot?.activeStreamId ?? snapshot?.streams[0]?.id ?? null
  const activeStream = snapshot?.streams.find((stream) => stream.id === activeStreamId) ?? snapshot?.streams[0] ?? null

  const submitChat = async () => {
    if (!activeStream || !chatMessage.trim()) {
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/live/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: activeStream.id,
          content: chatMessage,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el mensaje.')
      }

      setChatMessage('')
      await loadSnapshot(activeStream.id)
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el mensaje.')
    } finally {
      setIsSending(false)
    }
  }

  const sendGift = async (gift: LiveGiftOptionSnapshot) => {
    if (!activeStream) {
      return
    }

    setIsSending(true)

    try {
      const response = await fetch('/api/live/gifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          streamId: activeStream.id,
          itemId: gift.id,
          quantity: 1,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el regalo.')
      }

      await loadSnapshot(activeStream.id)
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el regalo.')
    } finally {
      setIsSending(false)
    }
  }

  if (isLoading && !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">REY30VERSE LIVE CORE</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Levantando streaming y comunidad</h3>
        <p className="mt-2 text-zinc-400">Sincronizando streams, chat, clips y regalos desde Prisma.</p>
      </section>
    )
  }

  if (!activeStream || !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <h3 className="text-3xl font-semibold text-white">Modulo en vivo no disponible</h3>
        <p className="mt-2 text-zinc-400">{error ?? 'Aun no hay streams activos para mostrar.'}</p>
        <Button
          onClick={() => void loadSnapshot(undefined, true)}
          className="mt-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90"
        >
          Reintentar
        </Button>
      </section>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 xl:grid-cols-[1.34fr_0.94fr]">
        <section className="surface-panel rounded-[1.8rem] p-4 sm:p-5 lg:p-6">
          <div className="relative overflow-hidden rounded-[1.7rem] border border-violet-400/10 bg-gradient-to-br from-violet-500/[0.14] via-fuchsia-500/[0.16] to-cyan-500/[0.12] p-4 sm:p-5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_25%,rgba(255,255,255,0.15),transparent_28%),linear-gradient(135deg,rgba(10,8,22,0.65),rgba(7,17,30,0.88))]" />
            <div className="relative z-10 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge className="border-0 bg-red-500 text-white">
                    <span className="mr-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                    EN VIVO
                  </Badge>
                  <Badge className="border-0 bg-black/25 text-zinc-100">
                    <Eye className="mr-1 h-3.5 w-3.5" />
                    {activeStream.viewers.toLocaleString()}
                  </Badge>
                  <Badge className="border-0 bg-black/25 text-zinc-100">
                    <Sparkles className="mr-1 h-3.5 w-3.5 text-fuchsia-300" />
                    {activeStream.likes.toLocaleString()}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMuted((current) => !current)}
                    className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12]"
                  >
                    {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="rounded-full border border-white/10 bg-white/[0.08] text-zinc-100 hover:bg-white/[0.12]"
                  >
                    <Maximize className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex min-h-[18rem] items-center justify-center rounded-[1.5rem] border border-white/[0.08] bg-[radial-gradient(circle_at_50%_28%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(255,83,217,0.12),rgba(12,10,24,0.3))] p-6 md:min-h-[24rem]">
                <div className="text-center">
                  <Avatar className="mx-auto h-24 w-24 border-4 border-violet-400/25">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeStream.streamer.avatar}`} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-3xl text-white">
                      {activeStream.streamer.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <p className="mt-4 text-2xl font-semibold text-white">{activeStream.streamer.name}</p>
                  <p className="mt-2 max-w-xl text-zinc-300">{activeStream.title}</p>
                  <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                    {activeStream.tags.map((tag) => (
                      <Badge key={tag} className="border-0 bg-white/[0.08] text-zinc-100">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12 border border-violet-400/20">
                    <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeStream.streamer.avatar}`} />
                    <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                      {activeStream.streamer.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-white">{activeStream.streamer.name}</p>
                      {activeStream.streamer.isVerified ? <Star className="h-4 w-4 fill-amber-300 text-amber-300" /> : null}
                    </div>
                    <p className="text-sm text-zinc-400">{activeStream.statusLine}</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90">
                    <Play className="mr-2 h-4 w-4" />
                    Mantener abierto
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Seguir creador
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-[0.92fr_1.08fr]">
            <Card className="border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Creator panel</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{snapshot.creator?.displayName ?? activeStream.streamer.name}</h3>
                </div>
                <Radio className="h-5 w-5 text-fuchsia-300" />
              </div>

              <div className="mt-4 space-y-3">
                <div className="rounded-[1.25rem] border border-white/[0.08] bg-black/20 p-4">
                  <p className="text-sm text-violet-200">{snapshot.creator?.username}</p>
                  <p className="mt-1 text-sm text-zinc-300">{snapshot.creator?.roleLine}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Seguidores</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{snapshot.creator?.followers ?? activeStream.streamer.followers.toLocaleString()}</p>
                  </div>
                  <div className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-4">
                    <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Nivel</p>
                    <p className="mt-2 text-2xl font-semibold text-white">{snapshot.creator?.level ?? `Nv. ${activeStream.streamer.level}`}</p>
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-fuchsia-400/15 bg-fuchsia-500/[0.08] p-4">
                  <p className="text-sm font-medium text-white">{snapshot.creator?.goalLabel}</p>
                  <p className="mt-1 text-sm text-fuchsia-200">{snapshot.creator?.goalProgress}</p>
                  <div className="mt-3 h-2 rounded-full bg-white/[0.08]">
                    <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500" />
                  </div>
                  <p className="mt-3 text-sm text-zinc-300">{snapshot.creator?.highlightNote}</p>
                </div>
              </div>
            </Card>

            <Card className="border-white/[0.08] bg-white/[0.04] p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Clips</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">Momentos del creador</h3>
                </div>
                <Clapperboard className="h-5 w-5 text-cyan-300" />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {snapshot.clips.map((clip) => (
                  <div
                    key={clip.id}
                    className={cn(
                      'rounded-[1.3rem] border border-white/[0.08] bg-gradient-to-br p-4',
                      clip.accent
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="border-0 bg-black/25 text-zinc-100">{clip.duration}</Badge>
                      <span className="text-xs text-zinc-300">{clip.viewsLabel}</span>
                    </div>
                    <p className="mt-8 text-base font-semibold text-white">{clip.title}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="surface-panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Chat overlay</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Comunidad en vivo</h3>
              </div>
              <Badge className="border-0 bg-cyan-500/20 text-cyan-100">
                {activeStream.comments.toLocaleString()} msgs
              </Badge>
            </div>

            <ScrollArea className="mt-4 h-[20rem] rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
              <div className="space-y-3">
                {snapshot.chatMessages.map((message) => (
                  <div key={message.id} className="rounded-[1rem] border border-white/[0.06] bg-white/[0.04] px-3 py-2">
                    <div className="flex items-center justify-between gap-3">
                      <span className={cn('text-sm font-medium', message.color)}>{message.user}</span>
                      <span className="text-xs text-zinc-500">{message.timestamp}</span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-200">{message.message}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="mt-4 flex gap-2">
              <Input
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Escribe para el chat del stream..."
                className="h-11 rounded-full border-violet-400/10 bg-black/20 text-white placeholder:text-zinc-500"
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void submitChat()
                  }
                }}
              />
              <Button
                onClick={() => void submitChat()}
                disabled={isSending || !chatMessage.trim()}
                className="h-11 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-5 text-white hover:opacity-90"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            {error ? <p className="mt-3 text-sm text-rose-300">{error}</p> : null}
          </section>

          <section className="surface-panel rounded-[1.75rem] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Gifts</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Impulsar directo</h3>
              </div>
              <Flame className="h-5 w-5 text-amber-300" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {snapshot.giftOptions.map((gift) => (
                <button
                  key={gift.id}
                  onClick={() => void sendGift(gift)}
                  disabled={isSending}
                  className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-4 text-left transition hover:border-violet-400/30 hover:bg-violet-500/[0.08] disabled:opacity-60"
                >
                  <div className="flex items-center justify-between gap-3">
                    <GiftGlyph image={gift.image} />
                    <span className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                      {gift.currency}
                    </span>
                  </div>
                  <p className="mt-4 font-semibold text-white">{gift.name}</p>
                  <p className="mt-1 text-sm text-zinc-400">
                    {gift.price} {gift.currency}
                  </p>
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-3">
              {snapshot.gifts.map((gift) => (
                <div key={gift.id} className="rounded-[1rem] border border-white/[0.08] bg-black/20 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/[0.06]">
                        <GiftGlyph image={gift.image} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">
                          {gift.senderName} envió {gift.itemName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          x{gift.quantity} • {gift.valueLabel}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs text-zinc-500">{gift.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="surface-panel rounded-[1.8rem] p-5 lg:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Descubrir</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Streams activos</h3>
          </div>
          <Badge className="border-0 bg-red-500/15 text-red-200">
            {snapshot.streams.filter((stream) => stream.isLive).length} activos
          </Badge>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
          {snapshot.streams.map((stream) => (
            <StreamCard
              key={stream.id}
              stream={stream}
              isActive={stream.id === activeStream.id}
              onSelect={() => setSelectedStreamId(stream.id)}
            />
          ))}
        </div>
      </section>
    </div>
  )
}
