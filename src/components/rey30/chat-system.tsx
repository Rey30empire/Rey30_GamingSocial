'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import type { ChatMessageSnapshot, ChatRoomSnapshot, ChatSnapshot } from '@/lib/app-types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Send, 
  Phone, 
  Video, 
  MoreVertical, 
  Smile,
  Users,
  Globe,
  Lock,
  Gamepad2,
  Search,
  Plus
} from 'lucide-react'

interface ChatSystemProps {
  data?: ChatSnapshot
  onRefresh?: () => Promise<void> | void
}

function ChatRoomItem({ room, active, onClick }: { room: ChatRoomSnapshot; active: boolean; onClick: () => void }) {
  const getIcon = () => {
    switch (room.type) {
      case 'global':
        return <Globe className="w-4 h-4 text-cyan-400" />
      case 'private':
        return <Lock className="w-4 h-4 text-purple-400" />
      case 'group':
        return <Users className="w-4 h-4 text-pink-400" />
      case 'game':
        return <Gamepad2 className="w-4 h-4 text-yellow-400" />
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full p-3 flex items-center gap-3 rounded-xl transition-all",
        "hover:bg-purple-500/10",
        active && "bg-purple-500/20 border-l-2 border-purple-500"
      )}
    >
      <div className="relative">
        {room.avatar ? (
          <Avatar className="w-10 h-10 border-2 border-purple-500/30">
            <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${room.avatar}`} />
            <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
              {room.name[0]}
            </AvatarFallback>
          </Avatar>
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-pink-500/30 flex items-center justify-center">
            {getIcon()}
          </div>
        )}
        {room.type === 'private' && (
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#12121a]" />
        )}
      </div>
      <div className="flex-1 text-left">
        <div className="flex items-center justify-between">
          <span className="font-medium text-white text-sm">{room.name}</span>
          {room.online && (
            <span className="text-xs text-cyan-400">{room.online} en línea</span>
          )}
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500 truncate max-w-[150px]">{room.lastMessage}</span>
          {room.unread > 0 && (
            <Badge className="bg-gradient-to-r from-pink-500 to-purple-500 text-white text-xs px-1.5 py-0.5 border-0">
              {room.unread}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}

function MessageBubble({ message }: { message: ChatMessageSnapshot }) {
  return (
    <div className={cn(
      "flex gap-2",
      message.user.isMe && "flex-row-reverse"
    )}>
      <Avatar className="w-8 h-8 flex-shrink-0">
        <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${message.user.avatar}`} />
        <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white text-xs">
          {message.user.name[0]}
        </AvatarFallback>
      </Avatar>
      <div className={cn(
        "max-w-[70%]",
        message.user.isMe ? "items-end" : "items-start"
      )}>
        {!message.user.isMe && (
          <span className="text-xs text-purple-400 mb-1 block">{message.user.name}</span>
        )}
        <div className={cn(
          "px-4 py-2 rounded-2xl",
          message.user.isMe
            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-tr-sm"
            : "bg-[#1a1a2e] text-white rounded-tl-sm"
        )}>
          <p className="text-sm">{message.content}</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-zinc-500">{message.timestamp}</span>
          {message.reactions && (
            <div className="flex gap-1">
              {message.reactions.map((r, i) => (
                <span key={i} className="text-sm">{r}</span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export function ChatSystem({ data, onRefresh }: ChatSystemProps) {
  const rooms = data?.rooms ?? []
  const snapshotMessages = data?.messages ?? []
  const defaultActiveRoom = data?.activeRoomId ?? rooms[0]?.id ?? ''
  const [activeRoom, setActiveRoom] = useState<string>(defaultActiveRoom)
  const [message, setMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!rooms.length) {
      setActiveRoom('')
      return
    }

    setActiveRoom((current) => {
      if (current && rooms.some((room) => room.id === current)) {
        return current
      }

      return defaultActiveRoom
    })
  }, [defaultActiveRoom, rooms])

  const activeRoomMeta = rooms.find((room) => room.id === activeRoom) ?? rooms[0]
  const visibleMessages = snapshotMessages.filter((entry) => entry.roomId === activeRoom)

  const handleSend = async () => {
    if (!message.trim() || !activeRoom) return

    const nextMessage = message

    setIsSending(true)
    setError(null)

    try {
      const response = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          roomId: activeRoom,
          content: nextMessage,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo enviar el mensaje.')
      }

      setMessage('')
      await onRefresh?.()
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo enviar el mensaje.')
    } finally {
      setIsSending(false)
    }
  }

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight)
  }, [snapshotMessages])

  return (
    <div className="flex h-full gap-4">
      {/* Chat list */}
      <div className="w-80 flex-shrink-0 bg-[#0f0f18] rounded-xl border border-purple-500/20 overflow-hidden flex flex-col">
        <div className="p-4 border-b border-purple-500/20">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-white">Mensajes</h3>
            <Button variant="ghost" size="icon" className="w-8 h-8 text-zinc-400 hover:text-white">
              <Plus className="w-4 h-4" />
            </Button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <Input 
              placeholder="Buscar chat..." 
              className="pl-9 bg-[#1a1a2e] border-purple-500/20 focus:border-purple-500 text-white placeholder:text-zinc-500 h-9"
            />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {rooms.length ? (
            <div className="p-2 space-y-1">
              {rooms.map((room) => (
                <ChatRoomItem
                  key={room.id}
                  room={room}
                  active={activeRoom === room.id}
                  onClick={() => setActiveRoom(room.id)}
                />
              ))}
            </div>
          ) : (
            <div className="p-4 text-sm text-zinc-500">No hay conversaciones disponibles todavía.</div>
          )}
        </ScrollArea>
      </div>

      {/* Chat area */}
      <div className="flex-1 bg-[#0f0f18] rounded-xl border border-purple-500/20 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-purple-500/20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="w-10 h-10 border-2 border-purple-500/30">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${activeRoomMeta?.avatar ?? 'global'}`} />
                <AvatarFallback className="bg-gradient-to-br from-cyan-500 to-purple-500 text-white">
                  {activeRoomMeta?.type === 'global' ? <Globe className="w-5 h-5" /> : activeRoomMeta?.name?.[0]}
                </AvatarFallback>
              </Avatar>
            </div>
            <div>
              <h4 className="font-medium text-white">{activeRoomMeta?.name ?? 'Chat Global'}</h4>
              <span className="text-xs text-cyan-400">
                {activeRoomMeta?.online ? `${activeRoomMeta.online} en línea` : activeRoomMeta?.lastMessage ?? 'Conversación activa'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Phone className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <Video className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea ref={scrollRef} className="flex-1 p-4">
          {visibleMessages.length ? (
            <div className="space-y-4">
              {visibleMessages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
            </div>
          ) : (
            <div className="text-sm text-zinc-500">
              {activeRoomMeta
                ? 'Esta conversación todavía no tiene mensajes.'
                : 'Selecciona una sala real para empezar a chatear.'}
            </div>
          )}
        </ScrollArea>

        {/* Input */}
        <div className="p-4 border-t border-purple-500/20">
          {error ? <p className="mb-3 text-sm text-rose-300">{error}</p> : null}
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-purple-400">
              <Smile className="w-5 h-5" />
            </Button>
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
              placeholder="Escribe un mensaje..."
              className="flex-1 bg-[#1a1a2e] border-purple-500/20 focus:border-purple-500 text-white placeholder:text-zinc-500"
            />
            <Button
              onClick={() => void handleSend()}
              disabled={isSending}
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-90 text-white"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
