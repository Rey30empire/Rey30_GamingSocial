'use client'

import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import { applyEffectTrigger } from '@/lib/game-engine/effects'
import { cn } from '@/lib/utils'
import { toast } from '@/hooks/use-toast'
import type {
  CardArtworkSnapshot,
  CardCustomizationSnapshot,
  CardVisualOverrideEntrySnapshot,
  DeckStyleSnapshot,
  DeckTemplateSnapshot,
} from '@/lib/app-types'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Slider } from '@/components/ui/slider'
import {
  Check,
  Copy,
  Download,
  ImagePlus,
  Loader2,
  Move,
  Palette,
  PencilLine,
  RefreshCcw,
  Save,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react'

interface CardCustomizationProps {
  data?: CardCustomizationSnapshot
}

type EditorState = CardCustomizationSnapshot['editor']
type ScopeMode = EditorState['scope']
type ElementalPreviewCard = CardCustomizationSnapshot['deckModules'][number]['previewCards'][number]

const suitOptions = [
  { id: 'spades', label: 'Espadas', symbol: '♠' },
  { id: 'crowns', label: 'Corazones', symbol: '♥' },
  { id: 'diamonds', label: 'Diamantes', symbol: '♦' },
  { id: 'clubs', label: 'Tréboles', symbol: '♣' },
] as const

const cardValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

async function requestCustomizationSnapshot(deckKey?: string | null) {
  const params = new URLSearchParams()

  if (deckKey) {
    params.set('deckKey', deckKey)
  }

  const response = await fetch(`/api/customize/state${params.size ? `?${params.toString()}` : ''}`, {
    cache: 'no-store',
  })
  const payload = await response.json()

  if (!response.ok) {
    throw new Error(payload?.error ?? 'No se pudo cargar Card Lab.')
  }

  return payload as CardCustomizationSnapshot
}

function emptyEditor(): EditorState {
  return {
    activeTemplateId: null,
    templateName: 'Nuevo Template',
    styleId: null,
    artworkId: null,
    scope: 'deck',
    targetCard: null,
    targetSuit: null,
    targetModule: null,
    targetElement: null,
    zoom: 100,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
  }
}

function parseTargetCard(targetCard: string | null) {
  if (!targetCard) {
    return { value: 'Q', suitId: 'spades' }
  }

  const [value, suitId] = targetCard.split('-')
  const safeSuitId = suitOptions.some((option) => option.id === suitId) ? suitId : 'spades'
  return {
    value: value || 'Q',
    suitId: safeSuitId,
  }
}

function editorFromTemplate(template: DeckTemplateSnapshot): EditorState {
  return {
    activeTemplateId: template.id,
    templateName: template.name,
    styleId: template.styleId,
    artworkId: template.artwork?.id ?? null,
    scope: template.scope,
    targetCard: template.targetCard,
    targetSuit: template.targetSuit,
    targetModule: template.targetModule,
    targetElement: template.targetElement,
    zoom: template.zoom,
    rotation: template.rotation,
    offsetX: template.offsetX,
    offsetY: template.offsetY,
  }
}

function getStyle(snapshot: CardCustomizationSnapshot | null, styleId: string | null) {
  return snapshot?.styles.find((style) => style.id === styleId) ?? null
}

function getArtwork(snapshot: CardCustomizationSnapshot | null, artworkId: string | null) {
  return snapshot?.artworks.find((artwork) => artwork.id === artworkId) ?? null
}

function isWarmSuitPreview(value: string) {
  return value.includes('♥') || value.includes('♦')
}

function formatSignedNumber(value: number) {
  return value > 0 ? `+${value}` : String(value)
}

const visualScopeLabels: Record<NonNullable<ElementalPreviewCard['resolvedVisual']>['sourceScope'], string> = {
  base: 'Base',
  deck: 'Baraja',
  card: 'Carta',
  suit: 'Palo',
  module: 'Modulo',
  element: 'Elemento',
}

const editorScopeLabels: Record<ScopeMode, string> = {
  deck: 'Baraja',
  card: 'Carta',
  suit: 'Palo',
  module: 'Modulo',
  element: 'Elemento',
}

const comparisonModeLabels = {
  focused: 'Módulos/elementos',
  all: 'Todo',
} as const

type ComparisonMode = keyof typeof comparisonModeLabels

const comparisonViewLabels = {
  all: 'Todas las filas',
  differences: 'Solo diferencias',
} as const

type ComparisonView = keyof typeof comparisonViewLabels

function describeTemplateTarget(template: Pick<DeckTemplateSnapshot, 'scope' | 'targetCard' | 'targetSuit' | 'targetModule' | 'targetElement'>) {
  if (template.scope === 'card') {
    return template.targetCard ? template.targetCard.replace('-', ' ') : 'Carta puntual'
  }

  if (template.scope === 'suit') {
    return template.targetSuit ?? 'Palo'
  }

  if (template.scope === 'module') {
    return template.targetModule ?? 'Modulo elemental'
  }

  if (template.scope === 'element') {
    return template.targetElement ?? 'Elemento'
  }

  return 'Mazo completo'
}

function getComparisonTarget(override: CardVisualOverrideEntrySnapshot) {
  if (override.scope === 'deck') {
    return 'Mazo completo'
  }

  if (override.scope === 'card') {
    return override.targetCard?.replace('-', ' ') ?? 'Carta puntual'
  }

  if (override.scope === 'suit') {
    return override.targetSuit ?? 'Palo'
  }

  if (override.scope === 'module') {
    return override.targetModule ?? 'module'
  }

  if (override.scope === 'element') {
    return override.targetElement ?? 'element'
  }

  return null
}

function describeComparisonSlot(scope: CardVisualOverrideEntrySnapshot['scope'], target: string) {
  return `${editorScopeLabels[scope]}: ${target}`
}

function PreviewCard({
  style,
  artwork,
  editor,
  cardValue,
  suitId,
  elementalCard,
}: {
  style: DeckStyleSnapshot | null
  artwork: CardArtworkSnapshot | null
  editor: EditorState
  cardValue: string
  suitId: string
  elementalCard?: ElementalPreviewCard | null
}) {
  const suit = suitOptions.find((option) => option.id === suitId) ?? suitOptions[0]
  const isElementalCard = Boolean(elementalCard)
  const cornerLabel = elementalCard?.label ?? cardValue
  const cornerSymbol = elementalCard?.element ? elementalCard.element.slice(0, 2).toUpperCase() : suit.symbol
  const centerLabel = elementalCard?.element ? elementalCard.element.toUpperCase() : suit.symbol
  const previewBackground = elementalCard
    ? {
        background: `linear-gradient(145deg, ${elementalCard.themeColor ?? '#22d3ee'}, ${
          elementalCard.accentColor ?? '#111827'
        })`,
      }
    : undefined

  return (
    <div
      className={cn(
        'relative mx-auto aspect-[3/4] w-full max-w-[17rem] overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_22px_80px_rgba(18,12,40,0.45)]',
        style && !isElementalCard
          ? `bg-gradient-to-br ${style.colors}`
          : isElementalCard
            ? 'bg-black/50'
            : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
      )}
      style={previewBackground}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.18),transparent_28%),linear-gradient(180deg,rgba(11,8,23,0.12),rgba(8,6,16,0.34))]" />
      <div className="absolute inset-[8%] overflow-hidden rounded-[1.5rem] border border-white/12 bg-black/15">
        {artwork ? (
          <img
            src={artwork.url}
            alt={artwork.name}
            className="h-full w-full object-cover"
            style={{
              transform: `translate(${editor.offsetX}%, ${editor.offsetY}%) scale(${editor.zoom / 100}) rotate(${editor.rotation}deg)`,
            }}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-black/15 px-6 text-center text-sm text-zinc-200">
            {isElementalCard
              ? 'Preview real de carta elemental. Puedes aplicar estilo o arte a este scope.'
              : 'Sube arte propio o aplica solo el estilo desbloqueado.'}
          </div>
        )}
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
        <div className="leading-none">
          <div className="text-2xl font-semibold">{cornerLabel}</div>
          <div className="mt-1 text-2xl">{cornerSymbol}</div>
        </div>
        <div className="self-center text-center">
          <div className="text-4xl font-semibold opacity-90">{centerLabel}</div>
          {elementalCard?.name ? <div className="mt-2 text-xs uppercase tracking-[0.22em]">{elementalCard.name}</div> : null}
        </div>
        <div className="rotate-180 self-end text-right leading-none">
          <div className="text-2xl font-semibold">{cornerLabel}</div>
          <div className="mt-1 text-2xl">{cornerSymbol}</div>
        </div>
      </div>
    </div>
  )
}

