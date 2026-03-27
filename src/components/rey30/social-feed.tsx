'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { 
  MessageCircle, 
  Share2, 
  Play, 
  Eye, 
  Trophy,
  Users,
  Flame,
  Sparkles,
  MoreHorizontal
} from 'lucide-react'

interface Post {
  id: string
  type: 'video' | 'image' | 'live'
  user: {
    name: string
    avatar: string
    level: number
    badge?: 'pro' | 'streamer' | 'champion'
  }
  content: string
  media?: string
  likes: number
  comments: number
  shares: number
  viewers?: number
  isLive?: boolean
  timestamp: string
}

const mockPosts: Post[] = [
  {
    id: '1',
    type: 'live',
    user: { name: 'LunaGamer', avatar: 'luna', level: 58, badge: 'streamer' },
    content: '🎮 ¡Torneo de Mesa Clasica 13 en vivo! ¡Únete al chat!',
    likes: 1240,
    comments: 342,
    shares: 89,
    viewers: 3420,
    isLive: true,
    timestamp: 'En vivo'
  },
  {
    id: '2',
    type: 'video',
    user: { name: 'DarkKnight_X', avatar: 'knight', level: 42, badge: 'pro' },
    content: 'Increíble jugada en la última partida 🔥 ¿Quién más pudo verlo?',
    likes: 892,
    comments: 156,
    shares: 45,
    timestamp: '2h'
  },
  {
    id: '3',
    type: 'image',
    user: { name: 'CyberQueen', avatar: 'cyber', level: 67, badge: 'champion' },
    content: 'Mi nueva baraja personalizada ✨ Estilo Cósmico',
    likes: 2100,
    comments: 234,
    shares: 67,
    timestamp: '4h'
  },
  {
    id: '4',
    type: 'video',
    user: { name: 'NeonPlayer', avatar: 'neon', level: 35 },
    content: 'Tutorial: Cómo dominar Mesa Clasica 13 💜',
    likes: 567,
    comments: 89,
    shares: 123,
    timestamp: '6h'
  },
]

function LiveBadge() {
  return (
    <Badge className="bg-red-500 text-white text-xs px-2 py-0.5 border-0 animate-pulse">
      <span className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
      EN VIVO
    </Badge>
  )
}

function BadgeIcon({ type }: { type: 'pro' | 'streamer' | 'champion' }) {
  const config = {
    pro: { icon: Sparkles, color: 'text-purple-400', bg: 'bg-purple-500/20' },
    streamer: { icon: Flame, color: 'text-orange-400', bg: 'bg-orange-500/20' },
    champion: { icon: Trophy, color: 'text-yellow-400', bg: 'bg-yellow-500/20' },
  }
  const { icon: Icon, color, bg } = config[type]
  return (
    <div className={cn("p-0.5 rounded-full", bg)}>
      <Icon className={cn("w-3 h-3", color)} />
    </div>
  )
}

