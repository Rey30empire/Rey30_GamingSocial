'use client'

import { ChevronDown, ChevronLeft, ChevronRight, EyeOff, PanelBottom, PanelLeft, PanelRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import type { DockPanelState, DockZoneId } from './docking-provider'
import { useDockingLayout } from './docking-provider'

const zoneIcon: Record<DockZoneId, React.ComponentType<{ className?: string }>> = {
  left: PanelLeft,
  right: PanelRight,
  bottom: PanelBottom,
}

export function DockPanel({
  panel,
  children,
  className,
}: {
  panel: DockPanelState
  children: React.ReactNode
  className?: string
}) {
  const { movePanel, setPanelStatus } = useDockingLayout()
  const ZoneIcon = zoneIcon[panel.zone]

  return (
    <section
      className={cn(
        'min-h-0 overflow-hidden rounded-lg border border-white/[0.08] bg-[#101019]/95 shadow-[0_18px_60px_rgba(0,0,0,0.25)]',
        className
      )}
      aria-label={panel.title}
    >
      <div className="flex h-11 items-center justify-between gap-2 border-b border-white/[0.07] px-3">
        <div className="flex min-w-0 items-center gap-2">
          <ZoneIcon className="h-4 w-4 shrink-0 text-cyan-300" />
          <h3 className="truncate text-sm font-semibold text-white">{panel.title}</h3>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Acoplar ${panel.title} a la izquierda`}
            onClick={() => movePanel(panel.id, 'left')}
            className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/[0.07] hover:text-white"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Acoplar ${panel.title} abajo`}
            onClick={() => movePanel(panel.id, 'bottom')}
            className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/[0.07] hover:text-white"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Acoplar ${panel.title} a la derecha`}
            onClick={() => movePanel(panel.id, 'right')}
            className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/[0.07] hover:text-white"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Colapsar ${panel.title}`}
            onClick={() => setPanelStatus(panel.id, 'collapsed')}
            className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/[0.07] hover:text-white"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={`Cerrar ${panel.title}`}
            onClick={() => setPanelStatus(panel.id, 'hidden')}
            className="h-8 w-8 rounded-md text-zinc-400 hover:bg-white/[0.07] hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="min-h-0 p-3">{children}</div>
    </section>
  )
}
