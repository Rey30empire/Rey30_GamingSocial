'use client'

import { cn } from '@/lib/utils'
import type { CurrentUserSnapshot } from '@/lib/app-types'
import {
  Crown,
  Gamepad2,
  Home,
  LogOut,
  MessageCircle,
  Palette,
  Radio,
  Search,
  ShoppingBag,
  User,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface NavItemProps {
  icon: React.ReactNode
  label: string
  active?: boolean
  badge?: string
  onClick?: () => void
}

function NavItem({ icon, label, active, badge, onClick }: NavItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-3 overflow-hidden rounded-[1.15rem] border px-4 py-3 text-left transition-all duration-300',
        active
          ? 'border-violet-400/20 bg-gradient-to-r from-violet-500/18 to-fuchsia-500/10 text-white'
          : 'border-transparent bg-transparent text-zinc-400 hover:border-violet-400/10 hover:bg-violet-500/[0.08] hover:text-white'
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 items-center justify-center rounded-[0.95rem] transition-all duration-300',
          active
            ? 'bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(143,92,255,0.45)]'
            : 'bg-white/[0.04] text-zinc-400 group-hover:bg-white/[0.06] group-hover:text-white'
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold tracking-[0.12em]">{label}</p>
      </div>
      {badge ? (
        <Badge className="rounded-full border-0 bg-violet-500/[0.2] px-2 py-1 text-[0.68rem] uppercase tracking-[0.24em] text-violet-100">
          {badge}
        </Badge>
      ) : null}
    </button>
  )
}

interface NavigationProps {
  activeTab: string
  setActiveTab: (tab: string) => void
  onSignOut: () => Promise<void> | void
  showSignOut?: boolean
  currentUser?: CurrentUserSnapshot
  activity?: {
    chatBadge?: string
    gamesBadge?: string
    liveBadge?: string
    currentStatus?: string
    onlineUsers?: string
  }
}

export function Navigation({
  activeTab,
  setActiveTab,
  onSignOut,
  showSignOut = true,
  currentUser,
  activity,
}: NavigationProps) {
  const navItems = [
    { id: 'home', icon: <Home className="h-5 w-5" />, label: 'Inicio', badge: 'Hub' },
    { id: 'chat', icon: <MessageCircle className="h-5 w-5" />, label: 'Chats', badge: activity?.chatBadge ?? '5' },
    { id: 'games', icon: <Gamepad2 className="h-5 w-5" />, label: 'Salas', badge: activity?.gamesBadge ?? '2' },
    { id: 'live', icon: <Radio className="h-5 w-5" />, label: 'En Vivo', badge: activity?.liveBadge ?? 'On' },
    { id: 'market', icon: <ShoppingBag className="h-5 w-5" />, label: 'Addons' },
    { id: 'customize', icon: <Palette className="h-5 w-5" />, label: 'Card Lab' },
    { id: 'profile', icon: <User className="h-5 w-5" />, label: 'Perfil' },
  ]

  return (
    <aside className="surface-panel surface-panel-strong !fixed left-0 top-0 z-50 hidden h-screen w-72 flex-col border-r border-violet-400/10 lg:flex">
      <div className="border-b border-violet-400/10 px-6 py-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.4rem] border border-violet-400/15 bg-gradient-to-br from-violet-500/15 to-fuchsia-500/15">
            <img src="/logo.svg" alt="REY30VERSE" className="h-10 w-10" />
          </div>
          <div>
            <p className="brand-display text-xl font-black text-white">REY30VERSE</p>
            <p className="mt-1 text-xs uppercase tracking-[0.28em] text-zinc-500">Social Gaming Core</p>
          </div>
        </div>
      </div>

      <div className="px-6 py-5">
        <div className="rounded-[1.3rem] border border-violet-400/10 bg-[#120c20] p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
            <Input
              placeholder="Buscar salas, amigos o addons..."
              className="h-11 rounded-full border-violet-400/10 bg-black/20 pl-10 text-white placeholder:text-zinc-500"
            />
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-2 overflow-y-auto px-4 pb-5">
        {navItems.map((item) => (
          <NavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            active={activeTab === item.id}
            badge={item.badge}
            onClick={() => setActiveTab(item.id)}
          />
        ))}
      </nav>

      <div className="border-t border-violet-400/10 px-6 py-5">
        <div className="rounded-[1.6rem] border border-white/[0.08] bg-white/[0.04] p-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12 border border-violet-400/20">
              <AvatarFallback className="bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
                {currentUser?.initials ?? 'R3'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="font-semibold text-white">{currentUser?.displayName ?? 'AlexRey30'}</p>
              <p className="text-sm text-zinc-400">
                Nivel {currentUser?.level ?? 42} • {activity?.currentStatus ?? 'Online ahora'}
              </p>
            </div>
            {showSignOut ? (
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void onSignOut()}
                className="rounded-full text-zinc-400 hover:bg-white/[0.06] hover:text-white"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-black/20 px-3 py-3 text-center">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Pts</p>
              <p className="mt-1 font-semibold text-white">{currentUser?.points ?? '12.4K'}</p>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-3 text-center">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">ELO</p>
              <p className="mt-1 font-semibold text-white">{currentUser?.elo ?? '2350'}</p>
            </div>
            <div className="rounded-xl bg-black/20 px-3 py-3 text-center">
              <p className="text-[0.68rem] uppercase tracking-[0.24em] text-zinc-500">Rank</p>
              <p className="mt-1 font-semibold text-white">{currentUser?.rank ?? 'Top 12'}</p>
            </div>
          </div>

          <div className="mt-4 rounded-[1.2rem] border border-violet-400/10 bg-gradient-to-r from-violet-500/12 to-fuchsia-500/12 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-violet-500/15 text-amber-300">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Tiempo real activo</p>
                <p className="text-xs text-zinc-400">{activity?.onlineUsers ?? '6'} usuarios conectados</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  )
}
