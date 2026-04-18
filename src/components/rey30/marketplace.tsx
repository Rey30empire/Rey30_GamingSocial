'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { cn } from '@/lib/utils'
import type { MarketplaceSnapshot, ShopItemSnapshot } from '@/lib/app-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Check,
  Crown,
  Diamond,
  Flame,
  Gift,
  Loader2,
  Lock,
  Package,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
} from 'lucide-react'

interface MarketplaceProps {
  data?: MarketplaceSnapshot
}

type MarketTab = 'all' | 'deck' | 'gift' | 'badge' | 'theme'

const rarityStyles = {
  common: 'border-white/[0.08]',
  rare: 'border-cyan-400/25',
  epic: 'border-fuchsia-400/25',
  legendary: 'border-amber-400/25 shadow-[0_0_0_1px_rgba(251,191,36,0.08)]',
} as const

const imageGradients: Record<string, string> = {
  neon: 'from-violet-500 to-cyan-500',
  anime: 'from-pink-500 to-violet-500',
  cosmic: 'from-cyan-500 to-indigo-500',
  minimal: 'from-zinc-500 to-zinc-700',
  cyber: 'from-cyan-400 to-emerald-400',
  fire: 'from-orange-500 to-rose-500',
  ice: 'from-sky-300 to-cyan-300',
  gold: 'from-amber-300 to-orange-500',
  shadow: 'from-zinc-700 to-zinc-900',
  rainbow: 'from-rose-500 via-amber-400 to-cyan-400',
  pulse: 'from-fuchsia-500 to-pink-400',
  diamond: 'from-sky-400 to-cyan-300',
  trophy: 'from-amber-400 to-yellow-300',
  crown: 'from-amber-400 to-orange-500',
}

async function requestMarketplaceSnapshot() {
  const response = await fetch('/api/market/state', { cache: 'no-store' })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo cargar la tienda.')
  }

  return payload as MarketplaceSnapshot
}

function MarketplaceGlyph({ item }: { item: ShopItemSnapshot }) {
  if (item.type === 'deck') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {['♠', '♥', '♦', '♣'].map((symbol) => (
          <div
            key={symbol}
            className="flex h-11 w-8 items-center justify-center rounded-[0.8rem] border border-white/15 bg-black/20 text-lg text-white"
          >
            {symbol}
          </div>
        ))}
      </div>
    )
  }

  if (item.image === 'diamond') {
    return <Diamond className="h-14 w-14 fill-cyan-300 text-cyan-300" />
  }

  if (item.image === 'crown' || item.image === 'trophy') {
    return <Crown className="h-14 w-14 text-amber-300" />
  }

  if (item.image === 'pulse') {
    return <Sparkles className="h-14 w-14 text-fuchsia-300" />
  }

  return item.type === 'badge' ? <Star className="h-14 w-14 fill-amber-300 text-amber-300" /> : <Gift className="h-14 w-14 text-white" />
}

function CurrencyMark({ currency }: { currency: ShopItemSnapshot['currency'] }) {
  return currency === 'gems' ? (
    <Diamond className="h-4 w-4 text-cyan-300" />
  ) : (
    <span className="text-sm font-bold text-amber-300">$</span>
  )
}

function getActionMeta(item: ShopItemSnapshot) {
  if (item.equipped) {
    return { label: 'Equipado', disabled: true, tone: 'success' as const }
  }

  if ((item.ownedQuantity ?? 0) > 0 && item.canEquip) {
    return { label: 'Equipar', disabled: false, tone: 'accent' as const }
  }

  if ((item.ownedQuantity ?? 0) > 0 && !item.canEquip) {
    return { label: 'Comprar +1', disabled: false, tone: 'neutral' as const }
  }

  return { label: 'Comprar', disabled: false, tone: 'accent' as const }
}

