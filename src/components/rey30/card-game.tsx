'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { GameCardSnapshot, GameSnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Crown,
  MessageCircle,
  Mic,
  MicOff,
  MoonStar,
  RotateCcw,
  Send,
  Sparkles,
  Volume2,
} from 'lucide-react'

interface CardGameProps {
  roomId: string | null
}

const suitMeta = {
  crowns: { symbol: '♥', color: 'text-rose-400' },
  diamonds: { symbol: '♦', color: 'text-orange-300' },
  clubs: { symbol: '♣', color: 'text-zinc-100' },
  spades: { symbol: '♠', color: 'text-cyan-200' },
} as const

function TableCard({
  card,
  selected,
  onClick,
  disabled,
}: {
  card: GameCardSnapshot
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const meta = suitMeta[card.suit]
  const isDanger = card.suit === 'spades' && card.rank === 12

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'relative flex h-24 w-16 flex-col items-center justify-center rounded-[1.2rem] border bg-white shadow-[0_18px_40px_rgba(0,0,0,0.3)] transition-all lg:h-28 lg:w-20',
        selected ? 'border-fuchsia-400 -translate-y-4 shadow-[0_0_26px_rgba(217,70,239,0.35)]' : 'border-white/10',
        disabled ? 'cursor-not-allowed opacity-70' : 'hover:-translate-y-2'
      )}
    >
      <span className={cn('text-xl font-bold', meta.color)}>{card.label}</span>
      <span className={cn('mt-1 text-3xl', meta.color)}>{meta.symbol}</span>
      {isDanger ? (
        <Badge className="absolute -right-2 -top-2 border-0 bg-rose-500 px-1.5 py-0.5 text-[0.62rem] text-white">
          13
        </Badge>
      ) : null}
    </button>
  )
}

