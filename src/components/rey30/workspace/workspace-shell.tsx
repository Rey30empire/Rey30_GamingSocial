'use client'

import { DockingProvider, DockZone, PanelToggleBar, type DockPanelDefinition, type DockPanelState } from '@/components/rey30/panels'
import { cn } from '@/lib/utils'

export function WorkspaceShell({
  storageKey,
  panels,
  header,
  children,
  renderPanel,
  className,
}: {
  storageKey: string
  panels: DockPanelDefinition[]
  header?: React.ReactNode
  children: React.ReactNode
  renderPanel: (panel: DockPanelState) => React.ReactNode
  className?: string
}) {
  return (
    <DockingProvider key={storageKey} storageKey={storageKey} panels={panels}>
      <div className={cn('space-y-3', className)}>
        {header}
        <PanelToggleBar />
        <div className="grid min-h-[42rem] gap-3 xl:grid-cols-[minmax(14rem,18rem)_minmax(0,1fr)_minmax(16rem,22rem)]">
          <DockZone zone="left" renderPanel={renderPanel} className="hidden xl:block" />
          <main className="min-w-0">{children}</main>
          <DockZone zone="right" renderPanel={renderPanel} className="hidden xl:block" />
        </div>
        <DockZone zone="bottom" renderPanel={renderPanel} />
      </div>
    </DockingProvider>
  )
}
