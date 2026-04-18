'use client'

import { useEffect, useMemo, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ChatMessageSnapshot, GameCardSnapshot, GameEffectHistorySnapshot, GameSnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { WorkspaceShell } from '@/components/rey30/workspace'
import type { DockPanelDefinition, DockPanelState } from '@/components/rey30/panels'
import {
  Crown,
  Ban,
  Layers3,
  MessageCircle,
  Mic,
  MicOff,
  MoonStar,
  PanelRightOpen,
  RotateCcw,
  Send,
  Settings2,
  ShieldCheck,
  Sparkles,
  Users,
  Volume2,
} from 'lucide-react'

interface CardGameProps {
  roomId: string | null
}

const TABLE_ZOOM_BASE = 82
const CARD_SCALE_BASE = 72

const suitMeta = {
  crowns: { symbol: '♥', color: 'text-rose-400', ink: '#fb7185' },
  diamonds: { symbol: '♦', color: 'text-orange-300', ink: '#fdba74' },
  clubs: { symbol: '♣', color: 'text-zinc-900', ink: '#18181b' },
  spades: { symbol: '♠', color: 'text-cyan-700', ink: '#0891b2' },
} as const

const elementMeta = {
  fire: { symbol: 'F', label: 'Fuego', ink: '#ff4a1c' },
  water: { symbol: 'A', label: 'Agua', ink: '#0ea5e9' },
  earth: { symbol: 'T', label: 'Tierra', ink: '#84cc16' },
  air: { symbol: 'Ai', label: 'Aire', ink: '#67e8f9' },
  lightning: { symbol: 'R', label: 'Rayo', ink: '#facc15' },
  shadow: { symbol: 'S', label: 'Sombra', ink: '#7c3aed' },
  light: { symbol: 'L', label: 'Luz', ink: '#f8fafc' },
} as const

type EffectHistoryFilter = GameEffectHistorySnapshot['type'] | 'all'
type AnimatedEffectType = Extract<GameEffectHistorySnapshot['type'], 'protect-points' | 'block-card' | 'shift-turn'>

const effectHistoryFilters: Array<{ id: EffectHistoryFilter; label: string }> = [
  { id: 'all', label: 'Todos' },
  { id: 'score', label: 'Daño' },
  { id: 'protect-points', label: 'Proteccion' },
  { id: 'block-card', label: 'Bloqueo' },
  { id: 'shift-turn', label: 'Turno' },
  { id: 'draw-card', label: 'Robo' },
]

const effectTone: Record<GameEffectHistorySnapshot['type'], string> = {
  'draw-card': 'border-yellow-300/20 bg-yellow-500/10 text-yellow-100',
  'block-card': 'border-rose-300/20 bg-rose-500/10 text-rose-100',
  'shift-turn': 'border-violet-300/20 bg-violet-500/10 text-violet-100',
  'protect-points': 'border-cyan-300/20 bg-cyan-500/10 text-cyan-100',
  score: 'border-emerald-300/20 bg-emerald-500/10 text-emerald-100',
}

const effectAnimationTone: Record<AnimatedEffectType, string> = {
  'protect-points': 'border-cyan-300/30 bg-cyan-500/15 text-cyan-100 shadow-cyan-500/15',
  'block-card': 'border-rose-300/30 bg-rose-500/15 text-rose-100 shadow-rose-500/15',
  'shift-turn': 'border-violet-300/30 bg-violet-500/15 text-violet-100 shadow-violet-500/15',
}

const effectHaloTone: Record<AnimatedEffectType, string> = {
  'protect-points': 'border-cyan-300/25 bg-cyan-400/10',
  'block-card': 'border-rose-300/25 bg-rose-400/10',
  'shift-turn': 'border-violet-300/25 bg-violet-400/10',
}

function isAnimatedEffect(effect: GameEffectHistorySnapshot): effect is GameEffectHistorySnapshot & { type: AnimatedEffectType } {
  return effect.type === 'protect-points' || effect.type === 'block-card' || effect.type === 'shift-turn'
}

const gamePanels: DockPanelDefinition[] = [
  { id: 'players', title: 'Jugadores', zone: 'left', status: 'open', order: 0 },
  { id: 'settings', title: 'Ajustes', zone: 'right', status: 'open', order: 1 },
  { id: 'chat', title: 'Chat', zone: 'right', status: 'collapsed', order: 2 },
  { id: 'events', title: 'Eventos', zone: 'bottom', status: 'collapsed', order: 3 },
]

function getCardPresentation(card: GameCardSnapshot) {
  if (card.suit && suitMeta[card.suit]) {
    const meta = suitMeta[card.suit]
    return {
      symbol: meta.symbol,
      label: `${card.label}${meta.symbol}`,
      ink: meta.ink,
      subtitle: card.name ?? card.suit,
    }
  }

  if (card.element && elementMeta[card.element]) {
    const meta = elementMeta[card.element]
    return {
      symbol: meta.symbol,
      label: `${meta.label} ${card.label}`,
      ink: card.themeColor ?? meta.ink,
      subtitle: card.moduleId ?? 'elemental',
    }
  }

  return {
    symbol: '•',
    label: card.name ?? card.label,
    ink: card.themeColor ?? '#e5e7eb',
    subtitle: card.type ?? 'card',
  }
}

function formatCardLabel(card?: GameCardSnapshot | null) {
  if (!card) {
    return 'Jugar carta'
  }

  return `Jugar ${getCardPresentation(card).label}`
}

function TableChatMessage({ message }: { message: ChatMessageSnapshot }) {
  return (
    <div className={cn('flex gap-2', message.user.isMe && 'justify-end')}>
      {!message.user.isMe ? (
        <Avatar className="h-8 w-8 border border-white/10">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user.avatar}`} />
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-[0.65rem] text-white">
            {message.user.name[0]}
          </AvatarFallback>
        </Avatar>
      ) : null}
      <div
        className={cn(
          'max-w-[88%] rounded-lg px-3 py-2',
          message.user.isMe ? 'bg-violet-500 text-white' : 'bg-white/[0.05] text-zinc-100'
        )}
      >
        <div className="flex items-center gap-2">
          <span className={cn('text-xs font-medium', message.user.isMe ? 'text-white/80' : 'text-cyan-300')}>
            {message.user.name}
          </span>
          <span className={cn('text-[0.7rem]', message.user.isMe ? 'text-white/70' : 'text-zinc-500')}>
            {message.timestamp}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}

function GameCard({
  card,
  selected,
  onClick,
  disabled,
  compact,
}: {
  card: GameCardSnapshot
  selected?: boolean
  onClick?: () => void
  disabled?: boolean
  compact?: boolean
}) {
  const presentation = getCardPresentation(card)
  const isDanger = card.suit === 'spades' && card.rank === 12
  const isBlocked = Boolean(card.isBlocked)

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={isBlocked ? `${presentation.label} bloqueada` : presentation.label}
      className={cn(
        'relative flex shrink-0 flex-col items-center justify-center rounded-lg border bg-zinc-50 shadow-[0_16px_34px_rgba(0,0,0,0.34)] transition',
        compact ? 'h-20 w-14' : 'h-24 w-16 md:h-28 md:w-20',
        selected ? '-translate-y-3 border-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.35)]' : 'border-white/10',
        isBlocked && 'border-rose-300/80 ring-2 ring-rose-400/35',
        disabled ? 'cursor-not-allowed opacity-60' : 'hover:-translate-y-2 focus-visible:-translate-y-2'
      )}
      style={{ color: presentation.ink }}
    >
      {isBlocked ? (
        <span className="absolute inset-0 z-10 flex items-center justify-center rounded-lg bg-rose-950/55 text-rose-100 backdrop-blur-[1px]">
          <Ban className="h-6 w-6" />
        </span>
      ) : null}
      <span className="text-xl font-black leading-none">{card.label}</span>
      <span className="mt-1 text-3xl font-black leading-none">{presentation.symbol}</span>
      <span className="absolute bottom-2 max-w-[80%] truncate text-[0.58rem] font-semibold uppercase tracking-[0.12em] opacity-50">
        {presentation.subtitle}
      </span>
      {isBlocked ? (
        <Badge className="absolute -left-2 -top-2 z-20 border-0 bg-rose-500 px-1.5 py-0.5 text-[0.58rem] text-white">
          LOCK
        </Badge>
      ) : null}
      {isDanger ? (
        <Badge className="absolute -right-2 -top-2 border-0 bg-rose-500 px-1.5 py-0.5 text-[0.62rem] text-white">
          13
        </Badge>
      ) : null}
    </button>
  )
}

function PlayerStrip({ game }: { game: GameSnapshot }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {game.seats.slice(0, 10).map((seat) => (
        <div
          key={seat.seat}
          className={cn(
            'flex min-w-0 items-center gap-3 rounded-lg border bg-white/[0.035] px-3 py-2',
            seat.isTurn ? 'border-amber-300/50 shadow-[0_0_22px_rgba(250,204,21,0.15)]' : 'border-white/[0.07]'
          )}
        >
          <Avatar className="h-9 w-9 border border-white/10">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.avatar}`} />
            <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
              {seat.name[0]}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{seat.name}</p>
            <p className="truncate text-xs text-zinc-500">
              {seat.cardsRemaining} cartas · {seat.score} {game.scoring?.pointsLabel ?? 'pts'}
            </p>
          </div>
          {seat.blockedCards ? <Ban className="h-4 w-4 text-rose-300" /> : null}
          {seat.protectedPoints ? <ShieldCheck className="h-4 w-4 text-cyan-300" /> : null}
          <span
            className={cn(
              'h-2.5 w-2.5 rounded-full',
              seat.isTurn ? 'bg-amber-300' : seat.isConnected ? 'bg-emerald-400' : 'bg-zinc-600'
            )}
          />
        </div>
      ))}
    </div>
  )
}

