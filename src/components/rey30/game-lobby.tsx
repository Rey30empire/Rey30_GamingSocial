'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import type { ChatMessageSnapshot, CreateRoomPayload, LobbySnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { 
  Users, 
  Bot, 
  Crown, 
  Zap,
  Plus,
  Search,
  Lock,
  Globe,
  ChevronRight,
  Gamepad2,
  Trophy,
  Flame,
  Mic,
  Send,
  Copy,
  RefreshCcw,
  Share2
} from 'lucide-react'

interface GameLobbyProps {
  data?: LobbySnapshot
  onRefresh?: () => Promise<void> | void
  onEnterRoom?: (roomId: string) => void
  onEnterSnakeArcade?: () => void
}

const modeConfig = {
  normal: { label: 'Normal', tone: 'bg-white/[0.08] text-zinc-100' },
  ranked: { label: 'Ranked', tone: 'bg-pink-500/15 text-pink-100' },
  tournament: { label: 'Torneo', tone: 'bg-amber-500/15 text-amber-100' },
} as const

function RoomLobbyMessage({ message }: { message: ChatMessageSnapshot }) {
  return (
    <div
      className={cn(
        'flex gap-2',
        message.user.isMe && 'justify-end'
      )}
    >
      {!message.user.isMe ? (
        <Avatar className="h-8 w-8 border border-white/10">
          <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user.avatar}`} />
          <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-[0.65rem] text-white">
            {message.user.name[0]}
          </AvatarFallback>
        </Avatar>
      ) : null}
      <div
        className={cn(
          'max-w-[82%] rounded-2xl px-3 py-2',
          message.user.isMe
            ? 'bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white'
            : 'bg-white/[0.04] text-zinc-100'
        )}
      >
        <div className="flex items-center gap-2">
          <p className={cn('text-xs font-medium', message.user.isMe ? 'text-white/80' : 'text-cyan-300')}>
            {message.user.name}
          </p>
          <span className={cn('text-[0.7rem]', message.user.isMe ? 'text-white/70' : 'text-zinc-500')}>
            {message.timestamp}
          </span>
        </div>
        <p className="mt-1 text-sm leading-relaxed">{message.content}</p>
      </div>
    </div>
  )
}

function GameRoomCard({
  room,
  onEnter,
  onCopyInvite,
  onShareInvite,
  onRegenerateInvite,
  onToggleReady,
  onLaunch,
  isReadyPending,
  isLaunching,
  isRegenerating,
}: {
  room: LobbySnapshot['rooms'][number]
  onEnter?: (roomId: string) => void
  onCopyInvite?: (room: LobbySnapshot['rooms'][number]) => void
  onShareInvite?: (room: LobbySnapshot['rooms'][number]) => void
  onRegenerateInvite?: (room: LobbySnapshot['rooms'][number]) => void
  onToggleReady?: (room: LobbySnapshot['rooms'][number]) => void
  onLaunch?: (room: LobbySnapshot['rooms'][number]) => void
  isReadyPending?: boolean
  isLaunching?: boolean
  isRegenerating?: boolean
}) {
  const statusConfig = {
    waiting: { label: 'Esperando', color: 'bg-green-500', textColor: 'text-green-400' },
    starting: { label: 'Iniciando', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    full: { label: 'Llena', color: 'bg-red-500', textColor: 'text-red-400' },
  }

  const status = statusConfig[room.status]
  const mode = modeConfig[room.mode]
  const filledSeats = Math.min(room.maxPlayers, room.players + (room.bots ?? 0))
  const openSeats = Math.max(0, room.maxPlayers - filledSeats)
  const canDirectEnter = room.status !== 'full' && (!room.requiresInvite || room.isMember)
  const isCustomTable = room.tableMode === 'custom-table'

  return (
    <Card
      onClick={() => {
        if (canDirectEnter) {
          onEnter?.(room.id)
        }
      }}
      className={cn(
        'bg-[#12121a] border-purple-500/20 p-4 card-hover cursor-pointer',
        !canDirectEnter && 'cursor-default'
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          <Avatar className="w-10 h-10 border-2 border-purple-500/30">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.host.avatar}`} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {room.host.name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{room.name}</span>
              {room.type === 'private' && <Lock className="w-3 h-3 text-yellow-400" />}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>{room.host.name}</span>
              <span>•</span>
              <span>Nivel {room.host.level}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Badge className={cn('border-0', mode.tone)}>{mode.label}</Badge>
          <Badge className={cn('border-0', isCustomTable ? 'bg-cyan-500/15 text-cyan-100' : 'bg-violet-500/15 text-violet-100')}>
            {room.tableModeLabel ?? (isCustomTable ? 'Custom 5-10' : 'Clasica 4')}
          </Badge>
          {room.voiceEnabled ? (
            <Badge className="border-0 bg-cyan-500/15 text-cyan-100">
              <Mic className="w-3 h-3 mr-1" />
              Voz
            </Badge>
          ) : null}
          {room.pointsRequired > 0 ? (
            <Badge className="border-0 bg-amber-500/15 text-amber-100">{room.pointsRequired} pts</Badge>
          ) : null}
          <Badge className="border-0 bg-emerald-500/15 text-emerald-100">{room.readyCount}/{room.humanPlayers} listos</Badge>
          {room.inviteCode ? (
            <Badge className="border-0 bg-violet-500/15 text-violet-100">Código {room.inviteCode}</Badge>
          ) : null}
          <Badge className={cn('border-0', status.textColor, 'bg-transparent')}>
            <span className={cn('w-2 h-2 rounded-full mr-1.5', status.color, room.status === 'starting' && 'animate-pulse')} />
            {status.label}
          </Badge>
        </div>
      </div>

      <p className="text-sm text-zinc-400">{room.description}</p>

      <div className="mt-4 flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-zinc-300">{filledSeats}/{room.maxPlayers}</span>
            </div>
            {room.isRanked ? (
              <div className="flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-pink-400" />
                <span className="text-sm text-pink-300">Competitiva</span>
              </div>
            ) : null}
            {room.type === 'private' ? (
              <div className="flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-yellow-400" />
                <span className="text-sm text-yellow-300">Privada</span>
              </div>
            ) : null}
            {room.bots ? (
              <div className="flex items-center gap-1.5">
                <Bot className="w-4 h-4 text-cyan-400" />
                <span className="text-sm text-cyan-400">{room.bots} bots</span>
              </div>
            ) : null}
          </div>
          <p className="text-xs text-zinc-500">{room.activityLabel}</p>
          {room.requiresInvite ? <p className="text-xs text-amber-300">Necesitas código privado para entrar.</p> : null}
        </div>
        <Button 
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            if (canDirectEnter) {
              onEnter?.(room.id)
            }
          }}
          className={cn(
            "rounded-full",
            canDirectEnter
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90" 
              : "bg-zinc-700 text-zinc-400"
          )}
          disabled={!canDirectEnter}
        >
          {room.status === 'full' ? 'Llena' : room.requiresInvite && !room.isMember ? 'Usa código' : 'Entrar'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] px-3 py-3">
        <div className="flex items-center -space-x-2">
          {room.seats.length ? (
            room.seats.map((seat) => (
              <div key={seat.id} className="relative">
                <Avatar className="w-8 h-8 border border-[#12121a]">
                  <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.avatar}`} />
                  <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-violet-500 text-[0.65rem] text-white">
                    {seat.name[0]}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    'absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#12121a]',
                    seat.isReady ? 'bg-emerald-400' : 'bg-zinc-500'
                  )}
                />
              </div>
            ))
          ) : (
            <div className="rounded-full border border-dashed border-white/10 px-3 py-1 text-xs text-zinc-500">
              Sin jugadores visibles
            </div>
          )}
        </div>
        <p className="text-xs text-zinc-500">
          {openSeats > 0 ? `${openSeats} asientos libres` : 'Mesa lista para arrancar'}
        </p>
      </div>

      {room.inviteCode ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              onCopyInvite?.(room)
            }}
            className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
          >
            <Copy className="w-3.5 h-3.5 mr-2" />
            Copiar código
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              onShareInvite?.(room)
            }}
            className="rounded-full border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
          >
            <Share2 className="w-3.5 h-3.5 mr-2" />
            Compartir
          </Button>
          {room.isHost ? (
            <Button
              size="sm"
              variant="outline"
              onClick={(event) => {
                event.stopPropagation()
                onRegenerateInvite?.(room)
              }}
              disabled={isRegenerating}
              className="rounded-full border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
            >
              <RefreshCcw className="w-3.5 h-3.5 mr-2" />
              {isRegenerating ? 'Regenerando...' : 'Regenerar'}
            </Button>
          ) : null}
        </div>
      ) : null}

      {room.isMember ? (
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={(event) => {
              event.stopPropagation()
              onToggleReady?.(room)
            }}
            disabled={isReadyPending}
            className={cn(
              'rounded-full px-4',
              room.isReadyByMe
                ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
                : 'border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]'
            )}
          >
            {isReadyPending ? 'Actualizando...' : room.isReadyByMe ? 'Quitar listo' : 'Marcar listo'}
          </Button>
          {room.isHost ? (
            <Button
              size="sm"
              onClick={(event) => {
                event.stopPropagation()
                onLaunch?.(room)
              }}
              disabled={!room.canLaunch || isLaunching}
              className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 text-slate-950 hover:opacity-90 disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              {isLaunching ? 'Lanzando...' : room.canLaunch ? 'Lanzar mesa' : 'Esperando listos'}
            </Button>
          ) : null}
        </div>
      ) : null}
    </Card>
  )
}

export function GameLobby({ data, onRefresh, onEnterRoom, onEnterSnakeArcade }: GameLobbyProps) {
  const rooms = data?.rooms ?? []
  const [showCreate, setShowCreate] = useState(false)
  const [botCount, setBotCount] = useState(0)
  const [isPublic, setIsPublic] = useState(true)
  const [selectedMode, setSelectedMode] = useState<'normal' | 'ranked' | 'tournament'>('normal')
  const [tableMode, setTableMode] = useState<'classic-hearts' | 'custom-table'>('classic-hearts')
  const [targetPlayers, setTargetPlayers] = useState(5)
  const [roomName, setRoomName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [search, setSearch] = useState('')
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [modeFilter, setModeFilter] = useState<'all' | 'normal' | 'ranked' | 'tournament'>('all')
  const [isCreating, setIsCreating] = useState(false)
  const [isJoiningByCode, setIsJoiningByCode] = useState(false)
  const [regeneratingRoomId, setRegeneratingRoomId] = useState<string | null>(null)
  const [readyRoomId, setReadyRoomId] = useState<string | null>(null)
  const [launchingRoomId, setLaunchingRoomId] = useState<string | null>(null)
  const [sendingRoomId, setSendingRoomId] = useState<string | null>(null)
  const [pendingQuickAction, setPendingQuickAction] = useState<string | null>(null)
  const [roomMessage, setRoomMessage] = useState('')
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modes = [
    { id: 'normal', label: 'Normal', icon: Gamepad2, desc: 'Partida casual sin apuestas' },
    { id: 'ranked', label: 'Ranked', icon: Trophy, desc: 'Sube en el ranking global' },
    { id: 'tournament', label: 'Torneo', icon: Crown, desc: 'Compite por premios' },
  ]
  const tableModes = [
    {
      id: 'classic-hearts',
      label: 'Clasica 4',
      desc: 'Reglas actuales y mazo clasico',
    },
    {
      id: 'custom-table',
      label: 'Custom 5-10',
      desc: 'Asientos dinamicos y mazos elementales',
    },
  ] as const

  const lobbyFilters = [
    { id: 'all', label: 'Todas' },
    { id: 'normal', label: 'Normal' },
    { id: 'ranked', label: 'Ranked' },
    { id: 'tournament', label: 'Torneo' },
  ] as const

  const filteredRooms = rooms.filter((room) => {
    const searchValue = search.trim().toLowerCase()
    const matchesSearch =
      searchValue.length === 0 ||
      [room.name, room.description, room.host.name, room.mode, room.tableModeLabel ?? ''].some((value) =>
        value.toLowerCase().includes(searchValue)
      )
    const matchesFilter = showOpenOnly ? room.status !== 'full' : true
    const matchesMode = modeFilter === 'all' ? true : room.mode === modeFilter
    return matchesSearch && matchesFilter && matchesMode
  })
  const spotlightRoom = filteredRooms.find((room) => room.isMember) ?? filteredRooms[0] ?? null

  useEffect(() => {
    setRoomMessage('')
  }, [spotlightRoom?.id])

  useEffect(() => {
    const maxBots = tableMode === 'custom-table' ? targetPlayers - 1 : 3
    setBotCount((current) => Math.min(current, maxBots))
  }, [tableMode, targetPlayers])

  const createRoomRequest = async (payload: CreateRoomPayload, options?: { autoEnter?: boolean }) => {
    const response = await fetch('/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error ?? 'No se pudo crear la sala.')
    }

    await onRefresh?.()

    if (options?.autoEnter !== false && typeof result?.room?.id === 'string') {
      onEnterRoom?.(result.room.id)
    }

    return result
  }

  const joinPrivateRoomRequest = async (inviteCode: string) => {
    const response = await fetch('/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inviteCode,
      }),
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error ?? 'No se pudo entrar a la sala privada.')
    }

    await onRefresh?.()

    if (typeof result?.room?.id === 'string') {
      onEnterRoom?.(result.room.id)
    }

    return result
  }

  const regenerateInviteCodeRequest = async (roomId: string) => {
    const response = await fetch('/api/rooms/invite', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
      }),
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error ?? 'No se pudo regenerar el codigo privado.')
    }

    await onRefresh?.()
    return result
  }

  const updateReadyStateRequest = async (roomId: string, ready: boolean) => {
    const response = await fetch('/api/rooms/ready', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        ready,
      }),
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error ?? 'No se pudo actualizar el estado listo.')
    }

    await onRefresh?.()
    return result
  }

  const launchRoomRequest = async (roomId: string) => {
    const response = await fetch('/api/rooms/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
      }),
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error ?? 'No se pudo lanzar la sala.')
    }

    await onRefresh?.()
    return result
  }

  const sendRoomMessageRequest = async (roomId: string, content: string) => {
    const response = await fetch('/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        content,
      }),
    })
    const result = await response.json()

    if (!response.ok) {
      throw new Error(result?.error ?? 'No se pudo enviar el mensaje a la sala.')
    }

    await onRefresh?.()
    return result
  }

  const enterFirstRoom = (matcher: (room: LobbySnapshot['rooms'][number]) => boolean, successMessage: string) => {
    const room = rooms.find((candidate) => candidate.status !== 'full' && matcher(candidate))

    if (!room) {
      return false
    }

    setFeedback(successMessage)
    setError(null)
    onEnterRoom?.(room.id)
    return true
  }

  const handleCreateRoom = async () => {
    const payload: CreateRoomPayload = {
      name: roomName,
      mode: selectedMode,
      isPublic,
      botCount,
      tableMode,
      targetPlayers: tableMode === 'custom-table' ? targetPlayers : 4,
    }

    setIsCreating(true)
    setError(null)
    setFeedback(null)

    try {
      const result = await createRoomRequest(payload, {
        autoEnter: isPublic,
      })
      setRoomName('')
      setBotCount(0)
      setIsPublic(true)
      setSelectedMode('normal')
      setTableMode('classic-hearts')
      setTargetPlayers(5)
      setShowCreate(false)
      setFeedback(
        result.room?.inviteCode
          ? `Sala privada lista: ${result.room.name}. Código ${result.room.inviteCode}`
          : `Sala lista: ${result.room.name}`
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear la sala.')
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinByCode = async () => {
    setIsJoiningByCode(true)
    setError(null)
    setFeedback(null)

    try {
      const result = await joinPrivateRoomRequest(joinCode)
      setJoinCode('')
      setFeedback(
        result.alreadyMember
          ? `Reingresaste a ${result.room.name} con el código ${result.room.inviteCode}.`
          : `Entraste a ${result.room.name} con el código ${result.room.inviteCode}.`
      )
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo entrar a la sala privada.')
    } finally {
      setIsJoiningByCode(false)
    }
  }

  const handleCopyInvite = async (room: LobbySnapshot['rooms'][number]) => {
    if (!room.inviteCode) {
      return
    }

    try {
      await navigator.clipboard.writeText(room.inviteCode)
      setFeedback(`Código ${room.inviteCode} copiado para ${room.name}.`)
      setError(null)
    } catch {
      setError('No se pudo copiar el código al portapapeles.')
    }
  }

  const handleShareInvite = async (room: LobbySnapshot['rooms'][number]) => {
    if (!room.inviteCode) {
      return
    }

    const shareText = `Únete a ${room.name} en REY30VERSE con el código privado ${room.inviteCode}.`

    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({
          title: `Invitación a ${room.name}`,
          text: shareText,
        })
      } else {
        await navigator.clipboard.writeText(shareText)
      }

      setFeedback(`Invitación preparada para ${room.name}.`)
      setError(null)
    } catch {
      setError('No se pudo compartir la invitación de la sala.')
    }
  }

  const handleRegenerateInvite = async (room: LobbySnapshot['rooms'][number]) => {
    setRegeneratingRoomId(room.id)
    setError(null)
    setFeedback(null)

    try {
      const result = await regenerateInviteCodeRequest(room.id)
      setFeedback(`Nuevo código para ${room.name}: ${result.room.inviteCode}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo regenerar el codigo privado.')
    } finally {
      setRegeneratingRoomId(null)
    }
  }

  const handleReadyToggle = async (room: LobbySnapshot['rooms'][number]) => {
    setReadyRoomId(room.id)
    setError(null)
    setFeedback(null)

    try {
      await updateReadyStateRequest(room.id, !room.isReadyByMe)
      setFeedback(!room.isReadyByMe ? `Quedaste listo en ${room.name}.` : `Quitaste tu estado listo en ${room.name}.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo actualizar el estado listo.')
    } finally {
      setReadyRoomId(null)
    }
  }

  const handleLaunchRoom = async (room: LobbySnapshot['rooms'][number]) => {
    setLaunchingRoomId(room.id)
    setError(null)
    setFeedback(null)

    try {
      await launchRoomRequest(room.id)
      setFeedback(`Mesa lanzada: ${room.name}.`)
      onEnterRoom?.(room.id)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo lanzar la sala.')
    } finally {
      setLaunchingRoomId(null)
    }
  }

  const handleSendRoomMessage = async (room: LobbySnapshot['rooms'][number]) => {
    const nextMessage = roomMessage.trim()

    if (!room.id || !nextMessage) {
      return
    }

    setSendingRoomId(room.id)
    setError(null)
    setFeedback(null)

    try {
      await sendRoomMessageRequest(room.id, nextMessage)
      setRoomMessage('')
      setFeedback(`Mensaje enviado a ${room.name}.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el mensaje a la sala.')
    } finally {
      setSendingRoomId(null)
    }
  }

  const handleQuickAction = async (
    quickActionId: string,
    payload: CreateRoomPayload,
    matcher: (room: LobbySnapshot['rooms'][number]) => boolean,
    successMessage: string
  ) => {
    if (enterFirstRoom(matcher, successMessage)) {
      return
    }

    setPendingQuickAction(quickActionId)
    setError(null)
    setFeedback(null)

    try {
      await createRoomRequest(payload)
      setFeedback(`Sala creada para ${successMessage.toLowerCase()}.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo lanzar la accion rapida.')
    } finally {
      setPendingQuickAction(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Salas de Juego</h2>
          <p className="text-zinc-500">Encuentra o crea una partida</p>
        </div>
        <Button
          onClick={() => setShowCreate(!showCreate)}
          className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          Crear Sala
        </Button>
      </div>

      {/* Create Room Panel */}
      {showCreate && (
        <Card className="bg-[#12121a] border-purple-500/30 p-6 neon-glow-purple">
          <h3 className="font-bold text-white mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-400" />
            Nueva Sala
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left column */}
            <div className="space-y-4">
              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Tipo de mesa</label>
                <div className="grid grid-cols-2 gap-2">
                  {tableModes.map((mode) => (
                    <button
                      key={mode.id}
                      type="button"
                      onClick={() => setTableMode(mode.id)}
                      className={cn(
                        "rounded-xl border p-3 text-left transition-all",
                        tableMode === mode.id
                          ? "border-cyan-400/60 bg-cyan-500/15"
                          : "border-purple-500/20 bg-[#1a1a2e] hover:border-purple-500/40"
                      )}
                    >
                      <span className={cn("block text-sm font-semibold", tableMode === mode.id ? "text-white" : "text-zinc-300")}>
                        {mode.label}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-zinc-500">{mode.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Nombre de la sala</label>
                <Input 
                  value={roomName}
                  onChange={(event) => setRoomName(event.target.value)}
                  placeholder="Mi partida..."
                  className="bg-[#1a1a2e] border-purple-500/20 focus:border-purple-500 text-white placeholder:text-zinc-500"
                />
              </div>

              <div>
                <label className="text-sm text-zinc-400 mb-2 block">Modo de juego</label>
                <div className="grid grid-cols-3 gap-2">
                  {modes.map((mode) => (
                    <button
                      key={mode.id}
                      onClick={() => setSelectedMode(mode.id as typeof selectedMode)}
                      className={cn(
                        "p-3 rounded-xl border transition-all",
                        selectedMode === mode.id
                          ? "border-purple-500 bg-purple-500/20"
                          : "border-purple-500/20 bg-[#1a1a2e] hover:border-purple-500/40"
                      )}
                    >
                      <mode.icon className={cn(
                        "w-5 h-5 mx-auto mb-1",
                        selectedMode === mode.id ? "text-purple-400" : "text-zinc-400"
                      )} />
                      <span className={cn(
                        "text-sm",
                        selectedMode === mode.id ? "text-white" : "text-zinc-400"
                      )}>{mode.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-zinc-400">Jugadores de la mesa</label>
                  <span className="text-sm text-cyan-400">
                    {tableMode === 'custom-table' ? `${targetPlayers} jugadores` : '4 jugadores'}
                  </span>
                </div>
                <Slider
                  value={[tableMode === 'custom-table' ? targetPlayers : 4]}
                  onValueChange={(value) => setTargetPlayers(value[0])}
                  min={tableMode === 'custom-table' ? 5 : 4}
                  max={tableMode === 'custom-table' ? 10 : 4}
                  step={1}
                  disabled={tableMode === 'classic-hearts'}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>5</span>
                  <span>6</span>
                  <span>7</span>
                  <span>8</span>
                  <span>9</span>
                  <span>10</span>
                </div>
                {tableMode === 'classic-hearts' ? (
                  <p className="mt-2 text-xs text-zinc-500">La mesa clasica conserva exactamente 4 jugadores.</p>
                ) : null}
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm text-zinc-400">Bots en la partida</label>
                  <span className="text-sm text-cyan-400">{botCount} bots</span>
                </div>
                <Slider
                  value={[botCount]}
                  onValueChange={(v) => setBotCount(v[0])}
                  max={tableMode === 'custom-table' ? targetPlayers - 1 : 3}
                  step={1}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>0</span>
                  <span>1</span>
                  <span>2</span>
                  <span>3</span>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-[#1a1a2e] rounded-xl">
                <div className="flex items-center gap-3">
                  {isPublic ? (
                    <Globe className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Lock className="w-5 h-5 text-yellow-400" />
                  )}
                  <div>
                    <p className="text-white text-sm font-medium">
                      {isPublic ? 'Sala Pública' : 'Sala Privada'}
                    </p>
                    <p className="text-xs text-zinc-500">
                      {isPublic ? 'Cualquiera puede unirse' : 'Solo con código'}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="ghost" onClick={() => setShowCreate(false)} className="text-zinc-400">
              Cancelar
            </Button>
            <Button
              onClick={() => void handleCreateRoom()}
              disabled={isCreating}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              {isCreating ? 'Creando...' : isPublic ? 'Crear y Jugar' : 'Crear sala privada'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="bg-[#12121a] border-amber-500/20 p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="border-0 bg-amber-500/15 text-amber-100">Privadas</Badge>
              <Badge className="border-0 bg-white/[0.06] text-zinc-100">Join por código</Badge>
            </div>
            <h3 className="mt-3 text-2xl font-semibold text-white">Entrar a una sala privada</h3>
            <p className="mt-1 max-w-2xl text-sm text-zinc-400">
              Usa el código de 6 caracteres que te comparte el host. Las salas privadas ya no aceptan entrada directa sin membresía.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[24rem]">
            <Input
              value={joinCode}
              onChange={(event) => setJoinCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))}
              placeholder="Ej. DEMO42"
              className="h-12 rounded-full border-amber-500/20 bg-[#1a1a2e] text-white placeholder:text-zinc-500"
            />
            <Button
              onClick={() => void handleJoinByCode()}
              disabled={isJoiningByCode || joinCode.trim().length < 6}
              className="rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-slate-950 hover:opacity-90 disabled:bg-zinc-700 disabled:text-zinc-400"
            >
              <Lock className="w-4 h-4 mr-2" />
              {isJoiningByCode ? 'Validando código...' : 'Entrar con código'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() =>
            void handleQuickAction(
              'quick-match',
              { name: 'Quick Match REY30', mode: 'normal', isPublic: true, botCount: 0 },
              (room) => room.status === 'waiting' && !room.requiresInvite,
              'Entrando a una partida abierta'
            )
          }
          disabled={Boolean(pendingQuickAction)}
          className="p-4 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl border border-purple-500/30 hover:border-purple-500/50 transition-all text-left group disabled:opacity-60"
        >
          <Zap className="w-6 h-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-white">Quick Match</p>
          <p className="text-xs text-zinc-500">Unirse a partida aleatoria</p>
        </button>
        <button
          onClick={() =>
            void handleQuickAction(
              'bots',
              { name: 'Mesa vs Bots', mode: 'normal', isPublic: false, botCount: 3 },
              (room) => (room.bots ?? 0) > 0 && (!room.requiresInvite || room.isMember),
              'Entrando a una mesa contra bots'
            )
          }
          disabled={Boolean(pendingQuickAction)}
          className="p-4 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-xl border border-cyan-500/30 hover:border-cyan-500/50 transition-all text-left group disabled:opacity-60"
        >
          <Bot className="w-6 h-6 text-cyan-400 mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-white">vs Bots</p>
          <p className="text-xs text-zinc-500">Practica contra IA</p>
        </button>
        <button
          onClick={() =>
            void handleQuickAction(
              'tournament',
              { name: 'Torneo Relampago REY30', mode: 'tournament', isPublic: true, botCount: 0 },
              (room) => room.mode === 'tournament' && !room.requiresInvite,
              'Entrando a un torneo activo'
            )
          }
          disabled={Boolean(pendingQuickAction)}
          className="p-4 bg-gradient-to-br from-yellow-500/20 to-orange-500/20 rounded-xl border border-yellow-500/30 hover:border-yellow-500/50 transition-all text-left group disabled:opacity-60"
        >
          <Trophy className="w-6 h-6 text-yellow-400 mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-white">Torneos</p>
          <p className="text-xs text-zinc-500">Compite por premios</p>
        </button>
        <button
          onClick={() =>
            void handleQuickAction(
              'ranked',
              { name: 'Ranked REY30', mode: 'ranked', isPublic: true, botCount: 0 },
              (room) => room.mode === 'ranked' && !room.requiresInvite,
              'Entrando a una ranked abierta'
            )
          }
          disabled={Boolean(pendingQuickAction)}
          className="p-4 bg-gradient-to-br from-pink-500/20 to-red-500/20 rounded-xl border border-pink-500/30 hover:border-pink-500/50 transition-all text-left group disabled:opacity-60"
        >
          <Flame className="w-6 h-6 text-pink-400 mb-2 group-hover:scale-110 transition-transform" />
          <p className="font-medium text-white">Ranked</p>
          <p className="text-xs text-zinc-500">Sube al top 100</p>
        </button>
      </div>

      {feedback ? <p className="text-sm text-emerald-300">{feedback}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      {/* Search and Filters */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <Input 
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar salas..."
            className="pl-10 bg-[#12121a] border-purple-500/20 focus:border-purple-500 text-white placeholder:text-zinc-500"
          />
        </div>
        <Button
          variant="outline"
          onClick={() => setShowOpenOnly((current) => !current)}
          className={cn(
            'border-purple-500/20 text-zinc-400 hover:text-white hover:border-purple-500/40',
            showOpenOnly && 'border-purple-500/50 bg-purple-500/10 text-white'
          )}
        >
          <Users className="w-4 h-4 mr-2" />
          {showOpenOnly ? 'Abiertas' : 'Filtros'}
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {lobbyFilters.map((filter) => (
          <Button
            key={filter.id}
            variant="outline"
            onClick={() => setModeFilter(filter.id)}
            className={cn(
              'rounded-full border-purple-500/20 bg-transparent text-zinc-400 hover:text-white hover:border-purple-500/40',
              modeFilter === filter.id && 'border-purple-500/50 bg-purple-500/10 text-white'
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Room List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {spotlightRoom ? (
          <Card className="bg-[#12121a] border-violet-500/25 p-5 lg:col-span-2">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn('border-0', modeConfig[spotlightRoom.mode].tone)}>
                    {modeConfig[spotlightRoom.mode].label}
                  </Badge>
                  {spotlightRoom.isRanked ? (
                    <Badge className="border-0 bg-pink-500/15 text-pink-100">Competitiva</Badge>
                  ) : null}
                  {spotlightRoom.voiceEnabled ? (
                    <Badge className="border-0 bg-cyan-500/15 text-cyan-100">Voz activa</Badge>
                  ) : null}
                  <Badge className="border-0 bg-emerald-500/15 text-emerald-100">
                    {spotlightRoom.readyCount}/{spotlightRoom.humanPlayers} listos
                  </Badge>
                  {spotlightRoom.inviteCode ? (
                    <Badge className="border-0 bg-violet-500/15 text-violet-100">Código {spotlightRoom.inviteCode}</Badge>
                  ) : null}
                  <Badge className="border-0 bg-white/[0.06] text-zinc-100">{spotlightRoom.activityLabel}</Badge>
                </div>
                <h3 className="mt-3 text-2xl font-semibold text-white">{spotlightRoom.name}</h3>
                <p className="mt-1 max-w-3xl text-sm text-zinc-400">{spotlightRoom.description}</p>
                {spotlightRoom.inviteCode ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleCopyInvite(spotlightRoom)}
                      className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
                    >
                      <Copy className="w-3.5 h-3.5 mr-2" />
                      Copiar código
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleShareInvite(spotlightRoom)}
                      className="rounded-full border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
                    >
                      <Share2 className="w-3.5 h-3.5 mr-2" />
                      Compartir
                    </Button>
                    {spotlightRoom.isHost ? (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void handleRegenerateInvite(spotlightRoom)}
                        disabled={regeneratingRoomId === spotlightRoom.id}
                        className="rounded-full border-amber-400/20 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20"
                      >
                        <RefreshCcw className="w-3.5 h-3.5 mr-2" />
                        {regeneratingRoomId === spotlightRoom.id ? 'Regenerando...' : 'Regenerar'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
                {spotlightRoom.isMember ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => void handleReadyToggle(spotlightRoom)}
                      disabled={readyRoomId === spotlightRoom.id}
                      className={cn(
                        'rounded-full px-4',
                        spotlightRoom.isReadyByMe
                          ? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20'
                          : 'border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]'
                      )}
                    >
                      {readyRoomId === spotlightRoom.id
                        ? 'Actualizando...'
                        : spotlightRoom.isReadyByMe
                          ? 'Quitar listo'
                          : 'Marcar listo'}
                    </Button>
                    {spotlightRoom.isHost ? (
                      <Button
                        size="sm"
                        onClick={() => void handleLaunchRoom(spotlightRoom)}
                        disabled={!spotlightRoom.canLaunch || launchingRoomId === spotlightRoom.id}
                        className="rounded-full bg-gradient-to-r from-emerald-400 to-cyan-500 px-4 text-slate-950 hover:opacity-90 disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        {launchingRoomId === spotlightRoom.id
                          ? 'Lanzando...'
                          : spotlightRoom.canLaunch
                            ? 'Lanzar mesa'
                            : 'Esperando listos'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <Button
                onClick={() => onEnterRoom?.(spotlightRoom.id)}
                disabled={spotlightRoom.status === 'full' || spotlightRoom.requiresInvite}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90 disabled:bg-zinc-700 disabled:text-zinc-400"
              >
                {spotlightRoom.status === 'full'
                  ? 'Sala llena'
                  : spotlightRoom.requiresInvite
                    ? 'Usa el código'
                    : 'Entrar ahora'}
              </Button>
            </div>
            <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Miembros dentro de la sala</h4>
                    <p className="text-xs text-zinc-500">
                      {spotlightRoom.canViewInternals
                        ? `${spotlightRoom.seats.length}/${spotlightRoom.maxPlayers} asientos ocupados`
                        : 'Contenido interno bloqueado hasta unirte con el código privado'}
                    </p>
                  </div>
                  <Badge className="border-0 bg-white/[0.06] text-zinc-100">
                    {spotlightRoom.readyCount}/{spotlightRoom.humanPlayers} listos
                  </Badge>
                </div>

                {spotlightRoom.canViewInternals ? (
                  spotlightRoom.seats.length ? (
                    <div className="mt-4 grid gap-3 sm:grid-cols-2">
                      {spotlightRoom.seats.map((seat) => (
                        <div key={seat.id} className="rounded-[1rem] border border-white/[0.06] bg-white/[0.03] px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar className="w-10 h-10 border border-white/10">
                              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${seat.avatar}`} />
                              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-cyan-500 text-white">
                                {seat.name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-white">{seat.name}</p>
                              <p className={cn('text-xs', seat.isReady ? 'text-emerald-300' : 'text-zinc-500')}>
                                {seat.isReady ? 'Listo' : 'Pendiente'}
                                {seat.isHost ? ' • Host' : ''}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="mt-4 rounded-[1rem] border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
                      Esta sala todavía no tiene miembros visibles.
                    </div>
                  )
                ) : (
                  <div className="mt-4 rounded-[1rem] border border-dashed border-amber-400/20 bg-amber-500/5 px-4 py-5 text-sm text-amber-100">
                    Únete con el código privado para ver quién está dentro y revisar el chat previo a la mesa.
                  </div>
                )}
              </div>

              <div className="rounded-[1.2rem] border border-white/[0.06] bg-white/[0.03] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h4 className="text-sm font-semibold text-white">Chat previo a la mesa</h4>
                    <p className="text-xs text-zinc-500">
                      {spotlightRoom.canViewInternals
                        ? 'Coordina invitaciones, listos y reglas antes de entrar a jugar.'
                        : 'El chat interno solo se muestra a los miembros de la sala.'}
                    </p>
                  </div>
                  <Badge className="border-0 bg-cyan-500/15 text-cyan-100">
                    {spotlightRoom.recentMessages.length} mensajes
                  </Badge>
                </div>

                {spotlightRoom.canViewInternals ? (
                  <>
                    <ScrollArea className="mt-4 h-64 pr-4">
                      {spotlightRoom.recentMessages.length ? (
                        <div className="space-y-3">
                          {spotlightRoom.recentMessages.map((message) => (
                            <RoomLobbyMessage key={message.id} message={message} />
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-[1rem] border border-dashed border-white/10 px-4 py-5 text-sm text-zinc-500">
                          Esta sala todavía no tiene mensajes. Usa el lobby para coordinar la partida antes de lanzar la mesa.
                        </div>
                      )}
                    </ScrollArea>

                    <div className="mt-4 flex items-center gap-2">
                      <Input
                        value={roomMessage}
                        onChange={(event) => setRoomMessage(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' && spotlightRoom.isMember) {
                            event.preventDefault()
                            void handleSendRoomMessage(spotlightRoom)
                          }
                        }}
                        disabled={!spotlightRoom.isMember || sendingRoomId === spotlightRoom.id}
                        placeholder={
                          spotlightRoom.isMember
                            ? 'Escribe algo para la sala...'
                            : 'Entra a la sala para escribir en este chat'
                        }
                        className="h-11 rounded-full border-white/[0.08] bg-[#1a1a2e] text-white placeholder:text-zinc-500"
                      />
                      <Button
                        onClick={() => void handleSendRoomMessage(spotlightRoom)}
                        disabled={!spotlightRoom.isMember || !roomMessage.trim() || sendingRoomId === spotlightRoom.id}
                        className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90 disabled:bg-zinc-700 disabled:text-zinc-400"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        {sendingRoomId === spotlightRoom.id ? 'Enviando...' : 'Enviar'}
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="mt-4 rounded-[1rem] border border-dashed border-amber-400/20 bg-amber-500/5 px-4 py-5 text-sm text-amber-100">
                    Usa el código privado de la sala para desbloquear el chat interno y coordinar la entrada con el host.
                  </div>
                )}
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="bg-[#12121a] border-cyan-500/20 p-5 lg:col-span-2">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Badge className="border-0 bg-cyan-500/15 text-cyan-100">Arcade local</Badge>
                <Badge className="border-0 bg-violet-500/15 text-violet-100">Snake</Badge>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">Sala Arcade Snake</h3>
              <p className="mt-1 max-w-2xl text-sm text-zinc-400">
                Movimiento por grid, crecimiento por comida, score local y reinicio inmediato dentro del hub actual.
              </p>
            </div>

            <Button
              onClick={onEnterSnakeArcade}
              className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-6 text-white hover:opacity-90"
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              Entrar a Snake
            </Button>
          </div>
        </Card>

        {filteredRooms.length ? (
          filteredRooms.map((room) => (
            <GameRoomCard
              key={room.id}
              room={room}
              onEnter={onEnterRoom}
              onCopyInvite={(targetRoom) => void handleCopyInvite(targetRoom)}
              onShareInvite={(targetRoom) => void handleShareInvite(targetRoom)}
              onRegenerateInvite={(targetRoom) => void handleRegenerateInvite(targetRoom)}
              onToggleReady={(targetRoom) => void handleReadyToggle(targetRoom)}
              onLaunch={(targetRoom) => void handleLaunchRoom(targetRoom)}
              isReadyPending={readyRoomId === room.id}
              isLaunching={launchingRoomId === room.id}
              isRegenerating={regeneratingRoomId === room.id}
            />
          ))
        ) : (
          <Card className="bg-[#12121a] border-purple-500/20 p-6 text-sm text-zinc-400 lg:col-span-2">
            No hay salas que coincidan con tu búsqueda actual. Prueba otro filtro o crea una nueva.
          </Card>
        )}
      </div>
    </div>
  )
}
