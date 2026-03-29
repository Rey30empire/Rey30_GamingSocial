'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { CreateRoomPayload, LobbySnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
  Flame
} from 'lucide-react'

interface GameLobbyProps {
  data?: LobbySnapshot
  onRefresh?: () => Promise<void> | void
  onEnterRoom?: (roomId: string) => void
  onEnterSnakeArcade?: () => void
}

const mockRooms: LobbySnapshot['rooms'] = [
  { id: '1', name: 'Torneo Clasico Pro', host: { name: 'CyberQueen', avatar: 'cyber', level: 67 }, players: 3, maxPlayers: 4, type: 'public', status: 'waiting' },
  { id: '2', name: 'Partida Casual', host: { name: 'LunaGamer', avatar: 'luna', level: 58 }, players: 4, maxPlayers: 4, type: 'public', status: 'full' },
  { id: '3', name: 'Solo Bots', host: { name: 'DarkKnight', avatar: 'dark', level: 42 }, players: 1, maxPlayers: 4, type: 'public', status: 'waiting', bots: 3 },
  { id: '4', name: 'Privada #42', host: { name: 'NeonPlayer', avatar: 'neon', level: 35 }, players: 2, maxPlayers: 4, type: 'private', status: 'waiting' },
  { id: '5', name: 'Ranked Match', host: { name: 'AcePlayer', avatar: 'ace', level: 89 }, players: 4, maxPlayers: 4, type: 'public', status: 'starting' },
]

function GameRoomCard({
  room,
  onEnter,
}: {
  room: LobbySnapshot['rooms'][number]
  onEnter?: (roomId: string) => void
}) {
  const statusConfig = {
    waiting: { label: 'Esperando', color: 'bg-green-500', textColor: 'text-green-400' },
    starting: { label: 'Iniciando', color: 'bg-yellow-500', textColor: 'text-yellow-400' },
    full: { label: 'Llena', color: 'bg-red-500', textColor: 'text-red-400' },
  }

  const status = statusConfig[room.status]

  return (
    <Card
      onClick={() => {
        if (room.status !== 'full') {
          onEnter?.(room.id)
        }
      }}
      className={cn(
        'bg-[#12121a] border-purple-500/20 p-4 card-hover cursor-pointer',
        room.status === 'full' && 'cursor-not-allowed'
      )}
    >
      <div className="flex items-start justify-between mb-3">
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
        <Badge className={cn("border-0", status.textColor, "bg-transparent")}>
          <span className={cn("w-2 h-2 rounded-full mr-1.5", status.color, room.status === 'starting' && "animate-pulse")} />
          {status.label}
        </Badge>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-zinc-400" />
            <span className="text-sm text-zinc-300">{room.players}/{room.maxPlayers}</span>
          </div>
          {room.bots && (
            <div className="flex items-center gap-1.5">
              <Bot className="w-4 h-4 text-cyan-400" />
              <span className="text-sm text-cyan-400">{room.bots} bots</span>
            </div>
          )}
        </div>
        <Button 
          size="sm"
          onClick={(event) => {
            event.stopPropagation()
            onEnter?.(room.id)
          }}
          className={cn(
            "rounded-full",
            room.status !== 'full'
              ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90" 
              : "bg-zinc-700 text-zinc-400"
          )}
          disabled={room.status === 'full'}
        >
          {room.status === 'full' ? 'Llena' : 'Entrar'}
          <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  )
}

export function GameLobby({ data, onRefresh, onEnterRoom, onEnterSnakeArcade }: GameLobbyProps) {
  const rooms = data?.rooms ?? mockRooms
  const [showCreate, setShowCreate] = useState(false)
  const [botCount, setBotCount] = useState(0)
  const [isPublic, setIsPublic] = useState(true)
  const [selectedMode, setSelectedMode] = useState<'normal' | 'ranked' | 'tournament'>('normal')
  const [roomName, setRoomName] = useState('')
  const [search, setSearch] = useState('')
  const [showOpenOnly, setShowOpenOnly] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [pendingQuickAction, setPendingQuickAction] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const modes = [
    { id: 'normal', label: 'Normal', icon: Gamepad2, desc: 'Partida casual sin apuestas' },
    { id: 'ranked', label: 'Ranked', icon: Trophy, desc: 'Sube en el ranking global' },
    { id: 'tournament', label: 'Torneo', icon: Crown, desc: 'Compite por premios' },
  ]

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.name.toLowerCase().includes(search.toLowerCase())
    const matchesFilter = showOpenOnly ? room.status !== 'full' : true
    return matchesSearch && matchesFilter
  })

  const createRoomRequest = async (payload: CreateRoomPayload) => {
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

    if (typeof result?.room?.id === 'string') {
      onEnterRoom?.(result.room.id)
    }

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
    }

    setIsCreating(true)
    setError(null)
    setFeedback(null)

    try {
      const result = await createRoomRequest(payload)
      setRoomName('')
      setBotCount(0)
      setIsPublic(true)
      setSelectedMode('normal')
      setShowCreate(false)
      setFeedback(`Sala lista: ${result.room.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear la sala.')
    } finally {
      setIsCreating(false)
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
                  <label className="text-sm text-zinc-400">Bots en la partida</label>
                  <span className="text-sm text-cyan-400">{botCount} bots</span>
                </div>
                <Slider
                  value={[botCount]}
                  onValueChange={(v) => setBotCount(v[0])}
                  max={3}
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
              {isCreating ? 'Creando...' : 'Crear y Jugar'}
            </Button>
          </div>
        </Card>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <button
          onClick={() =>
            void handleQuickAction(
              'quick-match',
              { name: 'Quick Match REY30', mode: 'normal', isPublic: true, botCount: 0 },
              (room) => room.status === 'waiting',
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
              (room) => (room.bots ?? 0) > 0,
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
              (room) => room.name.toLowerCase().includes('torneo'),
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
              (room) => room.name.toLowerCase().includes('ranked'),
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

      {/* Room List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
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
            <GameRoomCard key={room.id} room={room} onEnter={onEnterRoom} />
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
