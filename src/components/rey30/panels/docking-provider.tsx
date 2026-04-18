'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

export type DockZoneId = 'left' | 'right' | 'bottom'
export type DockPanelStatus = 'open' | 'collapsed' | 'hidden'

export interface DockPanelDefinition {
  id: string
  title: string
  zone: DockZoneId
  status?: DockPanelStatus
  order?: number
  size?: number
}

export interface DockPanelState extends DockPanelDefinition {
  status: DockPanelStatus
  order: number
}

interface DockingContextValue {
  panels: DockPanelState[]
  getPanel: (panelId: string) => DockPanelState | undefined
  setPanelStatus: (panelId: string, status: DockPanelStatus) => void
  movePanel: (panelId: string, zone: DockZoneId) => void
  resetLayout: () => void
}

const DockingContext = createContext<DockingContextValue | null>(null)

function normalizePanels(panels: DockPanelDefinition[]): DockPanelState[] {
  return panels
    .map((panel, index) => ({
      ...panel,
      status: panel.status ?? 'open',
      order: panel.order ?? index,
    }))
    .sort((left, right) => left.order - right.order)
}

function mergeStoredPanels(defaultPanels: DockPanelState[], storedPanels: DockPanelState[]) {
  const storedById = new Map(storedPanels.map((panel) => [panel.id, panel]))

  return defaultPanels.map((panel) => {
    const stored = storedById.get(panel.id)

    if (!stored) {
      return panel
    }

    return {
      ...panel,
      zone: stored.zone,
      status: stored.status,
      order: stored.order,
      size: stored.size ?? panel.size,
    }
  })
}

function loadInitialPanels(defaultPanels: DockPanelState[], storageKey: string) {
  if (typeof window === 'undefined') {
    return defaultPanels
  }

  try {
    const stored = window.localStorage.getItem(storageKey)
    if (!stored) {
      return defaultPanels
    }

    const parsed = JSON.parse(stored) as DockPanelState[]
    return mergeStoredPanels(defaultPanels, parsed)
  } catch {
    return defaultPanels
  }
}

export function DockingProvider({
  storageKey,
  panels: panelDefinitions,
  children,
}: {
  storageKey: string
  panels: DockPanelDefinition[]
  children: React.ReactNode
}) {
  const defaultPanels = useMemo(() => normalizePanels(panelDefinitions), [panelDefinitions])
  const [panels, setPanels] = useState<DockPanelState[]>(() => loadInitialPanels(defaultPanels, storageKey))

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(storageKey, JSON.stringify(panels))
  }, [panels, storageKey])

  const getPanel = useCallback((panelId: string) => panels.find((panel) => panel.id === panelId), [panels])

  const setPanelStatus = useCallback((panelId: string, status: DockPanelStatus) => {
    setPanels((currentPanels) =>
      currentPanels.map((panel) => (panel.id === panelId ? { ...panel, status } : panel))
    )
  }, [])

  const movePanel = useCallback((panelId: string, zone: DockZoneId) => {
    setPanels((currentPanels) =>
      currentPanels.map((panel) => (panel.id === panelId ? { ...panel, zone, status: 'open' } : panel))
    )
  }, [])

  const resetLayout = useCallback(() => {
    setPanels(defaultPanels)
  }, [defaultPanels])

  const value = useMemo(
    () => ({
      panels,
      getPanel,
      setPanelStatus,
      movePanel,
      resetLayout,
    }),
    [getPanel, movePanel, panels, resetLayout, setPanelStatus]
  )

  return <DockingContext.Provider value={value}>{children}</DockingContext.Provider>
}

export function useDockingLayout() {
  const context = useContext(DockingContext)

  if (!context) {
    throw new Error('useDockingLayout must be used inside DockingProvider.')
  }

  return context
}