function PostCard({ post }: { post: Post }) {
  const [liked, setLiked] = useState(false)
  const [likes, setLikes] = useState(post.likes)

  const handleLike = () => {
    if (liked) {
      setLikes(likes - 1)
    } else {
      setLikes(likes + 1)
    }
    setLiked(!liked)
  }

  return (
    <Card className="bg-[#12121a] border-purple-500/20 overflow-hidden card-hover">
      {/* Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="w-10 h-10 border-2 border-purple-500/50">
              <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${post.user.avatar}`} />
              <AvatarFallback className="bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                {post.user.name.slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            {post.isLive && (
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-[#12121a] flex items-center justify-center">
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-medium text-white">{post.user.name}</span>
              {post.user.badge && <BadgeIcon type={post.user.badge} />}
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500">
              <span>Nivel {post.user.level}</span>
              <span>•</span>
              <span>{post.timestamp}</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="icon" className="text-zinc-400 hover:text-white">
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="px-4 pb-3">
        <p className="text-zinc-300">{post.content}</p>
      </div>

      {/* Media */}
      {post.type === 'live' && (
        <div className="relative aspect-video bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=live-stream')] bg-cover bg-center opacity-30" />
          <div className="relative z-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center cursor-pointer hover:scale-110 transition-transform neon-glow-purple">
              <Play className="w-8 h-8 text-white ml-1" />
            </div>
            <LiveBadge />
            <div className="flex items-center gap-2 text-white">
              <Eye className="w-4 h-4" />
              <span>{post.viewers?.toLocaleString()} espectadores</span>
            </div>
          </div>
        </div>
      )}

      {post.type === 'video' && (
        <div className="relative aspect-video bg-gradient-to-br from-[#1a1a2e] to-[#12121a] flex items-center justify-center">
          <div className="absolute inset-0 bg-[url('https://api.dicebear.com/7.x/shapes/svg?seed=video-thumb')] bg-cover bg-center opacity-20" />
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur flex items-center justify-center cursor-pointer hover:bg-white/20 transition-colors">
            <Play className="w-6 h-6 text-white ml-0.5" />
          </div>
          <div className="absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded text-xs text-white">
            3:45
          </div>
        </div>
      )}

      {post.type === 'image' && (
        <div className="aspect-video bg-gradient-to-br from-purple-900/30 to-cyan-900/30 flex items-center justify-center">
          <div className="grid grid-cols-4 gap-1 p-4">
            {['♠', '♥', '♦', '♣'].map((suit, i) => (
              <div key={suit} className="w-16 h-24 bg-gradient-to-br from-[#1a1a2e] to-[#12121a] border border-purple-500/30 rounded-lg flex items-center justify-center text-2xl neon-text-purple">
                {suit}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 flex items-center justify-between border-t border-purple-500/10">
        <div className="flex items-center gap-4">
          <button
            onClick={handleLike}
            className={cn(
              "flex items-center gap-2 transition-colors",
              liked ? "text-pink-500" : "text-zinc-400 hover:text-pink-500"
            )}
          >
            <Sparkles className={cn("w-5 h-5", liked && "fill-pink-500")} />
            <span className="text-sm">{likes.toLocaleString()}</span>
          </button>
          <button className="flex items-center gap-2 text-zinc-400 hover:text-cyan-400 transition-colors">
            <MessageCircle className="w-5 h-5" />
            <span className="text-sm">{post.comments}</span>
          </button>
          <button className="flex items-center gap-2 text-zinc-400 hover:text-purple-400 transition-colors">
            <Share2 className="w-5 h-5" />
            <span className="text-sm">{post.shares}</span>
          </button>
        </div>
        <button className="text-zinc-400 hover:text-yellow-400 transition-colors">
          <Sparkles className="w-5 h-5" />
        </button>
      </div>
    </Card>
  )
}

export function SocialFeed() {
  const [activeFilter, setActiveFilter] = useState('all')

  const filters = [
    { id: 'all', label: 'Todos' },
    { id: 'live', label: 'En Vivo' },
    { id: 'following', label: 'Siguiendo' },
    { id: 'games', label: 'Juegos' },
  ]

  return (
    <div className="space-y-4">
      {/* Stories / Live streams row */}
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 p-0.5">
            <div className="w-full h-full rounded-full bg-[#12121a] flex items-center justify-center">
              <span className="text-2xl">+</span>
            </div>
          </div>
          <span className="text-xs text-zinc-400">Tu historia</span>
        </div>
        {['Luna', 'Dark', 'Cyber', 'Neon', 'Star', 'Ace'].map((name, i) => (
          <div key={name} className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className={cn(
              "w-16 h-16 rounded-full p-0.5",
              i < 2 ? "bg-gradient-to-r from-pink-500 to-purple-500" : "bg-gradient-to-r from-purple-500/50 to-cyan-500/50"
            )}>
              <Avatar className="w-full h-full border-2 border-[#12121a]">
                <AvatarImage src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`} />
                <AvatarFallback className="bg-[#1a1a2e]">{name[0]}</AvatarFallback>
              </Avatar>
            </div>
            <span className="text-xs text-zinc-400">{name}</span>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <Button
            key={filter.id}
            variant="ghost"
            size="sm"
            onClick={() => setActiveFilter(filter.id)}
            className={cn(
              "rounded-full px-4",
              activeFilter === filter.id
                ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:opacity-90"
                : "bg-[#1a1a2e] text-zinc-400 hover:text-white hover:bg-[#1a1a2e]"
            )}
          >
            {filter.label}
          </Button>
        ))}
      </div>

      {/* Posts */}
      <div className="space-y-4">
        {mockPosts.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
    </div>
  )
}