export function CardCustomization({ data }: CardCustomizationProps) {
  const [snapshot, setSnapshot] = useState<CardCustomizationSnapshot | null>(data ?? null)
  const [editor, setEditor] = useState<EditorState>(data?.editor ?? emptyEditor())
  const [selectedDeckKey, setSelectedDeckKey] = useState(data?.activeDeckKey ?? 'default')
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(data?.editor.activeTemplateId ?? null)
  const [selectedCard, setSelectedCard] = useState(parseTargetCard(data?.editor.targetCard ?? null))
  const [selectedElementalCardId, setSelectedElementalCardId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(!data)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null)
  const [templateRenameDraft, setTemplateRenameDraft] = useState('')
  const [newDeckName, setNewDeckName] = useState('')
  const [deckRenameDraft, setDeckRenameDraft] = useState(data?.deckOptions.find((option) => option.key === data.activeDeckKey)?.name ?? '')
  const [compareDeckKeys, setCompareDeckKeys] = useState<string[]>(data?.deckOptions.slice(0, 3).map((option) => option.key) ?? [])
  const [comparisonMode, setComparisonMode] = useState<ComparisonMode>('focused')
  const [comparisonView, setComparisonView] = useState<ComparisonView>('all')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const refreshSnapshot = useEffectEvent(async (showLoader = false, resetEditor = false) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const nextSnapshot = await requestCustomizationSnapshot(selectedDeckKey)
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)

      if (resetEditor || !editor.activeTemplateId) {
        setEditor(nextSnapshot.editor)
        setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
        setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
        setSelectedElementalCardId(null)
        setDeckRenameDraft(nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? '')
      }

      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar Card Lab.')
    } finally {
      setIsLoading(false)
    }
  })

  const retryLoad = async () => {
    setIsLoading(true)

    try {
      const nextSnapshot = await requestCustomizationSnapshot(selectedDeckKey)
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)
      setEditor(nextSnapshot.editor)
      setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
      setSelectedElementalCardId(null)
      setDeckRenameDraft(nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? '')
      setError(null)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cargar Card Lab.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!snapshot && data) {
      setSnapshot(data)
      setEditor(data.editor)
      setSelectedDeckKey(data.activeDeckKey)
      setDeckRenameDraft(data.deckOptions.find((option) => option.key === data.activeDeckKey)?.name ?? '')
      setSelectedTemplateId(data.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(data.editor.targetCard))
      setSelectedElementalCardId(null)
    }
  }, [data, snapshot])

  useEffect(() => {
    if (snapshot || data) {
      return
    }

    void refreshSnapshot(true, true)
  }, [data, snapshot, refreshSnapshot])

  useEffect(() => {
    const eventSource = new EventSource('/api/realtime/stream')

    const handleRealtimeRefresh = () => {
      void refreshSnapshot(false, false)
    }

    eventSource.addEventListener('customize-updated', handleRealtimeRefresh)
    eventSource.addEventListener('inventory-updated', handleRealtimeRefresh)

    return () => {
      eventSource.close()
    }
  }, [refreshSnapshot])

  const ownedStyleIds = new Set(snapshot?.inventoryDecks.map((deck) => deck.image) ?? [])
  const activeStyle = getStyle(snapshot, editor.styleId)
  const activeArtwork = getArtwork(snapshot, editor.artworkId)
  const displaySuitId = editor.scope === 'suit' ? editor.targetSuit ?? selectedCard.suitId : selectedCard.suitId
  const elementalModules = snapshot?.deckModules.filter((module) => module.type === 'elemental') ?? []
  const selectedModule = elementalModules.find((module) => module.id === editor.targetModule) ?? elementalModules[0] ?? null
  const elementOptions = Array.from(
    new Map(
      elementalModules
        .filter((module) => module.element)
        .map((module) => [module.element!, { id: module.element!, label: module.name, color: module.themeColor }])
    ).values()
  )
  const selectedElement = elementOptions.find((element) => element.id === editor.targetElement) ?? elementOptions[0] ?? null
  const modulePreviewCards = selectedModule?.previewCards ?? []
  const activeElementId = editor.targetElement ?? selectedElement?.id ?? null
  const elementPreviewCards = elementalModules
    .filter((module) => module.element === activeElementId)
    .flatMap((module) => module.previewCards)
  const visibleElementalCards =
    editor.scope === 'module' ? modulePreviewCards : editor.scope === 'element' ? elementPreviewCards : []
  const selectedElementalCard =
    visibleElementalCards.find((card) => card.id === selectedElementalCardId) ?? visibleElementalCards[0] ?? null
  const selectedElementalModule =
    elementalModules.find((module) => module.id === selectedElementalCard?.moduleId) ?? selectedModule
  const activeDeckOption = snapshot?.deckOptions.find((option) => option.key === selectedDeckKey) ?? snapshot?.deckOptions[0] ?? null
  const activeOverrideSourceTemplateIds = new Set(
    snapshot?.visualOverrides.map((override) => override.sourceTemplateId).filter((templateId): templateId is string => Boolean(templateId)) ?? []
  )
  const comparisonDecks = useMemo(() => {
    if (!snapshot) {
      return []
    }

    const deckMap = new Map(snapshot.deckComparisons.map((deck) => [deck.deckKey, deck]))
    const selectedDecks = compareDeckKeys
      .map((deckKey) => deckMap.get(deckKey))
      .filter((deck): deck is CardCustomizationSnapshot['deckComparisons'][number] => Boolean(deck))

    if (!compareDeckKeys.length) {
      return []
    }

    const fallbackDecks = snapshot.deckComparisons.filter((deck) => !selectedDecks.some((selected) => selected.deckKey === deck.deckKey))

    return [...selectedDecks, ...fallbackDecks].slice(0, 3)
  }, [compareDeckKeys, snapshot])
  const comparisonRows = useMemo(() => {
    const rows = new Map<
      string,
      {
        key: string
        scope: CardVisualOverrideEntrySnapshot['scope']
        target: string
        overridesByDeck: Map<string, CardVisualOverrideEntrySnapshot>
      }
    >()

    for (const deck of comparisonDecks) {
      for (const override of deck.overrides) {
        if (comparisonMode === 'focused' && override.scope !== 'module' && override.scope !== 'element') {
          continue
        }

        const target = getComparisonTarget(override)

        if (!target) {
          continue
        }

        const key = `${override.scope}:${target}`
        const row =
          rows.get(key) ??
          {
            key,
            scope: override.scope,
            target,
            overridesByDeck: new Map<string, CardVisualOverrideEntrySnapshot>(),
          }

        row.overridesByDeck.set(deck.deckKey, override)
        rows.set(key, row)
      }
    }

    return Array.from(rows.values())
      .map((row) => {
        const signatures = comparisonDecks.map((deck) => {
          const override = row.overridesByDeck.get(deck.deckKey)
          return override
            ? `${override.styleName}|${override.sourceTemplateName ?? ''}|${override.artwork?.name ?? ''}|${override.zoom}|${override.rotation}|${override.offsetX}|${override.offsetY}`
            : 'none'
        })

        return {
          ...row,
          isDifferent: new Set(signatures).size > 1,
        }
      })
      .filter((row) => comparisonView === 'all' || row.isDifferent)
      .sort((left, right) => left.key.localeCompare(right.key))
  }, [comparisonDecks, comparisonMode, comparisonView])
  const effectSimulation =
    selectedElementalCard?.moduleId && selectedElementalModule
      ? applyEffectTrigger({
          card: {
            id: selectedElementalCard.id,
            moduleId: selectedElementalCard.moduleId,
            element: selectedElementalCard.element,
            rank: selectedElementalCard.rank,
            value: selectedElementalCard.rank,
          },
          modules: elementalModules.map((module) => ({
            id: module.id,
            name: module.name,
            type: module.type,
            themeColor: module.themeColor,
            compatibleGameModes: ['custom-table'],
            effects: module.effects,
          })),
          trigger: 'on-score',
          baseScore: selectedElementalCard.rank,
          minScore: 0,
          context: {
            gameMode: 'custom-table',
            player: {
              id: 'card-lab-player',
              seatIndex: 0,
              displayName: 'Jugador preview',
            },
            trick: {
              index: 1,
              tableCardCount: 4,
              playedCardIds: [selectedElementalCard.id],
            },
            table: {
              id: 'card-lab-simulation',
              modeId: 'custom-table',
              playerCount: 6,
              turnSeatIndex: 0,
            },
            activeModule: {
              id: selectedElementalModule.id,
              name: selectedElementalModule.name,
              type: selectedElementalModule.type,
              element: selectedElementalCard.element,
            },
          },
        })
      : null

  const loadTemplate = (template: DeckTemplateSnapshot) => {
    setSelectedTemplateId(template.id)
    setEditor(editorFromTemplate(template))
    setSelectedCard(parseTargetCard(template.targetCard))
    setSelectedElementalCardId(null)
    setStatus(`Template cargado: ${template.name}`)
    setError(null)
  }

  const resetEditorState = () => {
    if (snapshot) {
      setEditor(snapshot.editor)
      setSelectedTemplateId(snapshot.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(snapshot.editor.targetCard))
      setSelectedElementalCardId(null)
      setStatus('Editor restaurado al ultimo estado guardado.')
      setError(null)
      return
    }

    setEditor(emptyEditor())
    setSelectedTemplateId(null)
    setSelectedCard(parseTargetCard(null))
    setSelectedElementalCardId(null)
    setStatus('Editor restaurado.')
    setError(null)
  }

  const duplicateCurrentTemplate = () => {
    setSelectedTemplateId(null)
    setSelectedElementalCardId(null)
    setEditor((current) => ({
      ...current,
      activeTemplateId: null,
      templateName: `${current.templateName || 'Template'} copia`,
    }))
    setStatus('Variante duplicada en el editor. Guarda para crear un template nuevo.')
    setError(null)
  }

  const switchDeckKey = async (deckKey: string) => {
    setSelectedDeckKey(deckKey)
    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/deck', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'activate',
          deckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo cambiar el mazo activo.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)
      setEditor(nextSnapshot.editor)
      setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
      setSelectedElementalCardId(null)
      setDeckRenameDraft(nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? '')
      setStatus(`Mazo activo: ${nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? nextSnapshot.activeDeckKey}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo cambiar el mazo activo.')
    } finally {
      setIsSaving(false)
    }
  }

  const toggleCompareDeck = (deckKey: string) => {
    setCompareDeckKeys((current) => {
      if (current.includes(deckKey)) {
        return current.filter((key) => key !== deckKey)
      }

      return [...current, deckKey].slice(-3)
    })
  }

  const createSavedDeck = async () => {
    const safeName = newDeckName.trim()

    if (!safeName) {
      setError('El mazo necesita un nombre.')
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/deck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: safeName,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo crear el mazo.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)
      setDeckRenameDraft(nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? '')
      setCompareDeckKeys((current) => [...current.filter((key) => key !== nextSnapshot.activeDeckKey), nextSnapshot.activeDeckKey].slice(-3))
      setNewDeckName('')
      setStatus(`Mazo creado: ${payload.deck.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo crear el mazo.')
    } finally {
      setIsSaving(false)
    }
  }

  const renameSavedDeck = async () => {
    const safeName = deckRenameDraft.trim()

    if (!safeName) {
      setError('El mazo necesita un nombre valido.')
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/deck', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rename',
          deckKey: selectedDeckKey,
          name: safeName,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo renombrar el mazo.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)
      setStatus(`Mazo renombrado: ${payload.deck.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo renombrar el mazo.')
    } finally {
      setIsSaving(false)
    }
  }

  const duplicateSavedDeck = async () => {
    if (!activeDeckOption) {
      setError('Selecciona un mazo para duplicar.')
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/deck', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'duplicate',
          deckKey: selectedDeckKey,
          name: `${activeDeckOption.name} copia`,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo duplicar el mazo.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      const copiedOverrideCount = Number(payload.copiedOverrideCount ?? 0)
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)
      setEditor(nextSnapshot.editor)
      setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
      setSelectedElementalCardId(null)
      setDeckRenameDraft(nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? '')
      setCompareDeckKeys((current) => [...current.filter((key) => key !== nextSnapshot.activeDeckKey), nextSnapshot.activeDeckKey].slice(-3))
      setStatus(`Mazo duplicado: ${payload.deck.name} (${copiedOverrideCount} overrides copiados).`)
      toast({
        title: 'Mazo duplicado',
        description: `${payload.deck.name} copio ${copiedOverrideCount} override${copiedOverrideCount === 1 ? '' : 's'} activo${copiedOverrideCount === 1 ? '' : 's'}.`,
      })
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'No se pudo duplicar el mazo.'
      setError(message)
      toast({
        title: 'No se pudo duplicar',
        description: message,
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  const deleteSavedDeck = async () => {
    if (selectedDeckKey === 'default' || !activeDeckOption) {
      setError('El mazo principal no se puede eliminar.')
      return
    }

    if (!window.confirm(`Eliminar el mazo "${activeDeckOption.name}" y sus overrides activos?`)) {
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/deck', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo eliminar el mazo.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)
      setSelectedDeckKey(nextSnapshot.activeDeckKey)
      setDeckRenameDraft(nextSnapshot.deckOptions.find((option) => option.key === nextSnapshot.activeDeckKey)?.name ?? '')
      setStatus(`Mazo eliminado: ${payload.deck.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar el mazo.')
    } finally {
      setIsSaving(false)
    }
  }

  const setScope = (scope: ScopeMode) => {
    setSelectedElementalCardId(null)
    setEditor((current) => ({
      ...current,
      scope,
      targetCard: scope === 'card' ? `${selectedCard.value}-${selectedCard.suitId}` : null,
      targetSuit: scope === 'suit' ? selectedCard.suitId : null,
      targetModule: scope === 'module' ? selectedModule?.id ?? null : null,
      targetElement: scope === 'element' ? selectedElement?.id ?? null : null,
    }))
  }

  const saveTemplate = async (equip: boolean) => {
    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/template', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          name: editor.templateName,
          styleId: editor.styleId,
          artworkId: editor.artworkId,
          scope: editor.scope,
          targetCard: editor.scope === 'card' ? `${selectedCard.value}-${selectedCard.suitId}` : null,
          targetSuit: editor.scope === 'suit' ? selectedCard.suitId : null,
          targetModule: editor.scope === 'module' ? editor.targetModule ?? selectedModule?.id ?? null : null,
          targetElement: editor.scope === 'element' ? editor.targetElement ?? selectedElement?.id ?? null : null,
          deckKey: selectedDeckKey,
          zoom: editor.zoom,
          rotation: editor.rotation,
          offsetX: editor.offsetX,
          offsetY: editor.offsetY,
          equip,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo guardar el template.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      const savedTemplate =
        nextSnapshot.templates.find((template) => template.id === payload?.template?.id) ??
        (equip ? nextSnapshot.templates.find((template) => template.isEquipped) : null)

      setSnapshot(nextSnapshot)

      if (savedTemplate) {
        loadTemplate(savedTemplate)
      } else {
        setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
      }

      setStatus(equip ? 'Template guardado y activado.' : 'Template guardado en tu libreria.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo guardar el template.')
    } finally {
      setIsSaving(false)
    }
  }

  const equipTemplate = async (templateId: string) => {
    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/equip', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo activar el template.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      const activeTemplate = nextSnapshot.templates.find((template) => template.id === templateId)

      setSnapshot(nextSnapshot)
      setSelectedTemplateId(templateId)

      if (activeTemplate) {
        setEditor(editorFromTemplate(activeTemplate))
        setSelectedCard(parseTargetCard(activeTemplate.targetCard))
      } else {
        setEditor(nextSnapshot.editor)
        setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
      }

      setStatus('Template activado para tu baraja.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo activar el template.')
    } finally {
      setIsSaving(false)
    }
  }

  const applyTemplateAsVisualOverride = async (templateId: string) => {
    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/visual-override', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo activar el override visual.')
      }

      setSnapshot(payload.snapshot as CardCustomizationSnapshot)
      setStatus('Override visual aplicado sin cambiar tu libreria de templates.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo activar el override visual.')
    } finally {
      setIsSaving(false)
    }
  }

  const loadVisualOverride = (override: CardVisualOverrideEntrySnapshot) => {
    const sourceTemplate = snapshot?.templates.find((template) => template.id === override.sourceTemplateId)

    if (sourceTemplate) {
      loadTemplate(sourceTemplate)
      return
    }

    setSelectedTemplateId(null)
    setEditor({
      ...editorFromTemplate(override),
      activeTemplateId: null,
      templateName: `${override.name} copia`,
    })
    setSelectedCard(parseTargetCard(override.targetCard))
    setSelectedElementalCardId(null)
    setStatus('Override cargado como variante editable. Guarda para convertirlo en template.')
    setError(null)
  }

  const deactivateVisualOverride = async (override: CardVisualOverrideEntrySnapshot) => {
    if (!window.confirm(`Desactivar el override "${override.name}"?`)) {
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/visual-override', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          overrideId: override.id,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo desactivar el override visual.')
      }

      setSnapshot(payload.snapshot as CardCustomizationSnapshot)
      setStatus(`Override desactivado: ${override.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo desactivar el override visual.')
    } finally {
      setIsSaving(false)
    }
  }

  const duplicateTemplateOnServer = async (template: DeckTemplateSnapshot) => {
    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/template', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'duplicate',
          templateId: template.id,
          name: `${template.name} copia`,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo duplicar el template.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      const duplicatedTemplate = nextSnapshot.templates.find((entry) => entry.id === payload.template.id)

      setSnapshot(nextSnapshot)

      if (duplicatedTemplate) {
        loadTemplate(duplicatedTemplate)
      }

      setStatus(`Template duplicado: ${payload.template.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo duplicar el template.')
    } finally {
      setIsSaving(false)
    }
  }

  const renameTemplateOnServer = async (templateId: string) => {
    const safeName = templateRenameDraft.trim()

    if (!safeName) {
      setError('El template necesita un nombre valido.')
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/template', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'rename',
          templateId,
          name: safeName,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo renombrar el template.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      const renamedTemplate = nextSnapshot.templates.find((entry) => entry.id === templateId)

      setSnapshot(nextSnapshot)
      setEditingTemplateId(null)
      setTemplateRenameDraft('')

      if (renamedTemplate && selectedTemplateId === templateId) {
        setEditor(editorFromTemplate(renamedTemplate))
      }

      setStatus(`Template renombrado: ${payload.template.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo renombrar el template.')
    } finally {
      setIsSaving(false)
    }
  }

  const exportCreatorCard = async (mode: 'download' | 'share') => {
    setIsExporting(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/creator-card', {
        cache: 'no-store',
      })

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload?.error ?? 'No se pudo exportar la Creator Card.')
      }

      const blob = await response.blob()
      const fileName =
        response.headers
          .get('Content-Disposition')
          ?.match(/filename=\"?([^"]+)\"?/)?.[1] ?? `${snapshot?.creatorCard.username.replace(/^@/, '') ?? 'creator-card'}.png`
      const file = new File([blob], fileName, { type: 'image/png' })

      if (mode === 'share' && typeof navigator.share === 'function' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: `Creator Card de ${snapshot?.creatorCard.displayName ?? 'REY30VERSE'}`,
          text: `${snapshot?.creatorCard.activeTemplateName ?? 'Creator Card'} • ${snapshot?.creatorCard.focusLabel ?? ''}`.trim(),
          files: [file],
        })
        setStatus('Creator Card lista para compartir.')
        return
      }

      const objectUrl = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = fileName
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
      setStatus(mode === 'share' ? 'Tu navegador no soporta share de archivos. Se descargó la Creator Card.' : 'Creator Card exportada en PNG.')
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo exportar la Creator Card.')
    } finally {
      setIsExporting(false)
    }
  }

  const copyCreatorSummary = async () => {
    if (!snapshot) {
      return
    }

    const summary = [
      `${snapshot.creatorCard.displayName} ${snapshot.creatorCard.username}`,
      snapshot.creatorCard.roleLine,
      `Template activo: ${snapshot.creatorCard.activeTemplateName}`,
      `Foco: ${snapshot.creatorCard.focusLabel}`,
      `Deck: ${snapshot.creatorCard.equippedStyleName}`,
      snapshot.creatorCard.activityLabel,
    ].join('\n')

    try {
      await navigator.clipboard.writeText(summary)
      setStatus('Resumen de Creator Card copiado.')
      setError(null)
    } catch {
      setError('No se pudo copiar el resumen de Creator Card.')
    }
  }

  const uploadArtwork = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('deckKey', selectedDeckKey)

    setIsUploading(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/upload', {
        method: 'POST',
        body: formData,
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo subir la imagen.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)
      setEditor((current) => ({
        ...current,
        artworkId: payload.artwork.id,
      }))
      setStatus(`Imagen subida: ${payload.artwork.originalName}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo subir la imagen.')
    } finally {
      setIsUploading(false)

      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const deleteTemplate = async (templateId: string) => {
    const targetTemplate = snapshot?.templates.find((template) => template.id === templateId)

    if (!targetTemplate || !window.confirm(`Eliminar el template "${targetTemplate.name}"?`)) {
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/template', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          templateId,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo eliminar el template.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)

      if (selectedTemplateId === templateId || !nextSnapshot.templates.some((template) => template.id === selectedTemplateId)) {
        setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
        setEditor(nextSnapshot.editor)
        setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
      }

      setStatus(`Template eliminado: ${targetTemplate.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar el template.')
    } finally {
      setIsSaving(false)
    }
  }

  const deleteArtwork = async (artworkId: string) => {
    const targetArtwork = snapshot?.artworks.find((artwork) => artwork.id === artworkId)

    if (!targetArtwork || !window.confirm(`Eliminar la imagen "${targetArtwork.name}"?`)) {
      return
    }

    setIsSaving(true)
    setError(null)
    setStatus(null)

    try {
      const response = await fetch('/api/customize/upload', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          artworkId,
          deckKey: selectedDeckKey,
        }),
      })
      const payload = await response.json()

      if (!response.ok) {
        throw new Error(payload?.error ?? 'No se pudo eliminar la imagen.')
      }

      const nextSnapshot = payload.snapshot as CardCustomizationSnapshot
      setSnapshot(nextSnapshot)
      setEditor((current) => ({
        ...current,
        artworkId: current.artworkId === artworkId ? null : current.artworkId,
      }))
      setStatus(`Imagen eliminada: ${targetArtwork.name}`)
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'No se pudo eliminar la imagen.')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading && !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8" data-testid="card-lab-status-panel">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">REY30VERSE CARD LAB</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Sincronizando estilos y templates</h3>
        <p className="mt-2 text-zinc-400">Levantando tu biblioteca visual, arte subido e inventario premium.</p>
      </section>
    )
  }

  if (!snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8" data-testid="card-lab-status-panel">
        <h3 className="text-3xl font-semibold text-white">Card Lab no disponible</h3>
        <p className="mt-2 text-zinc-400">{error ?? 'Aun no hay configuracion disponible.'}</p>
        <Button
          onClick={() => void retryLoad()}
          className="mt-5 rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-6 text-white hover:opacity-90"
        >
          Reintentar
        </Button>
      </section>
    )
  }

  return (
    <div className="space-y-6" data-testid="card-lab-workspace">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0]

          if (file) {
            void uploadArtwork(file)
          }
        }}
      />

      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Card Lab</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">Editor persistente de barajas</h2>
          <p className="mt-2 max-w-3xl text-zinc-400">
            Combina estilos comprados, arte propio y templates guardados para equipar tu mesa real.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-full border border-amber-400/15 bg-amber-500/10 px-4 py-2 text-sm text-white">
            <span className="mr-2 text-amber-300">$</span>
            {snapshot.coins}
          </div>
          <div className="rounded-full border border-cyan-400/15 bg-cyan-500/10 px-4 py-2 text-sm text-white">
            <Sparkles className="mr-2 inline h-4 w-4 text-cyan-300" />
            {snapshot.gems} gems
          </div>
        </div>
      </div>

      <Card className="rounded-[1.5rem] border-white/[0.08] bg-white/[0.04] p-4">
        <div className="grid gap-5 xl:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Mazos guardados</p>
              <p className="mt-1 max-w-3xl text-sm text-zinc-400">
                Los overrides activos se guardan por mazo real. El skin visual se elige dentro del editor y no define
                la identidad del mazo.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {snapshot.deckOptions.map((deckOption) => (
                <button
                  key={deckOption.key}
                  type="button"
                  onClick={() => void switchDeckKey(deckOption.key)}
                  disabled={isSaving || selectedDeckKey === deckOption.key}
                  className={cn(
                    'rounded-full border px-4 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                    selectedDeckKey === deckOption.key
                      ? 'border-cyan-300/40 bg-cyan-500/15 text-cyan-100'
                      : 'border-white/[0.08] bg-black/20 text-zinc-300 hover:border-cyan-300/25 hover:text-white'
                  )}
                >
                  {deckOption.name}
                  {deckOption.isDefault ? <span className="ml-2 text-zinc-400">Base</span> : null}
                  {deckOption.isEquipped ? <span className="ml-2 text-cyan-200">Activo</span> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3 rounded-lg border border-white/[0.08] bg-black/20 p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{activeDeckOption?.name ?? 'Mazo'}</p>
                <p className="mt-1 text-xs text-zinc-500">{selectedDeckKey}</p>
              </div>
              {activeDeckOption?.isDefault ? (
                <Badge className="border border-zinc-500/20 bg-zinc-500/10 text-zinc-200">Principal</Badge>
              ) : (
                <Badge className="border border-cyan-300/20 bg-cyan-500/10 text-cyan-100">Guardado</Badge>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.18em] text-zinc-500" htmlFor="new-card-deck-name">
                Crear mazo
              </label>
              <div className="flex gap-2">
                <Input
                  id="new-card-deck-name"
                  value={newDeckName}
                  onChange={(event) => setNewDeckName(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void createSavedDeck()
                    }
                  }}
                  placeholder="Mazo elemental ranked"
                  className="h-10 border-white/[0.08] bg-white/[0.04] text-white placeholder:text-zinc-600"
                />
                <Button
                  type="button"
                  onClick={() => void createSavedDeck()}
                  disabled={isSaving || !newDeckName.trim()}
                  className="h-10 rounded-md bg-cyan-400 px-3 text-slate-950 hover:bg-cyan-300"
                >
                  Crear
                </Button>
              </div>
            </div>

            <div className="grid gap-2">
              <label className="text-xs uppercase tracking-[0.18em] text-zinc-500" htmlFor="rename-card-deck-name">
                Renombrar activo
              </label>
              <div className="flex gap-2">
                <Input
                  id="rename-card-deck-name"
                  value={deckRenameDraft}
                  onChange={(event) => setDeckRenameDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault()
                      void renameSavedDeck()
                    }
                  }}
                  className="h-10 border-white/[0.08] bg-white/[0.04] text-white"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void renameSavedDeck()}
                  disabled={isSaving || !deckRenameDraft.trim()}
                  className="h-10 rounded-md border-white/[0.08] bg-white/[0.04] px-3 text-white hover:bg-white/[0.08]"
                >
                  Renombrar
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={() => void duplicateSavedDeck()}
              disabled={isSaving || !activeDeckOption}
              className="w-full rounded-md border-cyan-300/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/15 disabled:opacity-45"
            >
              <Copy className="mr-2 h-4 w-4" />
              Duplicar mazo completo
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => void deleteSavedDeck()}
              disabled={isSaving || selectedDeckKey === 'default'}
              className="w-full rounded-md border-rose-300/20 bg-rose-500/10 text-rose-100 hover:bg-rose-500/15 disabled:opacity-45"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Eliminar mazo activo
            </Button>
          </div>
        </div>
      </Card>

      {status ? <p className="text-sm text-emerald-300">{status}</p> : null}
      {error ? <p className="text-sm text-rose-300">{error}</p> : null}

      <div className="grid gap-6 2xl:grid-cols-[1.16fr_0.84fr]">
        <section className="surface-panel rounded-[1.8rem] p-5 lg:p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Vista previa</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Mesa equipada</h3>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={resetEditorState}
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                <RefreshCcw className="mr-2 h-4 w-4" />
                Resetear
              </Button>
              <Button
                variant="outline"
                onClick={duplicateCurrentTemplate}
                className="rounded-full border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                <Copy className="mr-2 h-4 w-4" />
                Duplicar variante
              </Button>
              <Button
                onClick={() => void saveTemplate(false)}
                disabled={isSaving}
                className="rounded-full bg-white/[0.08] text-white hover:bg-white/[0.12]"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Guardar
              </Button>
              <Button
                onClick={() => void saveTemplate(true)}
                disabled={isSaving}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              >
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                Guardar y equipar
              </Button>
            </div>
          </div>

          <div className="mt-6 grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
            <div className="space-y-4">
              <PreviewCard
                style={activeStyle}
                artwork={activeArtwork}
                editor={editor}
                cardValue={selectedCard.value}
                suitId={displaySuitId}
                elementalCard={selectedElementalCard}
              />

              <Card className="rounded-[1.5rem] border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
                  {visibleElementalCards.length > 0 ? 'Cartas reales del scope' : 'Deck preview'}
                </p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {visibleElementalCards.length > 0
                    ? visibleElementalCards.slice(0, 13).map((card) => (
                        <button
                          key={card.id}
                          onClick={() => setSelectedElementalCardId(card.id)}
                          className={cn(
                            'flex aspect-[3/4] w-16 shrink-0 flex-col items-center justify-center rounded-[1rem] border px-2 text-center text-sm font-semibold text-white transition',
                            selectedElementalCard?.id === card.id
                              ? 'border-white/35 shadow-[0_0_28px_rgba(34,211,238,0.22)]'
                              : 'border-white/12 opacity-75 hover:opacity-100'
                          )}
                          style={{
                            background: `linear-gradient(145deg, ${card.themeColor ?? '#22d3ee'}, ${
                              card.accentColor ?? '#111827'
                            })`,
                          }}
                        >
                          <span>{card.label}</span>
                          <span className="mt-1 text-[0.6rem] uppercase tracking-[0.16em] opacity-80">
                            {card.element}
                          </span>
                        </button>
                      ))
                    : ['A♠', '10♥', 'K♣', 'Q♦', '7♥'].map((value) => (
                        <div
                          key={value}
                          className={cn(
                            'flex aspect-[3/4] w-16 items-center justify-center rounded-[1rem] border border-white/12 text-lg font-semibold text-white',
                            activeStyle
                              ? `bg-gradient-to-br ${activeStyle.colors}`
                              : 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
                            isWarmSuitPreview(value) ? 'text-rose-100' : 'text-white'
                          )}
                        >
                          {value}
                        </div>
                      ))}
                </div>
              </Card>

              {effectSimulation && selectedElementalCard ? (
                <Card className="rounded-[1.5rem] border-cyan-300/10 bg-cyan-500/[0.04] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm uppercase tracking-[0.24em] text-cyan-200">Simulacion de efecto</p>
                      <p className="mt-1 text-sm text-zinc-400">{selectedElementalCard.name ?? selectedElementalCard.id}</p>
                    </div>
                    <Badge className="border-cyan-300/20 bg-cyan-500/10 text-cyan-100">
                      {effectSimulation.context.gameMode}
                    </Badge>
                  </div>

                  <div className="mt-4 grid grid-cols-3 gap-2">
                    <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-xs text-zinc-500">Base</p>
                      <p className="mt-1 text-lg font-semibold text-white">{effectSimulation.baseScore}</p>
                    </div>
                    <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-xs text-zinc-500">Efecto</p>
                      <p
                        className={cn(
                          'mt-1 text-lg font-semibold',
                          effectSimulation.modifier >= 0 ? 'text-emerald-300' : 'text-rose-300'
                        )}
                      >
                        {formatSignedNumber(effectSimulation.modifier)}
                      </p>
                    </div>
                    <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                      <p className="text-xs text-zinc-500">Resultado</p>
                      <p className="mt-1 text-lg font-semibold text-white">{effectSimulation.score}</p>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    {effectSimulation.effects.length > 0 ? (
                      effectSimulation.effects.map((entry) => (
                        <div key={entry.effect.id} className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-semibold text-white">{entry.effect.name}</span>
                            <span className="text-xs text-cyan-200">{formatSignedNumber(entry.effect.scoreModifier ?? 0)} pts</span>
                          </div>
                          <p className="mt-1 text-xs text-zinc-400">{entry.effect.description}</p>
                          {entry.effect.actions?.length ? (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {entry.effect.actions.map((action) => (
                                <Badge
                                  key={`${entry.effect.id}-${action.type}`}
                                  className="border border-cyan-300/15 bg-cyan-500/10 text-[0.65rem] text-cyan-100"
                                >
                                  {action.label}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      ))
                    ) : (
                      <p className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3 text-sm text-zinc-400">
                        Esta carta no tiene efectos activos para el trigger on-score.
                      </p>
                    )}
                  </div>

                  {selectedElementalCard.resolvedVisual ? (
                    <div className="mt-4 rounded-[1rem] border border-white/[0.08] bg-black/20 p-3 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-zinc-400">Override visual aplicado</span>
                        <span className="text-white">
                          {visualScopeLabels[selectedElementalCard.resolvedVisual.sourceScope]}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {selectedElementalCard.resolvedVisual.templateName ?? 'Base'} ·{' '}
                        {selectedElementalCard.resolvedVisual.styleName}
                      </p>
                    </div>
                  ) : null}
                </Card>
              ) : null}
            </div>

            <div className="space-y-5">
              <Card className="rounded-[1.5rem] border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Template</p>
                <Input
                  value={editor.templateName}
                  onChange={(event) =>
                    setEditor((current) => ({
                      ...current,
                      templateName: event.target.value,
                    }))
                  }
                  placeholder="Nombre del template"
                  className="mt-4 h-12 rounded-full border-violet-400/10 bg-black/20 text-white placeholder:text-zinc-500"
                />
              </Card>

              <Card className="rounded-[1.5rem] border-white/[0.08] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Scope</p>
                  <Move className="h-4 w-4 text-cyan-300" />
                </div>

                <div className="mt-4 grid gap-2 sm:grid-cols-5">
                  {[
                    ['deck', 'Baraja completa'],
                    ['card', 'Carta puntual'],
                    ['suit', 'Solo un palo'],
                    ['module', 'Modulo elemental'],
                    ['element', 'Elemento'],
                  ].map(([scope, label]) => (
                    <button
                      key={scope}
                      onClick={() => setScope(scope as ScopeMode)}
                      className={cn(
                        'rounded-[1rem] border px-4 py-3 text-left transition',
                        editor.scope === scope
                          ? 'border-violet-400/25 bg-violet-500/[0.08] text-white'
                          : 'border-white/[0.08] bg-black/20 text-zinc-400 hover:border-violet-400/20'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                {editor.scope === 'card' ? (
                  <div className="mt-4 space-y-3">
                    <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {cardValues.map((value) => (
                        <button
                          key={value}
                          onClick={() => {
                            setSelectedCard((current) => ({
                              ...current,
                              value,
                            }))
                            setEditor((current) => ({
                              ...current,
                              targetCard: `${value}-${selectedCard.suitId}`,
                            }))
                          }}
                          className={cn(
                            'rounded-[0.95rem] border px-3 py-2 text-sm transition',
                            selectedCard.value === value
                              ? 'border-violet-400/25 bg-violet-500/[0.08] text-white'
                              : 'border-white/[0.08] bg-black/20 text-zinc-400'
                          )}
                        >
                          {value}
                        </button>
                      ))}
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                      {suitOptions.map((suit) => (
                        <button
                          key={suit.id}
                          onClick={() => {
                            setSelectedCard((current) => ({
                              ...current,
                              suitId: suit.id,
                            }))
                            setEditor((current) => ({
                              ...current,
                              targetCard: `${selectedCard.value}-${suit.id}`,
                            }))
                          }}
                          className={cn(
                            'rounded-[0.95rem] border px-3 py-3 transition',
                            selectedCard.suitId === suit.id
                              ? 'border-violet-400/25 bg-violet-500/[0.08] text-white'
                              : 'border-white/[0.08] bg-black/20 text-zinc-400'
                          )}
                        >
                          <div className="text-lg">{suit.symbol}</div>
                          <div className="mt-1 text-xs">{suit.label}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                {editor.scope === 'suit' ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {suitOptions.map((suit) => (
                      <button
                        key={suit.id}
                        onClick={() => {
                          setSelectedCard((current) => ({
                            ...current,
                            suitId: suit.id,
                          }))
                          setEditor((current) => ({
                            ...current,
                            targetSuit: suit.id,
                          }))
                        }}
                        className={cn(
                          'rounded-[0.95rem] border px-3 py-3 transition',
                          (editor.targetSuit ?? selectedCard.suitId) === suit.id
                            ? 'border-violet-400/25 bg-violet-500/[0.08] text-white'
                            : 'border-white/[0.08] bg-black/20 text-zinc-400'
                        )}
                      >
                        <div className="text-lg">{suit.symbol}</div>
                        <div className="mt-1 text-xs">{suit.label}</div>
                      </button>
                    ))}
                  </div>
                ) : null}

                {editor.scope === 'module' ? (
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {elementalModules.map((module) => (
                      <button
                        key={module.id}
                        onClick={() => {
                          setSelectedElementalCardId(module.previewCards[0]?.id ?? null)
                          setEditor((current) => ({
                            ...current,
                            targetModule: module.id,
                            targetElement: null,
                          }))
                        }}
                        className={cn(
                          'rounded-[0.95rem] border px-3 py-3 text-left transition',
                          (editor.targetModule ?? selectedModule?.id) === module.id
                            ? 'border-cyan-300/40 bg-cyan-500/[0.08] text-white'
                            : 'border-white/[0.08] bg-black/20 text-zinc-400'
                        )}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-semibold">{module.name}</span>
                          <span
                            className="h-3 w-3 rounded-full"
                            style={{
                              backgroundColor: module.themeColor,
                            }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-zinc-500">{module.cards} cartas</p>
                        {module.effects[0] ? (
                          <p className="mt-2 text-xs text-cyan-200">{module.effects[0].name}: {module.effects[0].description}</p>
                        ) : null}
                      </button>
                    ))}
                  </div>
                ) : null}

                {editor.scope === 'element' ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {elementOptions.map((element) => (
                      <button
                        key={element.id}
                        onClick={() => {
                          const firstCard = elementalModules.find((module) => module.element === element.id)?.previewCards[0]
                          setSelectedElementalCardId(firstCard?.id ?? null)
                          setEditor((current) => ({
                            ...current,
                            targetElement: element.id,
                            targetModule: null,
                          }))
                        }}
                        className={cn(
                          'rounded-[0.95rem] border px-3 py-3 text-left transition',
                          (editor.targetElement ?? selectedElement?.id) === element.id
                            ? 'border-cyan-300/40 bg-cyan-500/[0.08] text-white'
                            : 'border-white/[0.08] bg-black/20 text-zinc-400'
                        )}
                      >
                        <span
                          className="mb-2 block h-3 w-8 rounded-full"
                          style={{
                            backgroundColor: element.color,
                          }}
                        />
                        <span className="text-sm font-semibold">{element.label}</span>
                      </button>
                    ))}
                  </div>
                ) : null}

                {visibleElementalCards.length > 0 ? (
                  <div className="mt-4 rounded-[1.2rem] border border-cyan-300/10 bg-cyan-500/[0.04] p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-xs uppercase tracking-[0.22em] text-cyan-200">Cartas elementales</p>
                      <span className="text-xs text-zinc-500">{visibleElementalCards.length} cartas</span>
                    </div>
                    <div className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
                      {visibleElementalCards.slice(0, 13).map((card) => (
                        <button
                          key={card.id}
                          onClick={() => setSelectedElementalCardId(card.id)}
                          className={cn(
                            'rounded-[0.85rem] border px-2 py-2 text-left transition',
                            selectedElementalCard?.id === card.id
                              ? 'border-cyan-300/40 bg-cyan-500/[0.1] text-white'
                              : 'border-white/[0.08] bg-black/20 text-zinc-400 hover:border-cyan-300/20'
                          )}
                        >
                          <span className="block text-sm font-semibold">{card.label}</span>
                          <span className="mt-1 block truncate text-[0.65rem] text-zinc-500">{card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}
              </Card>

              <Card className="rounded-[1.5rem] border-white/[0.08] bg-white/[0.04] p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Transformación</p>
                  <Palette className="h-4 w-4 text-fuchsia-300" />
                </div>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {[
                    ['Zoom', editor.zoom, 50, 180, 5, (value: number) => setEditor((current) => ({ ...current, zoom: value }))],
                    ['Rotación', editor.rotation, -180, 180, 5, (value: number) => setEditor((current) => ({ ...current, rotation: value }))],
                    ['Offset X', editor.offsetX, -100, 100, 1, (value: number) => setEditor((current) => ({ ...current, offsetX: value }))],
                    ['Offset Y', editor.offsetY, -100, 100, 1, (value: number) => setEditor((current) => ({ ...current, offsetY: value }))],
                  ].map(([label, value, min, max, step, onChange]) => (
                    <div key={label as string}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-zinc-300">{label as string}</span>
                        <span className="text-zinc-500">{value as number}</span>
                      </div>
                      <Slider
                        value={[value as number]}
                        min={min as number}
                        max={max as number}
                        step={step as number}
                        onValueChange={(next) => (onChange as (value: number) => void)(next[0])}
                      />
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          </div>
        </section>
        <aside className="space-y-5">
          <Card className="rounded-[1.75rem] border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] bg-gradient-to-br from-violet-500 to-fuchsia-500 text-lg font-semibold text-white">
                  {snapshot.creatorCard.initials}
                </div>
                <div>
                  <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Creator Card</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{snapshot.creatorCard.displayName}</h3>
                  <p className="text-sm text-violet-200">{snapshot.creatorCard.username}</p>
                  <p className="mt-1 text-sm text-zinc-300">{snapshot.creatorCard.roleLine}</p>
                </div>
              </div>
              <Badge className="border-0 bg-cyan-500/15 text-cyan-100">{snapshot.creatorCard.level}</Badge>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => void exportCreatorCard('download')}
                disabled={isExporting}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              >
                {isExporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                Exportar PNG
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void exportCreatorCard('share')}
                disabled={isExporting}
                className="rounded-full border-cyan-400/20 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20"
              >
                <Share2 className="mr-2 h-4 w-4" />
                Compartir
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => void copyCreatorSummary()}
                className="rounded-full border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
                <Copy className="mr-2 h-4 w-4" />
                Copiar resumen
              </Button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Followers</p>
                <p className="mt-2 text-xl font-semibold text-white">{snapshot.creatorCard.followers}</p>
              </div>
              <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Templates</p>
                <p className="mt-2 text-xl font-semibold text-white">{snapshot.creatorCard.templatesCount}</p>
              </div>
              <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Artworks</p>
                <p className="mt-2 text-xl font-semibold text-white">{snapshot.creatorCard.artworksCount}</p>
              </div>
              <div className="rounded-[1rem] border border-white/[0.08] bg-black/20 p-3">
                <p className="text-xs uppercase tracking-[0.18em] text-zinc-500">Deck activo</p>
                <p className="mt-2 text-sm font-semibold text-white">{snapshot.creatorCard.equippedStyleName}</p>
              </div>
            </div>

            <div className="mt-4 rounded-[1rem] border border-violet-400/15 bg-violet-500/[0.08] p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-violet-200/80">Foco actual</p>
              <p className="mt-2 text-sm font-medium text-white">{snapshot.creatorCard.activeTemplateName}</p>
              <p className="mt-1 text-sm text-violet-100">{snapshot.creatorCard.focusLabel}</p>
              <p className="mt-2 text-xs text-zinc-300">{snapshot.creatorCard.activityLabel}</p>
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-white/[0.08] bg-white/[0.04] p-5" data-testid="card-lab-deck-compare">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Comparar mazos</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">
                  {comparisonMode === 'all' ? 'Diferencias completas' : 'Diferencias por módulo y elemento'}
                </h3>
                <p className="mt-1 text-sm text-zinc-400">
                  Selecciona hasta 3 mazos y alterna entre scopes elementales o todos los overrides activos.
                </p>
              </div>
              <div className="flex flex-col items-start gap-2 sm:items-end">
                <Badge className="w-fit border-0 bg-violet-500/15 text-violet-100">{comparisonDecks.length}/3</Badge>
                <div className="flex rounded-full border border-white/[0.08] bg-black/20 p-1">
                  {Object.entries(comparisonModeLabels).map(([mode, label]) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setComparisonMode(mode as ComparisonMode)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                        comparisonMode === mode ? 'bg-cyan-500/15 text-cyan-100' : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex rounded-full border border-white/[0.08] bg-black/20 p-1">
                  {Object.entries(comparisonViewLabels).map(([view, label]) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => setComparisonView(view as ComparisonView)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                        comparisonView === view ? 'bg-amber-500/15 text-amber-100' : 'text-zinc-400 hover:text-white'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCompareDeckKeys([])}
                  className="h-8 rounded-full border-white/[0.08] bg-white/[0.04] px-3 text-xs text-zinc-300 hover:bg-white/[0.08]"
                >
                  Limpiar
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {snapshot.deckComparisons.map((deck) => {
                const selected = comparisonDecks.some((entry) => entry.deckKey === deck.deckKey)

                return (
                  <button
                    key={deck.deckKey}
                    type="button"
                    onClick={() => toggleCompareDeck(deck.deckKey)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-xs transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300',
                      selected
                        ? 'border-violet-300/35 bg-violet-500/15 text-violet-100'
                        : 'border-white/[0.08] bg-black/20 text-zinc-400 hover:border-white/15 hover:text-white'
                    )}
                  >
                    {deck.deckName}
                    <span className="ml-2 text-zinc-500">{deck.overrides.length}</span>
                  </button>
                )
              })}
            </div>

            <ScrollArea className="mt-4 h-[17rem] rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
              {comparisonRows.length > 0 ? (
                <div className="min-w-0 space-y-2" data-testid="card-lab-deck-compare-table">
                  <div
                    className="grid gap-2 text-xs uppercase tracking-[0.16em] text-zinc-500"
                    style={{ gridTemplateColumns: `minmax(8.5rem,1.1fr) repeat(${Math.max(comparisonDecks.length, 1)}, minmax(0,1fr))` }}
                  >
                    <span>Scope</span>
                    {comparisonDecks.map((deck) => (
                      <span key={deck.deckKey} className="truncate">
                        {deck.deckName}
                      </span>
                    ))}
                  </div>

                  {comparisonRows.map((row) => {
                    return (
                      <div
                        key={row.key}
                        data-testid="card-lab-deck-compare-row"
                        className={cn(
                          'grid gap-2 rounded-[1rem] border p-3',
                          row.isDifferent ? 'border-amber-300/20 bg-amber-500/10' : 'border-white/[0.06] bg-white/[0.03]'
                        )}
                        style={{ gridTemplateColumns: `minmax(8.5rem,1.1fr) repeat(${Math.max(comparisonDecks.length, 1)}, minmax(0,1fr))` }}
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{describeComparisonSlot(row.scope, row.target)}</p>
                          <p className="mt-1 text-xs text-zinc-500">{row.isDifferent ? 'Diferente' : 'Sin diferencias'}</p>
                        </div>

                        {comparisonDecks.map((deck) => {
                          const override = row.overridesByDeck.get(deck.deckKey)

                          return (
                            <div key={`${row.key}-${deck.deckKey}`} className="min-w-0 rounded-lg border border-white/[0.06] bg-black/20 p-3">
                              {override ? (
                                <>
                                  <p className="truncate text-sm font-medium text-white">{override.styleName}</p>
                                  <p className="mt-1 truncate text-xs text-cyan-200">
                                    {override.sourceTemplateName ?? override.name}
                                  </p>
                                  <p className="mt-2 text-xs text-zinc-500">
                                    Z{override.zoom} R{override.rotation} X{override.offsetX} Y{override.offsetY}
                                  </p>
                                </>
                              ) : (
                                <p className="truncate text-sm text-zinc-500">Sin override activo</p>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                  {comparisonView === 'differences'
                    ? 'No hay diferencias visibles entre los mazos seleccionados.'
                    : comparisonMode === 'all'
                    ? 'No hay overrides activos para comparar todavía.'
                    : 'No hay overrides de módulo o elemento para comparar todavía.'}
                </div>
              )}
            </ScrollArea>
          </Card>

          <Card className="rounded-[1.75rem] border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Estilos comprados</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Deck skins</h3>
              </div>
              <Palette className="h-5 w-5 text-cyan-300" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              {snapshot.styles.map((style) => {
                const owned = ownedStyleIds.has(style.id)
                const selected = editor.styleId === style.id

                return (
                  <button
                    key={style.id}
                    disabled={!owned}
                    onClick={() =>
                      setEditor((current) => ({
                        ...current,
                        styleId: style.id,
                      }))
                    }
                    className={cn(
                      'rounded-[1.2rem] border p-3 text-left transition',
                      selected
                        ? 'border-violet-400/25 bg-violet-500/[0.08]'
                        : 'border-white/[0.08] bg-black/20',
                      !owned && 'cursor-not-allowed opacity-45'
                    )}
                  >
                    <div className={cn('h-20 rounded-[1rem] bg-gradient-to-br', style.colors)} />
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-white">{style.name}</p>
                        <p className="text-xs text-zinc-500">{owned ? 'Disponible' : 'Compra esta baraja en tienda'}</p>
                      </div>
                      {owned ? (
                        selected ? <Check className="h-4 w-4 text-emerald-300" /> : <Badge className="border-0 bg-white/[0.06] text-zinc-200">Owned</Badge>
                      ) : null}
                    </div>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="rounded-[1.75rem] border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Artwork</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Biblioteca visual</h3>
              </div>
              <ImagePlus className="h-5 w-5 text-fuchsia-300" />
            </div>

            <div className="mt-4 flex gap-3">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
              >
                {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Subir imagen
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  setEditor((current) => ({
                    ...current,
                    artworkId: null,
                  }))
                }
                className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
              >
                Quitar arte
              </Button>
            </div>

            <ScrollArea className="mt-4 h-[14rem] rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
              <div className="grid grid-cols-2 gap-3">
                {snapshot.artworks.length > 0 ? (
                  snapshot.artworks.map((artwork) => {
                    const selected = editor.artworkId === artwork.id

                    return (
                      <div
                        key={artwork.id}
                        className={cn(
                          'rounded-[1rem] border p-2 text-left transition',
                          selected
                            ? 'border-violet-400/25 bg-violet-500/[0.08]'
                            : 'border-white/[0.08] bg-white/[0.03]'
                        )}
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setEditor((current) => ({
                              ...current,
                              artworkId: artwork.id,
                            }))
                          }
                          className="w-full text-left"
                        >
                          <img src={artwork.url} alt={artwork.name} className="h-24 w-full rounded-[0.8rem] object-cover" />
                        </button>
                        <div className="mt-2 flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium text-white">{artwork.name}</p>
                            <p className="text-xs text-zinc-500">
                              {artwork.width ?? '?'}×{artwork.height ?? '?'}
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            onClick={(event) => {
                              event.stopPropagation()
                              void deleteArtwork(artwork.id)
                            }}
                            className="h-8 w-8 rounded-full text-zinc-500 hover:bg-rose-500/10 hover:text-rose-200"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })
                ) : (
                  <div className="col-span-2 rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                    Sube tu primer arte para empezar a personalizar cartas.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="rounded-[1.75rem] border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Overrides activos</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Capas aplicadas</h3>
              </div>
              <Badge className="border-0 bg-cyan-500/15 text-cyan-100">{snapshot.visualOverrides.length}</Badge>
            </div>

            <ScrollArea className="mt-4 h-[15rem] rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
              <div className="space-y-3">
                {snapshot.visualOverrides.length > 0 ? (
                  snapshot.visualOverrides.map((override) => (
                    <div key={override.id} className="rounded-[1rem] border border-white/[0.06] bg-white/[0.04] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="truncate font-medium text-white">{override.name}</p>
                            <Badge className="border-0 bg-emerald-500/15 text-emerald-200">Activo</Badge>
                          </div>
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                            {editorScopeLabels[override.scope]} • {describeTemplateTarget(override)} • {override.deckKey}
                          </p>
                          <p className="mt-2 text-sm text-zinc-400">
                            {override.styleName}
                            {override.artwork ? ` · ${override.artwork.name}` : ''}
                          </p>
                          {override.sourceTemplateName ? (
                            <p className="mt-1 text-xs text-cyan-200">Fuente: {override.sourceTemplateName}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => loadVisualOverride(override)}
                          className="rounded-full bg-white/[0.08] px-4 text-white hover:bg-white/[0.12]"
                        >
                          Cargar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void deactivateVisualOverride(override)}
                          disabled={isSaving}
                          className="rounded-full border-rose-500/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Desactivar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                    No hay overrides activos. Guarda y equipa un template, o aplica uno desde la librería.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>

          <Card className="rounded-[1.75rem] border-white/[0.08] bg-white/[0.04] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Templates</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Librería persistente</h3>
              </div>
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>

            <ScrollArea className="mt-4 h-[16rem] rounded-[1.2rem] border border-white/[0.08] bg-black/20 p-4">
              <div className="space-y-3">
                {snapshot.templates.length > 0 ? (
                  snapshot.templates.map((template) => (
                    <div key={template.id} className="rounded-[1rem] border border-white/[0.06] bg-white/[0.04] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          {editingTemplateId === template.id ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <Input
                                value={templateRenameDraft}
                                onChange={(event) => setTemplateRenameDraft(event.target.value)}
                                className="h-10 min-w-[16rem] rounded-full border-violet-400/10 bg-black/20 text-white placeholder:text-zinc-500"
                              />
                              <Button
                                size="sm"
                                onClick={() => void renameTemplateOnServer(template.id)}
                                disabled={isSaving}
                                className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
                              >
                                <Save className="mr-2 h-3.5 w-3.5" />
                                Guardar
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setEditingTemplateId(null)
                                  setTemplateRenameDraft('')
                                }}
                                className="rounded-full border-white/[0.08] bg-white/[0.04] text-white hover:bg-white/[0.08]"
                              >
                                <X className="mr-2 h-3.5 w-3.5" />
                                Cancelar
                              </Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white">{template.name}</p>
                              {template.isEquipped ? (
                                <Badge className="border-0 bg-emerald-500/15 text-emerald-200">
                                  <Check className="mr-1 h-3 w-3" />
                                  Activo
                                </Badge>
                              ) : null}
                            </div>
                          )}
                          <p className="mt-1 text-xs uppercase tracking-[0.2em] text-zinc-500">
                            {template.styleName} • {template.scope} • {template.updatedAt}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          onClick={() => loadTemplate(template)}
                          className={cn(
                            'rounded-full px-4 text-white',
                            selectedTemplateId === template.id
                              ? 'bg-violet-500/20 hover:bg-violet-500/20'
                              : 'bg-white/[0.08] hover:bg-white/[0.12]'
                          )}
                        >
                          Cargar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void duplicateTemplateOnServer(template)}
                          className="rounded-full border-white/[0.08] bg-white/[0.04] px-4 text-white hover:bg-white/[0.08]"
                        >
                          <Copy className="mr-2 h-3.5 w-3.5" />
                          Duplicar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingTemplateId(template.id)
                            setTemplateRenameDraft(template.name)
                            setError(null)
                            setStatus(null)
                          }}
                          className="rounded-full border-cyan-400/20 bg-cyan-500/10 px-4 text-cyan-100 hover:bg-cyan-500/20"
                        >
                          <PencilLine className="mr-2 h-3.5 w-3.5" />
                          Renombrar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void applyTemplateAsVisualOverride(template.id)}
                          disabled={isSaving}
                          className={cn(
                            'rounded-full border-emerald-400/20 px-4 text-emerald-100 hover:bg-emerald-500/20',
                            activeOverrideSourceTemplateIds.has(template.id)
                              ? 'bg-emerald-500/15'
                              : 'bg-emerald-500/10'
                          )}
                        >
                          <Check className="mr-2 h-3.5 w-3.5" />
                          {activeOverrideSourceTemplateIds.has(template.id) ? 'Override activo' : 'Aplicar visual'}
                        </Button>
                        {!template.isEquipped ? (
                          <Button
                            size="sm"
                            onClick={() => void equipTemplate(template.id)}
                            disabled={isSaving}
                            className="rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 px-4 text-white hover:opacity-90"
                          >
                            Activar
                          </Button>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void deleteTemplate(template.id)}
                          disabled={isSaving}
                          className="rounded-full border-rose-500/20 bg-rose-500/10 px-4 text-rose-100 hover:bg-rose-500/20"
                        >
                          <Trash2 className="mr-2 h-3.5 w-3.5" />
                          Eliminar
                        </Button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[1rem] border border-dashed border-white/[0.08] px-4 py-6 text-sm text-zinc-400">
                    Aún no tienes templates guardados. Crea uno y guárdalo para reutilizarlo.
                  </div>
                )}
              </div>
            </ScrollArea>
          </Card>
        </aside>
      </div>
    </div>
  )
}