function ShopCard({
  item,
  pending,
  onAction,
}: {
  item: ShopItemSnapshot
  pending: boolean
  onAction: (item: ShopItemSnapshot) => Promise<void>
}) {
  const action = getActionMeta(item)

  return (
    <Card
      className={cn(
        'overflow-hidden rounded-[1.45rem] border bg-[#12121a] transition hover:-translate-y-0.5 hover:border-violet-400/25',
        item.rarity ? rarityStyles[item.rarity] : 'border-white/[0.08]'
      )}
    >
      <div className="relative overflow-hidden border-b border-white/[0.06] bg-gradient-to-br from-violet-500/12 to-cyan-500/10 p-4">
        <div className="absolute inset-0 opacity-60">
          <div className={cn('h-full w-full bg-gradient-to-br', imageGradients[item.image] ?? 'from-violet-500 to-fuchsia-500')} />
        </div>

        <div className="relative z-10 flex items-start justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {item.popular ? (
              <Badge className="border-0 bg-gradient-to-r from-rose-500 to-orange-500 text-white">
                <Flame className="mr-1 h-3 w-3" />
                Popular
              </Badge>
            ) : null}
            {item.new ? <Badge className="border-0 bg-cyan-500/85 text-slate-950">Nuevo</Badge> : null}
            {(item.ownedQuantity ?? 0) > 0 ? (
              <Badge className="border-0 bg-emerald-500/15 text-emerald-200">x{item.ownedQuantity}</Badge>
            ) : null}
          </div>

          {item.equipped ? (
            <Badge className="border-0 bg-violet-500/20 text-violet-100">
              <Check className="mr-1 h-3 w-3" />
              Activo
            </Badge>
          ) : null}
        </div>

        <div className="relative z-10 mt-6 flex min-h-[8.5rem] items-center justify-center rounded-[1.2rem] border border-white/[0.08] bg-black/25">
          <MarketplaceGlyph item={item} />
        </div>
      </div>

      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-base font-semibold text-white">{item.name}</h4>
            <Badge className="border-0 bg-white/[0.06] text-[0.65rem] uppercase tracking-[0.2em] text-zinc-300">
              {item.type}
            </Badge>
          </div>
          <p className="mt-2 text-sm text-zinc-400">{item.description}</p>
        </div>

        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <CurrencyMark currency={item.currency} />
            <span className="text-lg font-semibold text-white">{item.price}</span>
          </div>

          <Button
            size="sm"
            disabled={pending || action.disabled}
            onClick={() => void onAction(item)}
            className={cn(
              'rounded-full px-4 text-white',
              action.tone === 'success'
                ? 'bg-emerald-500/20 text-emerald-100 hover:bg-emerald-500/20'
                : action.tone === 'neutral'
                  ? 'bg-white/[0.08] hover:bg-white/[0.12]'
                  : 'bg-gradient-to-r from-violet-500 to-fuchsia-500 hover:opacity-90'
            )}
          >
            {pending ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" /> : null}
            {action.label}
          </Button>
        </div>
      </div>
    </Card>
  )
}

