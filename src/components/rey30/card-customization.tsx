'use client'

import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import type {
  CardArtworkSnapshot,
  CardCustomizationSnapshot,
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
  ImagePlus,
  Loader2,
  Move,
  Palette,
  RefreshCcw,
  Save,
  Sparkles,
  Upload,
} from 'lucide-react'

interface CardCustomizationProps {
  data?: CardCustomizationSnapshot
}

type EditorState = CardCustomizationSnapshot['editor']
type ScopeMode = EditorState['scope']

const suitOptions = [
  { id: 'spades', label: 'Espadas', symbol: '♠' },
  { id: 'crowns', label: 'Corazones', symbol: '♥' },
  { id: 'diamonds', label: 'Diamantes', symbol: '♦' },
  { id: 'clubs', label: 'Tréboles', symbol: '♣' },
] as const

const cardValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const

async function requestCustomizationSnapshot() {
  const response = await fetch('/api/customize/state', {
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

function PreviewCard({
  style,
  artwork,
  editor,
  cardValue,
  suitId,
}: {
  style: DeckStyleSnapshot | null
  artwork: CardArtworkSnapshot | null
  editor: EditorState
  cardValue: string
  suitId: string
}) {
  const suit = suitOptions.find((option) => option.id === suitId) ?? suitOptions[0]

  return (
    <div
      className={cn(
        'relative mx-auto aspect-[3/4] w-full max-w-[17rem] overflow-hidden rounded-[2rem] border border-white/15 shadow-[0_22px_80px_rgba(18,12,40,0.45)]',
        style ? `bg-gradient-to-br ${style.colors}` : 'bg-gradient-to-br from-violet-500 to-fuchsia-500'
      )}
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
            Sube arte propio o aplica solo el estilo desbloqueado.
          </div>
        )}
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between p-5 text-white">
        <div className="leading-none">
          <div className="text-2xl font-semibold">{cardValue}</div>
          <div className="mt-1 text-2xl">{suit.symbol}</div>
        </div>
        <div className="self-center text-5xl opacity-90">{suit.symbol}</div>
        <div className="rotate-180 self-end text-right leading-none">
          <div className="text-2xl font-semibold">{cardValue}</div>
          <div className="mt-1 text-2xl">{suit.symbol}</div>
        </div>
      </div>
    </div>
  )
}

export function CardCustomization({ data }: CardCustomizationProps) {
  const [snapshot, setSnapshot] = useState<CardCustomizationSnapshot | null>(data ?? null)
  const [editor, setEditor] = useState<EditorState>(data?.editor ?? emptyEditor())
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(data?.editor.activeTemplateId ?? null)
  const [selectedCard, setSelectedCard] = useState(parseTargetCard(data?.editor.targetCard ?? null))
  const [isLoading, setIsLoading] = useState(!data)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const refreshSnapshot = useEffectEvent(async (showLoader = false, resetEditor = false) => {
    if (showLoader) {
      setIsLoading(true)
    }

    try {
      const nextSnapshot = await requestCustomizationSnapshot()
      setSnapshot(nextSnapshot)

      if (resetEditor || !editor.activeTemplateId) {
        setEditor(nextSnapshot.editor)
        setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
        setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
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
      const nextSnapshot = await requestCustomizationSnapshot()
      setSnapshot(nextSnapshot)
      setEditor(nextSnapshot.editor)
      setSelectedTemplateId(nextSnapshot.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(nextSnapshot.editor.targetCard))
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
      setSelectedTemplateId(data.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(data.editor.targetCard))
    }
  }, [data, snapshot])

  useEffect(() => {
    if (snapshot || data) {
      return
    }

    void refreshSnapshot(true, true)
  }, [data, snapshot, refreshSnapshot])

  const ownedStyleIds = new Set(snapshot?.inventoryDecks.map((deck) => deck.image) ?? [])
  const activeStyle = getStyle(snapshot, editor.styleId)
  const activeArtwork = getArtwork(snapshot, editor.artworkId)
  const displaySuitId = editor.scope === 'suit' ? editor.targetSuit ?? selectedCard.suitId : selectedCard.suitId

  const loadTemplate = (template: DeckTemplateSnapshot) => {
    setSelectedTemplateId(template.id)
    setEditor(editorFromTemplate(template))
    setSelectedCard(parseTargetCard(template.targetCard))
    setStatus(`Template cargado: ${template.name}`)
    setError(null)
  }

  const resetEditorState = () => {
    if (snapshot) {
      setEditor(snapshot.editor)
      setSelectedTemplateId(snapshot.editor.activeTemplateId)
      setSelectedCard(parseTargetCard(snapshot.editor.targetCard))
      setStatus('Editor restaurado al ultimo estado guardado.')
      setError(null)
      return
    }

    setEditor(emptyEditor())
    setSelectedTemplateId(null)
    setSelectedCard(parseTargetCard(null))
    setStatus('Editor restaurado.')
    setError(null)
  }

  const setScope = (scope: ScopeMode) => {
    setEditor((current) => ({
      ...current,
      scope,
      targetCard: scope === 'card' ? `${selectedCard.value}-${selectedCard.suitId}` : null,
      targetSuit: scope === 'suit' ? selectedCard.suitId : null,
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

  const uploadArtwork = async (file: File) => {
    const formData = new FormData()
    formData.append('file', file)

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

  if (isLoading && !snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">REY30VERSE CARD LAB</p>
        <h3 className="mt-3 text-3xl font-semibold text-white">Sincronizando estilos y templates</h3>
        <p className="mt-2 text-zinc-400">Levantando tu biblioteca visual, arte subido e inventario premium.</p>
      </section>
    )
  }

  if (!snapshot) {
    return (
      <section className="surface-panel rounded-[1.8rem] p-6 lg:p-8">
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
    <div className="space-y-6">
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
              />

              <Card className="rounded-[1.5rem] border-white/[0.08] bg-white/[0.04] p-4">
                <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">Deck preview</p>
                <div className="mt-4 flex gap-3 overflow-x-auto pb-1">
                  {['A♠', '10♥', 'K♣', 'Q♦', '7♥'].map((value) => (
                    <div
                      key={value}
                      className={cn(
                        'flex aspect-[3/4] w-16 items-center justify-center rounded-[1rem] border border-white/12 text-lg font-semibold text-white',
                        activeStyle ? `bg-gradient-to-br ${activeStyle.colors}` : 'bg-gradient-to-br from-violet-500 to-fuchsia-500',
                        isWarmSuitPreview(value) ? 'text-rose-100' : 'text-white'
                      )}
                    >
                      {value}
                    </div>
                  ))}
                </div>
              </Card>
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

                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {[
                    ['deck', 'Baraja completa'],
                    ['card', 'Carta puntual'],
                    ['suit', 'Solo un palo'],
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
                      <button
                        key={artwork.id}
                        onClick={() =>
                          setEditor((current) => ({
                            ...current,
                            artworkId: artwork.id,
                          }))
                        }
                        className={cn(
                          'rounded-[1rem] border p-2 text-left transition',
                          selected
                            ? 'border-violet-400/25 bg-violet-500/[0.08]'
                            : 'border-white/[0.08] bg-white/[0.03]'
                        )}
                      >
                        <img src={artwork.url} alt={artwork.name} className="h-24 w-full rounded-[0.8rem] object-cover" />
                        <p className="mt-2 truncate text-sm font-medium text-white">{artwork.name}</p>
                        <p className="text-xs text-zinc-500">
                          {artwork.width ?? '?'}×{artwork.height ?? '?'}
                        </p>
                      </button>
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
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-white">{template.name}</p>
                            {template.isEquipped ? (
                              <Badge className="border-0 bg-emerald-500/15 text-emerald-200">
                                <Check className="mr-1 h-3 w-3" />
                                Activo
                              </Badge>
                            ) : null}
                          </div>
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