function GameTableViewport({
  game,
  tableScale,
  cardScale,
}: {
  game: GameSnapshot
  tableScale: number
  cardScale: number
}) {
  const tableCards = game.tableCards
  const radiusX = 34
  const radiusY = 28
  const latestAnimatedEffects = useMemo(() => {
    const animatedEffects = (game.effectHistory ?? []).filter(isAnimatedEffect)
    const leadEffect = animatedEffects[0]

    if (!leadEffect) {
      return []
    }

    return animatedEffects.filter((effect, index) => index === 0 || effect.cardId === leadEffect.cardId).slice(0, 3)
  }, [game.effectHistory])
  const [visibleAnimatedEffects, setVisibleAnimatedEffects] = useState(latestAnimatedEffects)
  const latestAnimatedEffectIds = latestAnimatedEffects.map((effect) => effect.id).join('|')
  const hasVisibleEffectChain = visibleAnimatedEffects.length >= 2

  useEffect(() => {
    if (!latestAnimatedEffects.length) {
      const clearTimeoutId = window.setTimeout(() => setVisibleAnimatedEffects([]), 0)
      return () => window.clearTimeout(clearTimeoutId)
    }

    const mergeTimeout = window.setTimeout(() => setVisibleAnimatedEffects((current) => {
      const merged = new Map<string, GameEffectHistorySnapshot & { type: AnimatedEffectType }>()

      for (const effect of latestAnimatedEffects) {
        merged.set(effect.id, effect)
      }

      for (const effect of current) {
        if (!merged.has(effect.id)) {
          merged.set(effect.id, effect)
        }
      }

      return Array.from(merged.values()).slice(0, 3)
    }), 0)

    const clearTimeoutId = window.setTimeout(() => {
      setVisibleAnimatedEffects((current) => current.filter((effect) => !latestAnimatedEffects.some((entry) => entry.id === effect.id)))
    }, 3600)

    return () => {
      window.clearTimeout(mergeTimeout)
      window.clearTimeout(clearTimeoutId)
    }
  }, [latestAnimatedEffectIds, latestAnimatedEffects])

  return (
    <section
      className="relative min-h-[28rem] overflow-hidden rounded-lg border border-cyan-300/10 bg-[#080b12] p-4 md:min-h-[34rem]"
      data-testid="game-table-viewport"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.14),transparent_55%)]" />
      {visibleAnimatedEffects.length ? (
        <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center">
          {visibleAnimatedEffects.map((effect, index) => (
            <span
              key={`halo-${effect.id}`}
              className={cn(
                'absolute h-36 w-36 rounded-full border opacity-0 animate-[ping_1.8s_cubic-bezier(0,0,0.2,1)_1]',
                effectHaloTone[effect.type]
              )}
              style={{
                animationDelay: `${index * 140}ms`,
                transform: `scale(${1 + index * 0.22})`,
              }}
            />
          ))}
        </div>
      ) : null}
      {hasVisibleEffectChain ? (
        <div className="pointer-events-none absolute left-1/2 top-4 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full border border-amber-300/25 bg-amber-500/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-amber-100 shadow-2xl shadow-amber-500/10 backdrop-blur animate-[pulse_1.2s_ease-in-out_3]">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-300 opacity-60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-amber-200" />
          </span>
          Cadena elemental x{visibleAnimatedEffects.length}
          <span className="flex items-center gap-1">
            {visibleAnimatedEffects.map((effect) => (
              <span key={`chain-${effect.id}`} className={cn('h-1.5 w-5 rounded-full', effectHaloTone[effect.type])} />
            ))}
          </span>
        </div>
      ) : null}
      {visibleAnimatedEffects.length ? (
        <div className="pointer-events-none absolute right-4 top-4 z-20 flex w-[min(20rem,calc(100%-2rem))] flex-col gap-2">
          {visibleAnimatedEffects.map((effect, index) => (
            <div
              key={effect.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-3 py-2 text-sm shadow-2xl backdrop-blur transition-transform animate-[pulse_1.4s_ease-in-out_2]',
                effectAnimationTone[effect.type],
                index > 0 && 'scale-[0.97] opacity-85'
              )}
              style={{ animationDelay: `${index * 110}ms` }}
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-current/20 bg-black/25">
                {effect.type === 'protect-points' ? <ShieldCheck className="h-4 w-4" /> : null}
                {effect.type === 'block-card' ? <Ban className="h-4 w-4" /> : null}
                {effect.type === 'shift-turn' ? <RotateCcw className="h-4 w-4" /> : null}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-semibold">{effect.effectName}</span>
                <span className="block truncate text-xs opacity-75">{effect.summary}</span>
              </span>
            </div>
          ))}
        </div>
      ) : null}
      <div
        className="relative mx-auto flex min-h-[24rem] max-w-[58rem] items-center justify-center transition-transform duration-300 md:min-h-[30rem]"
        style={{ transform: `scale(${tableScale})`, transformOrigin: 'center center' }}
      >
        <div className="relative flex h-[22rem] w-full max-w-[48rem] items-center justify-center rounded-[50%] border border-cyan-300/25 bg-[radial-gradient(circle_at_center,rgba(15,23,42,0.92),rgba(6,8,14,0.98)_62%)] shadow-[inset_0_0_80px_rgba(34,211,238,0.08),0_30px_90px_rgba(0,0,0,0.35)] md:h-[27rem]">
          <div className="absolute top-5 rounded-full border border-white/[0.08] bg-black/25 px-4 py-2 text-center">
            <p className="text-xs uppercase tracking-[0.22em] text-cyan-200/80">{game.currentTurnLabel}</p>
            <p className="mt-1 text-sm text-zinc-400">Choque/Baza {game.trickNumber}</p>
          </div>

          {tableCards.length ? (
            tableCards.map((entry, index) => {
              const angle = (Math.PI * 2 * index) / Math.max(tableCards.length, 4) - Math.PI / 2
              const x = Math.cos(angle) * radiusX
              const y = Math.sin(angle) * radiusY

              return (
                <div
                  key={`${entry.seat}-${entry.card.id}`}
                  className="absolute text-center"
                  style={{
                    left: `${50 + x}%`,
                    top: `${50 + y}%`,
                    transform: `translate(-50%, -50%) scale(${cardScale})`,
                    transformOrigin: 'center center',
                  }}
                >
                  <GameCard card={entry.card} disabled compact={tableCards.length > 6} />
                  <p className="mt-2 max-w-24 truncate text-xs text-zinc-300">{entry.playerName}</p>
                </div>
              )
            })
          ) : (
            <div className="flex h-32 w-24 items-center justify-center rounded-lg border border-dashed border-cyan-300/25 bg-black/25 px-3 text-center text-sm text-zinc-500">
              Esperando jugada
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function GameHandDock({
  game,
  selectedCardId,
  cardScale,
  canPlay,
  isMutating,
  onSelectCard,
  onPlay,
}: {
  game: GameSnapshot
  selectedCardId: string | null
  cardScale: number
  canPlay: boolean
  isMutating: boolean
  onSelectCard: (cardId: string) => void
  onPlay: () => void
}) {
  const playableCardIds = useMemo(() => new Set(game.playableCardIds), [game.playableCardIds])
  const selectedCard = game.hand.find((card) => card.id === selectedCardId)
  const blockedCards = game.playerEffects?.blockedCards ?? game.hand.filter((card) => card.isBlocked).length
  const protectedPoints = game.playerEffects?.protectedPoints ?? 0

  return (
    <section className="rounded-lg border border-white/[0.08] bg-[#101019] p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Tu mano</p>
          <p className="text-xs text-zinc-500">{canPlay ? game.ruleHint : 'Espera a que vuelva tu turno.'}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {protectedPoints > 0 ? (
            <Badge className="border border-cyan-300/20 bg-cyan-500/10 text-cyan-100">
              <ShieldCheck className="mr-1 h-3.5 w-3.5" />
              Escudo {protectedPoints}
            </Badge>
          ) : null}
          {blockedCards > 0 ? (
            <Badge className="border border-rose-300/20 bg-rose-500/10 text-rose-100">
              <Ban className="mr-1 h-3.5 w-3.5" />
              {blockedCards} bloqueada{blockedCards > 1 ? 's' : ''}
            </Badge>
          ) : null}
          <Badge className="border border-emerald-400/20 bg-emerald-500/10 text-emerald-100">
            {playableCardIds.size} jugables
          </Badge>
          <Button
            type="button"
            onClick={onPlay}
            disabled={!selectedCardId || !canPlay || isMutating}
            className="rounded-md bg-cyan-400 px-4 font-semibold text-slate-950 hover:bg-cyan-300"
          >
            <Send className="mr-2 h-4 w-4" />
            {formatCardLabel(selectedCard)}
          </Button>
        </div>
      </div>

      <div className="mt-4 overflow-x-auto pb-3">
        <div className="flex min-h-36 items-end gap-2 px-1">
          {game.hand.map((card) => (
            <div
              key={card.id}
              style={{
                transform: `scale(${cardScale})`,
                transformOrigin: 'center bottom',
              }}
            >
              <GameCard
                card={card}
                selected={selectedCardId === card.id}
                disabled={!canPlay || isMutating || !playableCardIds.has(card.id)}
                onClick={() => onSelectCard(card.id)}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

function EffectHistoryStrip({ effects }: { effects: GameEffectHistorySnapshot[] }) {
  const [activeFilter, setActiveFilter] = useState<EffectHistoryFilter>('all')
  const visibleEffects = useMemo(
    () => (activeFilter === 'all' ? effects : effects.filter((effect) => effect.type === activeFilter)),
    [activeFilter, effects]
  )

  if (!effects.length) {
    return null
  }

  return (
    <section className="rounded-lg border border-cyan-300/10 bg-[#0c111b] p-4" data-testid="game-effect-history-panel">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-white">Historial de efectos</p>
          <p className="text-xs text-zinc-500">Resoluciones recientes del motor elemental.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {effectHistoryFilters.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setActiveFilter(filter.id)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                activeFilter === filter.id
                  ? 'border-cyan-300/35 bg-cyan-500/15 text-cyan-100'
                  : 'border-white/[0.08] bg-black/20 text-zinc-400 hover:border-white/15 hover:text-white'
              )}
            >
              {filter.label}
            </button>
          ))}
          <Badge className="border border-cyan-300/15 bg-cyan-500/10 text-cyan-100">
            {visibleEffects.length}/{effects.length}
          </Badge>
        </div>
      </div>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
        {visibleEffects.length ? (
          visibleEffects.slice(0, 8).map((effect) => (
            <article
              key={effect.id}
              className={cn(
                'h-28 min-w-[16rem] overflow-hidden rounded-lg border p-3',
                effectTone[effect.type] ?? 'border-white/[0.08] bg-white/[0.04] text-zinc-100'
              )}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-sm font-semibold">{effect.effectName}</span>
                <span className="text-[0.65rem] uppercase tracking-[0.16em] opacity-70">{effect.type}</span>
              </div>
              <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-300">{effect.summary}</p>
              <p className="mt-2 text-[0.65rem] uppercase tracking-[0.16em] text-zinc-500">
                Seat {effect.actorSeat + 1}
                {effect.targetSeat != null ? ` -> Seat ${effect.targetSeat + 1}` : ''}
              </p>
            </article>
          ))
        ) : (
          <div className="flex h-28 min-w-[16rem] items-center rounded-lg border border-dashed border-white/[0.08] bg-black/20 p-3 text-sm text-zinc-500">
            No hay efectos de este tipo en la ronda.
          </div>
        )}
      </div>
    </section>
  )
}

function PlayersPanel({ game }: { game: GameSnapshot }) {
  return (
    <div className="space-y-3">
      {game.seats.map((seat) => (
        <div key={seat.seat} className="rounded-lg border border-white/[0.07] bg-white/[0.035] p-3">
          <div className="flex items-center gap-3">
            <Avatar className="h-9 w-9 border border-white/10">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.avatar}`} />
              <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-500 text-white">
                {seat.name[0]}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{seat.name}</p>
              <p className="truncate text-xs text-zinc-500">{seat.statusLabel}</p>
            </div>
            {seat.protectedPoints ? (
              <Badge className="border-0 bg-cyan-500/15 text-cyan-100">
                <ShieldCheck className="mr-1 h-3 w-3" />
                {seat.protectedPoints}
              </Badge>
            ) : null}
            {seat.blockedCards ? (
              <Badge className="border-0 bg-rose-500/15 text-rose-100">
                <Ban className="mr-1 h-3 w-3" />
                {seat.blockedCards}
              </Badge>
            ) : null}
            <Badge className={cn('border-0', seat.isTurn ? 'bg-amber-400 text-slate-950' : 'bg-white/[0.08] text-zinc-200')}>
              {seat.cardsRemaining}
            </Badge>
          </div>
        </div>
      ))}
      <div className="rounded-lg border border-white/[0.07] bg-black/20 p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Ranking</p>
        {game.scoring?.pointPolarity === 'low-score-wins' ? (
          <p className="mt-1 text-xs text-zinc-500">Menor {game.scoring.pointsLabel ?? 'puntaje'} lidera.</p>
        ) : null}
        <div className="mt-3 space-y-2">
          {game.standings.map((seat, index) => (
            <div key={seat.seat} className="flex items-center justify-between gap-3 text-sm">
              <span className={cn('truncate', seat.isMe ? 'font-semibold text-white' : 'text-zinc-300')}>
                {index + 1}. {seat.name}
              </span>
              <span className="text-cyan-200">
                {seat.score} {game.scoring?.pointsLabel ?? 'pts'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function SettingsPanel({
  game,
  tableZoomDraft,
  cardScaleDraft,
  isMutating,
  onTableZoomChange,
  onTableZoomCommit,
  onCardScaleChange,
  onCardScaleCommit,
  onToggleVoice,
  onToggleChat,
  onToggleSound,
  onToggleDarkMode,
  onResetRound,
}: {
  game: GameSnapshot
  tableZoomDraft: number
  cardScaleDraft: number
  isMutating: boolean
  onTableZoomChange: (value: number) => void
  onTableZoomCommit: (value: number) => void
  onCardScaleChange: (value: number) => void
  onCardScaleCommit: (value: number) => void
  onToggleVoice: () => void
  onToggleChat: () => void
  onToggleSound: () => void
  onToggleDarkMode: () => void
  onResetRound: () => void
}) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-white/[0.07] bg-white/[0.035] p-3">
        <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Modo</p>
        <h4 className="mt-2 text-lg font-semibold text-white">{game.tableModeLabel ?? 'Mesa clasica'}</h4>
        <p className="mt-1 text-sm text-zinc-400">{game.summary}</p>
        {game.scoring ? (
          <div className="mt-3 rounded-md border border-white/[0.08] bg-black/25 p-3">
            <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Scoring</p>
            <p className="mt-1 text-sm text-zinc-300">{game.scoring.summary}</p>
            {game.scoring.protectionRule ? (
              <p className="mt-2 text-xs text-cyan-200">
                <ShieldCheck className="mr-1 inline h-3.5 w-3.5" />
                {game.scoring.protectionRule}
              </p>
            ) : null}
          </div>
        ) : null}
        {game.deck ? (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            <div className="rounded-md bg-black/25 p-2">
              <p className="text-sm font-semibold text-white">{game.deck.totalCards}</p>
              <p className="text-[0.65rem] text-zinc-500">cartas</p>
            </div>
            <div className="rounded-md bg-black/25 p-2">
              <p className="text-sm font-semibold text-white">{game.deck.cardsPerPlayer}</p>
              <p className="text-[0.65rem] text-zinc-500">mano</p>
            </div>
            <div className="rounded-md bg-black/25 p-2">
              <p className="text-sm font-semibold text-white">{game.deck.modules.length}</p>
              <p className="text-[0.65rem] text-zinc-500">modulos</p>
            </div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="outline" onClick={onToggleVoice} disabled={isMutating} className="rounded-md border-white/[0.08] bg-white/[0.04] text-zinc-200">
          {game.controls.voiceEnabled ? <Mic className="mr-2 h-4 w-4 text-emerald-300" /> : <MicOff className="mr-2 h-4 w-4 text-rose-300" />}
          Voz
        </Button>
        <Button type="button" variant="outline" onClick={onToggleChat} disabled={isMutating} className="rounded-md border-white/[0.08] bg-white/[0.04] text-zinc-200">
          <MessageCircle className="mr-2 h-4 w-4 text-cyan-300" />
          Chat
        </Button>
        <Button type="button" variant="outline" onClick={onToggleSound} disabled={isMutating} className="rounded-md border-white/[0.08] bg-white/[0.04] text-zinc-200">
          <Volume2 className="mr-2 h-4 w-4 text-fuchsia-300" />
          Audio
        </Button>
        <Button type="button" variant="outline" onClick={onToggleDarkMode} disabled={isMutating} className="rounded-md border-white/[0.08] bg-white/[0.04] text-zinc-200">
          <MoonStar className="mr-2 h-4 w-4 text-violet-300" />
          Tema
        </Button>
      </div>

      <div className="space-y-4 rounded-lg border border-white/[0.07] bg-white/[0.035] p-3">
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-300">Escala de mesa</span>
            <span className="text-zinc-500">{tableZoomDraft}%</span>
          </div>
          <Slider
            value={[tableZoomDraft]}
            min={60}
            max={120}
            step={2}
            onValueChange={(value) => onTableZoomChange(value[0])}
            onValueCommit={(value) => onTableZoomCommit(value[0])}
          />
        </div>
        <div>
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-zinc-300">Escala de mano</span>
            <span className="text-zinc-500">{cardScaleDraft}%</span>
          </div>
          <Slider
            value={[cardScaleDraft]}
            min={50}
            max={120}
            step={2}
            onValueChange={(value) => onCardScaleChange(value[0])}
            onValueCommit={(value) => onCardScaleCommit(value[0])}
          />
        </div>
      </div>

      <Button type="button" onClick={onResetRound} disabled={isMutating} className="w-full rounded-md bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300">
        <RotateCcw className="mr-2 h-4 w-4" />
        Nueva ronda
      </Button>
    </div>
  )
}

function ChatPanel({
  game,
  message,
  isSending,
  onMessageChange,
  onSend,
}: {
  game: GameSnapshot
  message: string
  isSending: boolean
  onMessageChange: (value: string) => void
  onSend: () => void
}) {
  return (
    <div className="space-y-3">
      <Badge className={cn('border-0', game.controls.tableChatEnabled ? 'bg-cyan-500/20 text-cyan-100' : 'bg-zinc-700 text-zinc-300')}>
        {game.controls.tableChatEnabled ? 'Activo' : 'Pausado'}
      </Badge>
      <ScrollArea className="h-72 pr-2">
        {game.tableMessages.length ? (
          <div className="space-y-3">
            {game.tableMessages.map((chatMessage) => (
              <TableChatMessage key={chatMessage.id} message={chatMessage} />
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
            La mesa todavia no tiene mensajes.
          </div>
        )}
      </ScrollArea>
      <div className="flex gap-2">
        <input
          value={message}
          onChange={(event) => onMessageChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              onSend()
            }
          }}
          disabled={!game.controls.tableChatEnabled || isSending}
          placeholder={game.controls.tableChatEnabled ? 'Mensaje...' : 'Chat pausado'}
          className="h-10 min-w-0 flex-1 rounded-md border border-white/[0.08] bg-black/25 px-3 text-sm text-white outline-none placeholder:text-zinc-500 focus:border-cyan-300/50"
        />
        <Button type="button" size="icon" onClick={onSend} disabled={!game.controls.tableChatEnabled || !message.trim() || isSending} className="rounded-md bg-cyan-400 text-slate-950 hover:bg-cyan-300">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}

function EventsPanel({ game }: { game: GameSnapshot }) {
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
      {game.recentEvents.map((event) => (
        <div
          key={event.id}
          className={cn(
            'rounded-lg border bg-white/[0.04] p-3',
            event.type === 'CUSTOM_EFFECT_RESOLVED' ? 'border-cyan-300/25 bg-cyan-500/[0.06]' : 'border-white/[0.08]'
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <Badge
              className={cn(
                'border-0',
                event.type === 'CUSTOM_EFFECT_RESOLVED'
                  ? 'bg-cyan-500/15 text-cyan-100'
                  : 'bg-violet-500/15 text-violet-100'
              )}
            >
              {event.type === 'CUSTOM_EFFECT_RESOLVED' ? 'EFECTO' : event.type}
            </Badge>
            <span className="text-xs text-zinc-500">{event.createdAt}</span>
          </div>
          <p className="mt-2 text-sm text-zinc-200">{event.summary}</p>
        </div>
      ))}
    </div>
  )
}

export function CardGame({ roomId }: CardGameProps) {
  const [game, setGame] = useState<GameSnapshot | null>(null)
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [tableChatMessage, setTableChatMessage] = useState('')
  const [tableZoomDraft, setTableZoomDraft] = useState(TABLE_ZOOM_BASE)
  const [cardScaleDraft, setCardScaleDraft] = useState(CARD_SCALE_BASE)
  const [isLoading, setIsLoading] = useState(true)
  const [isMutating, setIsMutating] = useState(false)
  const [isSendingChat, setIsSendingChat] = useState(false)
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
    eventSource.addEventListener('message-created', handleRealtime as EventListener)
    eventSource.addEventListener('room-updated', handleRealtime as EventListener)

    return () => {
      eventSource.close()
    }
  }, [roomId])

  useEffect(() => {
    if (!game) {
      return
    }

    setTableZoomDraft(game.controls.tableZoom)
    setCardScaleDraft(game.controls.cardScale)
  }, [game?.controls.tableZoom, game?.controls.cardScale])

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

  const updateTableSetting = async (action: 'set-table-zoom' | 'set-card-scale', value: number) => {
    await mutateGame('/api/game/control', {
      action,
      value,
    })
  }

  const sendTableMessage = async () => {
    if (!roomId || !tableChatMessage.trim() || !game?.controls.tableChatEnabled) {
      return
    }

    setIsSendingChat(true)

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId,
          content: tableChatMessage.trim(),
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el mensaje a la mesa.')
      }

      setTableChatMessage('')
      await loadGame(false)
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el mensaje a la mesa.')
    } finally {
      setIsSendingChat(false)
    }
  }

  if (!roomId) {
    return (
      <section className="rounded-lg border border-violet-400/10 bg-[#0f0b1a] p-8 text-center" data-testid="game-status-panel">
        <h3 className="text-2xl font-semibold text-white">Selecciona una sala</h3>
        <p className="mt-2 text-zinc-400">La mesa se cargara aqui cuando abras una partida desde el lobby.</p>
      </section>
    )
  }

  if (isLoading && !game) {
    return (
      <section className="rounded-lg border border-violet-400/10 bg-[#0f0b1a] p-8" data-testid="game-status-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-violet-300/70">REY30VERSE TABLE CORE</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Levantando la mesa</h3>
        <p className="mt-2 text-zinc-400">Sincronizando mano, turnos, bots y resumen de la ronda.</p>
      </section>
    )
  }

  if (!game) {
    return (
      <section className="rounded-lg border border-violet-400/10 bg-[#0f0b1a] p-8" data-testid="game-status-panel">
        <h3 className="text-3xl font-semibold text-white">Mesa no disponible</h3>
        <p className="mt-2 text-zinc-400">{error ?? 'No se pudo recuperar el estado de la partida.'}</p>
        <Button type="button" onClick={() => void loadGame()} className="mt-5 rounded-md bg-cyan-400 text-slate-950 hover:bg-cyan-300">
          Reintentar
        </Button>
      </section>
    )
  }

  const mySeat = game.seats.find((seat) => seat.isMe)
  const canPlay = Boolean(mySeat?.isTurn) && game.status !== 'finished'
  const tableScale = tableZoomDraft / TABLE_ZOOM_BASE
  const cardScale = cardScaleDraft / CARD_SCALE_BASE

  const renderPanel = (panel: DockPanelState) => {
    if (panel.id === 'players') {
      return <PlayersPanel game={game} />
    }

    if (panel.id === 'settings') {
      return (
        <SettingsPanel
          game={game}
          tableZoomDraft={tableZoomDraft}
          cardScaleDraft={cardScaleDraft}
          isMutating={isMutating}
          onTableZoomChange={setTableZoomDraft}
          onTableZoomCommit={(value) => void updateTableSetting('set-table-zoom', value)}
          onCardScaleChange={setCardScaleDraft}
          onCardScaleCommit={(value) => void updateTableSetting('set-card-scale', value)}
          onToggleVoice={() => void mutateGame('/api/game/control', { action: 'toggle-voice' })}
          onToggleChat={() => void mutateGame('/api/game/control', { action: 'toggle-chat' })}
          onToggleSound={() => void mutateGame('/api/game/control', { action: 'toggle-sound' })}
          onToggleDarkMode={() => void mutateGame('/api/game/control', { action: 'toggle-dark-mode' })}
          onResetRound={() => void mutateGame('/api/game/control', { action: 'reset-round' })}
        />
      )
    }

    if (panel.id === 'chat') {
      return (
        <ChatPanel
          game={game}
          message={tableChatMessage}
          isSending={isSendingChat}
          onMessageChange={setTableChatMessage}
          onSend={() => void sendTableMessage()}
        />
      )
    }

    return <EventsPanel game={game} />
  }

  return (
    <WorkspaceShell
      storageKey={`rey30-game-panels-${game.tableMode ?? 'classic-hearts'}`}
      panels={gamePanels}
      renderPanel={renderPanel}
      header={
        <div className="rounded-lg border border-white/[0.08] bg-[#101019] p-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="border-0 bg-cyan-400 text-slate-950">
                  <Crown className="mr-1 h-3.5 w-3.5" />
                  {game.tableModeLabel ?? 'Mesa clasica'}
                </Badge>
                <Badge className="border border-white/[0.08] bg-white/[0.04] text-zinc-300">Ronda {game.roundNumber}</Badge>
                <Badge className="border border-white/[0.08] bg-white/[0.04] text-zinc-300">Turno {game.currentTurnSeat + 1}</Badge>
                {game.deck ? (
                  <Badge className="border border-white/[0.08] bg-white/[0.04] text-zinc-300">
                    <Layers3 className="mr-1 h-3.5 w-3.5" />
                    {game.deck.modules.length} modulos
                  </Badge>
                ) : (
                  <Badge className="border border-white/[0.08] bg-white/[0.04] text-zinc-300">13 cartas por jugador</Badge>
                )}
                {game.scoring?.pointsLabel ? (
                  <Badge className="border border-cyan-300/15 bg-cyan-500/10 text-cyan-100">
                    {game.scoring.pointPolarity === 'low-score-wins' ? 'Menor' : 'Mayor'} {game.scoring.pointsLabel}
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-3 truncate text-3xl font-semibold text-white">{game.roomName}</h3>
              <p className="mt-1 text-sm text-zinc-400">{game.summary}</p>
              {error ? <p className="mt-2 text-sm text-rose-300">{error}</p> : null}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => void mutateGame('/api/game/control', { action: 'reset-round' })}
                disabled={isMutating}
                className="rounded-md border-white/[0.08] bg-white/[0.04] text-zinc-200"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Nueva ronda
              </Button>
              <Badge className={cn('border-0', canPlay ? 'bg-emerald-400 text-slate-950' : 'bg-white/[0.08] text-zinc-300')}>
                {canPlay ? 'Tu accion' : game.currentTurnLabel}
              </Badge>
            </div>
          </div>
        </div>
      }
    >
      <div className="space-y-3">
        {game.status === 'finished' ? (
          <section className="rounded-lg border border-amber-400/20 bg-amber-500/10 p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-amber-200/80">Ronda cerrada</p>
                <h4 className="mt-1 text-xl font-semibold text-white">Mesa lista para reiniciar</h4>
              </div>
              <Button
                type="button"
                onClick={() => void mutateGame('/api/game/control', { action: 'reset-round' })}
                disabled={isMutating}
                className="rounded-md bg-amber-400 font-semibold text-slate-950 hover:bg-amber-300"
              >
                <RotateCcw className="mr-2 h-4 w-4" />
                Abrir nueva ronda
              </Button>
            </div>
          </section>
        ) : null}

        <PlayerStrip game={game} />
        <GameTableViewport game={game} tableScale={tableScale} cardScale={cardScale} />
        <EffectHistoryStrip effects={game.effectHistory ?? []} />
        <GameHandDock
          game={game}
          selectedCardId={selectedCardId}
          cardScale={cardScale}
          canPlay={canPlay}
          isMutating={isMutating}
          onSelectCard={(cardId) => setSelectedCardId((current) => (current === cardId ? null : cardId))}
          onPlay={() => {
            if (!selectedCardId) {
              return
            }

            void mutateGame('/api/game/play', {
              cardId: selectedCardId,
            }).then(() => setSelectedCardId(null))
          }}
        />
      </div>
    </WorkspaceShell>
  )
}