export function Marketplace({ data }: MarketplaceProps) {
  const [snapshot, setSnapshot] = useState<MarketplaceSnapshot | null>(data ?? null)
  const [activeTab, setActiveTab] = useState<MarketTab>('all')
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(!data)
  const [pendingItemId, setPendingItemId] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const refreshSnapshot = useEffectEvent(async (showLoader = false) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      setSnapshot(await requestMarketplaceSnapshot())
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la tienda.')
    } finally {
      setIsLoading(false)
    }
  })

  const retryLoad = async () => {
    setIsLoading(true)

    try {
      setSnapshot(await requestMarketplaceSnapshot())
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar la tienda.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!snapshot && data) {
      setSnapshot(data)
    }
  }, [data, snapshot])

  useEffect(() => {
    if (snapshot || data) {
      return
    }

    void refreshSnapshot(true)
  }, [data, snapshot, refreshSnapshot])

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/stream')

    const handleRefresh = () => {
      void refreshSnapshot(false)
    }

    eventSource.addEventListener('inventory-updated', handleRefresh)

    return () => {
      eventSource.close()
    }
  }, [refreshSnapshot])

  const handleAction = async (item: ShopItemSnapshot) => {
    const shouldEquip = (item.ownedQuantity ?? 0) > 0 && item.canEquip && !item.equipped
    const endpoint = shouldEquip ? '/api/market/equip' : '/api/market/purchase'

    setPendingItemId(item.id)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          itemId: item.id,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo completar la accion.')
      }

      setSnapshot(payload.snapshot as MarketplaceSnapshot)
      setStatus(shouldEquip ? `${item.name} ahora esta activo en tu cuenta.` : `${item.name} se agrego a tu inventario.`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo completar la accion.')
    } finally {
      setPendingItemId(null)
    }
  }

  if (isLoading && !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">REY30VERSE STORE</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Sincronizando tienda e inventario</h3>
        <p className="mt-2 text-zinc-400">Cargando catalogo premium, monedas y equipamiento desde Prisma.</p>
      </section>
    )
  }

  if (!snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <h3 className="text-3xl font-semibold text-white">Marketplace no disponible</h3>
        <p className="mt-2 text-zinc-400">{error ?? 'Aun no hay catalogo disponible.'}</p>
        <Button
          onClick={() => void retryLoad()}
          className="mt-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90"
        >
          Reintentar
        </Button>
      </section>
    )
  }

  const filteredItems = snapshot.items
    .filter((item) => activeTab === 'all' || item.type === activeTab)
    .filter((item) => item.name.toLowerCase().includes(search.toLowerCase()) || item.description.toLowerCase().includes(search.toLowerCase()))

  const ownedDeckKeys = new Set(
    snapshot.inventory.filter((entry) => entry.type === 'deck' && entry.quantity > 0).map((entry) => entry.image)
  )
  const featuredItem = snapshot.items.find((item) => item.image === 'cosmic') ?? snapshot.items[0]
  const equippedItems = snapshot.inventory.filter((entry) => entry.equipped)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Store Core</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Marketplace operativo</h2>
          <p className="mt-2 max-w-2xl text-zinc-400">
            Compra, equipa y administra barajas, gifts y badges con persistencia real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-amber-400/15 bg-amber-500/10 px-4 py-2 text-sm text-white">
            <span className="mr-2 text-amber-300">$</span>
            {snapshot.coins}
          </div>
          <div className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-4 py-2 text-sm text-white">
            <Diamond className="mr-2 inline h-4 w-4 text-cyan-300" />
            {snapshot.gems}
          </div>
          {equippedItems.map((item) => (
            <Badge key={item.id} className="border-0 bg-violet-500/15 text-violet-100">
              <Check className="mr-1 h-3 w-3" />
              {item.name}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <Card className="overflow-hidden rounded-[1.8rem] border-violet-400/15 bg-gradient-to-br from-violet-500/[0.18] via-fuchsia-500/[0.12] to-cyan-500/[0.16] p-6">
          <div className="flex h-full flex-col justify-between gap-5">
            <div>
              <Badge className="border-0 bg-amber-400 text-slate-950">
                <Star className="mr-1 h-3 w-3" />
                DESTACADO
              </Badge>
              <h3 className="mt-4 text-2xl font-semibold text-white">{featuredItem?.name ?? 'Pack premium'}</h3>
              <p className="mt-2 max-w-xl text-zinc-200">{featuredItem?.description ?? 'Curacion visual para elevar la mesa y el perfil.'}</p>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div className="flex items-end gap-3">
                <CurrencyMark currency={featuredItem?.currency ?? 'coins'} />
                <span className="text-4xl font-semibold text-white">{featuredItem?.price ?? 0}</span>
              </div>
              {featuredItem ? (
                <Button
                  onClick={() => void handleAction(featuredItem)}
                  disabled={pendingItemId === featuredItem.id}
                  className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90"
                >
                  {pendingItemId === featuredItem.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingBag className="mr-2 h-4 w-4" />}
                  {getActionMeta(featuredItem).label}
                </Button>
              ) : null}
            </div>
          </div>
        </Card>

        <Card className="rounded-[1.8rem] border-white/[0.08] bg-white/[0.04] p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Inventario</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Lo que ya desbloqueaste</h3>
            </div>
            <Package className="h-5 w-5 text-cyan-300" />
          </div>

          <ScrollArea className="mt-4 h-[16rem] rounded-[1.25rem] border border-white/[0.08] bg-black/20 p-4">
            <div className="space-y-3">
              {snapshot.inventory.length > 0 ? (
                snapshot.inventory.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-4 rounded-[1rem] border border-white/[0.06] bg-white/[0.04] px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          'flex h-11 w-11 items-center justify-center rounded-[1rem] bg-gradient-to-br text-white',
                          imageGradients[entry.image] ?? 'from-violet-500 to-fuchsia-500'
                        )}
                      >
                        {entry.type === 'gift' ? <Gift className="h-5 w-5" /> : entry.type === 'badge' ? <Star className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="font-medium text-white">{entry.name}</p>
                        <p className="text-xs uppercase tracking-[0.2em] text-zinc-500">
                          {entry.type} • x{entry.quantity}
                        </p>
                      </div>
                    </div>
                    {entry.equipped ? (
                      <Badge className="border-0 bg-emerald-500/15 text-emerald-200">
                        <Check className="mr-1 h-3 w-3" />
                        Activo
                      </Badge>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                  Tu inventario aun esta vacio. Compra el primer pack para desbloquear estilos y regalos.
                </div>
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>

      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Buscar barajas, gifts o badges..."
            className="h-12 rounded-full border-violet-400/10 bg-black/20 pl-11 text-white placeholder:text-zinc-500"
          />
        </div>

        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as MarketTab)} className="w-full xl:w-auto">
          <TabsList className="h-auto w-full rounded-full border border-violet-400/10 bg-black/25 p-1 xl:w-auto">
            {[
              ['all', 'Todo'],
              ['deck', 'Barajas'],
              ['gift', 'Gifts'],
              ['badge', 'Badges'],
              ['theme', 'Themes'],
            ].map(([id, label]) => (
              <TabsTrigger
                key={id}
                value={id}
                className="rounded-full px-4 py-2 data-[state=active]:bg-gradient-to-r data-[state=active]:from-violet-500 data-[state=active]:to-fuchsia-500 data-[state=active]:text-white"
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <Card className="rounded-[1.8rem] border-white/[0.08] bg-white/[0.04] p-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Deck access</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">Estilos desbloqueables</h3>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {snapshot.deckStyles.map((style) => {
            const owned = ownedDeckKeys.has(style.id)

            return (
              <div
                key={style.id}
                className={cn(
                  'rounded-[1.2rem] border p-4',
                  owned ? 'border-violet-400/20 bg-violet-500/[0.08]' : 'border-white/[0.08] bg-black/20'
                )}
              >
                <div className={cn('h-24 rounded-[1rem] bg-gradient-to-br', style.colors)} />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-white">{style.name}</p>
                    <p className="text-xs text-zinc-500">{owned ? 'Disponible en Card Lab' : 'Bloqueado'}</p>
                  </div>
                  {owned ? <Check className="h-4 w-4 text-emerald-300" /> : <Lock className="h-4 w-4 text-zinc-500" />}
                </div>
              </div>
            )
          })}
        </div>
      </Card>

      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Catalogo</p>
            <h3 className="mt-2 text-2xl font-semibold text-white">
              {activeTab === 'all'
                ? 'Todos los productos'
                : activeTab === 'deck'
                  ? 'Barajas premium'
                  : activeTab === 'gift'
                    ? 'Gifts consumibles'
                    : activeTab === 'theme'
                      ? 'Themes y ambientación'
                      : 'Badges y extras'}
            </h3>
          </div>
          <Badge className="border-0 bg-white/[0.06] text-zinc-200">{filteredItems.length} items</Badge>
        </div>

        <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
            {filteredItems.map((item) => (
              <ShopCard key={item.id} item={item} pending={pendingItemId === item.id} onAction={handleAction} />
            ))}
          {!filteredItems.length ? (
            <Card className="rounded-[1.45rem] border-dashed border-white/[0.08] bg-black/20 p-6 text-sm text-zinc-400 md:col-span-2 2xl:col-span-4">
              No hay items para este filtro todavía. Cambia de categoría o limpia la búsqueda.
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
