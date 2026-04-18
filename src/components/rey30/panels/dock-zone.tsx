'use client'

import { cn } from '@/lib/utils'
import { DockPanel } from './dock-panel'
import type { DockPanelState, DockZoneId } from './docking-provider'
import { useDockingLayout } from './docking-provider'

export function DockZone({
  zone,
  renderPanel,
  className,
}: {
  zone: DockZoneId
  renderPanel: (panel: DockPanelState) => React.ReactNode
  className?: string
}) {
  const { panels } = useDockingLayout()
  const zonePanels = panels
    .filter((panel) => panel.zone === zone && panel.status === 'open')
    .sort((left, right) => left.order - right.order)

  if (!zonePanels.length) {
    return null
  }

  return (
    <div className={cn('min-h-0 space-y-3', className)} data-dock-zone={zone}>
      {zonePanels.map((panel) => (
        <DockPanel key={panel.id} panel={panel}>
          {renderPanel(panel)}
        </DockPanel>
      ))}
    </div>
  )
}