export function CardGame({ roomId }: CardGameProps) {
  const [game, setGame] = useState<GameSnapshot | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadGame = async (showLoader = true) => {
    if (!roomId) {
      setGame(null)
      setIsLoading(false)
      return
    }

    if (showLoader || !game) {
      setIsLoading(true)
    }

    try {
      const response = await fetch(`/api/game/state?roomId=${roomId}`, {
        cache: 'no-store',
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cargar la mesa.')
      }

      setGame(payload as GameSnapshot)
      setError(null)
      setSelectedCardId((current) =>
        payload.hand.some((card: GameCardSnapshot) => card.id === current) ? current : null
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la mesa.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadGame()
  }, [roomId])

  useEffect(() => {
    if (!roomId) {
      return
    }

    const eventSource = new EventSource('/api/realtime/stream')
    const handleRealtime = (event: Event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as { roomId?: string }

        if (!payload.roomId || payload.roomId === roomId) {
          void loadGame(false)
        }
      } catch {
        void loadGame(false)
      }
    }

    eventSource.addEventListener('match-updated', handleRealtime as EventListener)

    return () => {
      eventSource.close()
    }
  }, [roomId])

  const mutateGame = async (url: string, body: Record<string, unknown>) => {
    if (!roomId) {
      return
    }

    setIsMutating(true)

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          ...body,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo actualizar la mesa.')
      }

      await loadGame(false)
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar la mesa.')
    } finally {
      setIsMutating(false)
    }
  }

  const playSelectedCard = async () => {
    if (!selectedCardId || !game) {
      return
    }

    await mutateGame('/api/game/play', {
      cardId: selectedCardId,
    })
    setSelectedCardId(null)
  }

  const toggleVoice = async () => {
    await mutateGame('/api/game/control', {
      action: 'toggle-voice',
    })
  }

  const toggleChat = async () => {
    await mutateGame('/api/game/control', {
      action: 'toggle-chat',
    })
  }

  const toggleSound = async () => {
    await mutateGame('/api/game/control', {
      action: 'toggle-sound',
    })
  }

  const toggleDarkMode = async () => {
    await mutateGame('/api/game/control', {
      action: 'toggle-dark-mode',
    })
  }

  const resetRound = async () => {
    await mutateGame('/api/game/control', {
      action: 'reset-round',
    })
  }

  if (!roomId) {
    return (
      <section className="rounded-[1.8rem] border border-violet-400/10 bg-[#0f0b1a] p-8 text-center">
        <h3 className="text-2xl font-semibold text-white">Selecciona una sala</h3>
        <p className="mt-2 text-zinc-400">La mesa se cargara aqui cuando abras una partida desde el lobby.</p>
      </section>
    )
  }

  if (isLoading && !game) {
    return (
      <section className="rounded-[1.8rem] border border-violet-400/10 bg-[#0f0b1a] p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-violet-300/70">REY30VERSE TABLE CORE</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Levantando la mesa</h3>
        <p className="mt-2 text-zinc-400">Sincronizando mano, turnos, bots y resumen de la ronda.</p>
      </section>
    )
  }

  if (!game) {
    return (
      <section className="rounded-[1.8rem] border border-violet-400/10 bg-[#0f0b1a] p-8">
        <h3 className="text-3xl font-semibold text-white">Mesa no disponible</h3>
        <p className="mt-2 text-zinc-400">{error ?? 'No se pudo recuperar el estado de la partida.'}</p>
        <Button
          onClick={() => void loadGame()}
          className="mt-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
        >
          Reintentar
        </Button>
      </section>
    )
  }

  const mySeat = game.seats.find((seat) => seat.isMe)
  const canPlay = Boolean(mySeat?.isTurn) && game.status !== 'finished'
  const selectedCard = game.hand.find((card) => card.id === selectedCardId)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 rounded-[1.7rem] border border-violet-400/10 bg-[#0f0b1a] p-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="border-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
              <Crown className="mr-1 h-3.5 w-3.5" />
              Mesa Clasica 13 • Ronda {game.roundNumber}
            </Badge>
            <Badge className="border border-violet-400/10 bg-white/[0.04] text-zinc-300">
              Baza {game.trickNumber}
            </Badge>
            <Badge className="border border-violet-400/10 bg-white/[0.04] text-zinc-300">13 cartas por jugador</Badge>
            <Badge className="border border-violet-400/10 bg-white/[0.04] text-zinc-300">
              {game.currentTurnLabel}
            </Badge>
            {game.crownsReleased ? (
              <Badge className="border-0 bg-rose-500/20 text-rose-200">Corazones habilitados</Badge>
            ) : null}
          </div>
          <h3 className="mt-3 text-3xl font-semibold text-white">{game.roomName}</h3>
          <p className="mt-1 text-zinc-400">{game.summary}</p>
          {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={() => void resetRound()}
            disabled={isMutating}
            className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Nueva ronda
          </Button>
          <Button
            variant="outline"
            onClick={() => void toggleDarkMode()}
            disabled={isMutating}
            className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          >
            <MoonStar className="mr-2 h-4 w-4" />
            {game.controls.darkMode ? 'Modo oscuro' : 'Modo claro'}
          </Button>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.86fr]">
        <section className="rounded-[1.9rem] border border-violet-400/10 bg-[#0f0b1a] p-4 lg:p-5">
          <div className="table-stage min-h-[38rem] p-4 lg:p-6">
            <div className="flex items-center justify-between gap-3">
              <Badge className="status-chip border-0 bg-white/[0.06] text-zinc-100">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                Estado vivo
              </Badge>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void toggleVoice()}
                  disabled={isMutating}
                  className={cn(
                    'rounded-full border border-white/10 bg-white/[0.08] text-zinc-200 hover:bg-white/[0.14]',
                    game.controls.voiceEnabled ? 'text-emerald-300' : 'text-rose-300'
                  )}
                >
                  {game.controls.voiceEnabled ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void toggleChat()}
                  disabled={isMutating}
                  className={cn(
                    'rounded-full border border-white/10 bg-white/[0.08] text-zinc-200 hover:bg-white/[0.14]',
                    game.controls.tableChatEnabled ? 'text-cyan-300' : 'text-zinc-500'
                  )}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => void toggleSound()}
                  disabled={isMutating}
                  className={cn(
                    'rounded-full border border-white/10 bg-white/[0.08] text-zinc-200 hover:bg-white/[0.14]',
                    game.controls.soundEnabled ? 'text-fuchsia-300' : 'text-zinc-500'
                  )}
                >
                  <Volume2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="relative mt-6 min-h-[21rem]">
              {game.seats.map((seat) => {
                const positionClasses = {
                  top: 'absolute left-1/2 top-0 -translate-x-1/2',
                  left: 'absolute left-0 top-1/2 -translate-y-1/2',
                  right: 'absolute right-0 top-1/2 -translate-y-1/2',
                  bottom: 'absolute bottom-0 left-1/2 -translate-x-1/2',
                }

                return (
                  <div key={seat.seat} className={cn('text-center', positionClasses[seat.position])}>
                    <Avatar
                      className={cn(
                        'mx-auto h-12 w-12 border',
                        seat.isTurn ? 'border-amber-300 shadow-[0_0_22px_rgba(250,204,21,0.4)]' : 'border-white/10'
                      )}
                    >
                      <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.avatar}`} />
                      <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                        {seat.name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <p className="mt-2 text-sm font-medium text-white">{seat.name}</p>
                    <p className="text-xs text-zinc-400">
                      {seat.cardsRemaining} cartas • {seat.score} pts
                    </p>
                    <p className={cn('text-xs', seat.isTurn ? 'text-amber-300' : 'text-zinc-500')}>
                      {seat.statusLabel}
                    </p>
                  </div>
                )
              })}

              <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-3">
                {game.tableCards.length ? (
                  game.tableCards.map((entry, index) => (
                    <div
                      key={`${entry.seat}-${entry.card.id}`}
                      className={cn(
                        index === 0 ? '-translate-y-7' : index === 1 ? '-translate-x-5' : index === 2 ? 'translate-x-5' : 'translate-y-7'
                      )}
                    >
                      <TableCard card={entry.card} disabled />
                      <p className="mt-2 text-center text-xs text-zinc-300">{entry.playerName}</p>
                    </div>
                  ))
                ) : (
                  <div className="flex h-28 w-20 items-center justify-center rounded-[1.4rem] border border-dashed border-violet-400/30 text-center text-sm text-zinc-500">
                    Esperando jugada
                  </div>
                )}
              </div>
            </div>

            <div className="mt-8 rounded-[1.5rem] border border-white/[0.08] bg-black/20 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium text-white">Tu mano</p>
                  <p className="text-xs text-zinc-500">
                    {canPlay ? 'Selecciona una carta valida y juegala.' : 'Espera a que la mesa te devuelva el turno.'}
                  </p>
                </div>
                <Button
                  onClick={() => void playSelectedCard()}
                  disabled={!selectedCardId || !canPlay || isMutating}
                  className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {selectedCard ? `Jugar ${selectedCard.label}${suitMeta[selectedCard.suit].symbol}` : 'Jugar carta'}
                </Button>
              </div>

              <div className="mt-4 flex flex-wrap justify-center gap-2 lg:gap-3">
                {game.hand.map((card) => (
                  <TableCard
                    key={card.id}
                    card={card}
                    selected={selectedCardId === card.id}
                    disabled={!canPlay || isMutating}
                    onClick={() => setSelectedCardId((current) => (current === card.id ? null : card.id))}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[1.75rem] border border-violet-400/10 bg-[#0f0b1a] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Marcador</p>
                <h4 className="mt-2 text-2xl font-semibold text-white">Ranking total</h4>
              </div>
              <Badge className="border-0 bg-amber-500/20 text-amber-200">Baja puntuacion gana</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {game.standings.map((seat, index) => (
                <div key={seat.seat} className="rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] px-4 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold',
                        index === 0 ? 'bg-amber-400 text-slate-950' : 'bg-white/[0.08] text-zinc-200'
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className={cn('font-medium', seat.isMe ? 'text-white' : 'text-zinc-200')}>{seat.name}</p>
                      <p className="text-xs text-zinc-500">
                        {seat.tricksWon} bazas • {seat.roundPoints} pts en ronda
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-fuchsia-200">{seat.score}</p>
                      <p className="text-[0.68rem] uppercase tracking-[0.16em] text-zinc-500">Total</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-violet-400/10 bg-[#0f0b1a] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Control de sala</p>
                <h4 className="mt-2 text-2xl font-semibold text-white">Persistencia activa</h4>
              </div>
              <Badge className="border-0 bg-cyan-500/20 text-cyan-100">{game.controls.tableZoom}%</Badge>
            </div>

            <div className="mt-4 space-y-3">
              {[
                ['Voz', game.controls.voiceEnabled ? 'Activa' : 'Silenciada'],
                ['Efectos', game.controls.soundEnabled ? 'Activos' : 'Silenciados'],
                ['Chat de mesa', game.controls.tableChatEnabled ? 'Visible' : 'Pausado'],
                ['Tema', game.controls.darkMode ? 'Oscuro' : 'Claro'],
                ['Escala cartas', `${game.controls.cardScale}%`],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-[1rem] bg-white/[0.04] px-4 py-3">
                  <span className="text-sm text-zinc-300">{label}</span>
                  <span className="text-sm font-medium text-white">{value}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-violet-400/10 bg-[#0f0b1a] p-5">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Historial</p>
              <h4 className="mt-2 text-2xl font-semibold text-white">Bitacora de la mesa</h4>
            </div>

            <ScrollArea className="mt-4 h-72 pr-3">
              <div className="space-y-3">
                {game.recentEvents.map((event) => (
                  <div key={event.id} className="rounded-[1rem] border border-white/[0.08] bg-white/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <Badge className="border-0 bg-violet-500/15 text-violet-100">{event.type}</Badge>
                      <span className="text-xs text-zinc-500">{event.createdAt}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-200">{event.summary}</p>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </section>
        </aside>
      </div>
    </div>
  )
}
