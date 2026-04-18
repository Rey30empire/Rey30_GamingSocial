'use client'

import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useDockingLayout } from './docking-provider'

export function PanelToggleBar({ className }: { className?: string }) {
  const { panels, resetLayout, setPanelStatus } = useDockingLayout()
  const inactivePanels = panels
    .filter((panel) => panel.status === 'collapsed' || panel.status === 'hidden')
    .sort((left, right) => left.order - right.order)

  if (!inactivePanels.length) {
    return (
      <div className={cn('flex justify-end', className)}>
        <Button
          type="button"
          variant="ghost"
          onClick={resetLayout}
          className="h-9 rounded-md px-3 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white"
        >
          <RotateCcw className="mr-2 h-3.5 w-3.5" />
          Reset paneles
        </Button>
      </div>
    )
  }

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-2', className)}>
      <div className="flex flex-wrap gap-2">
        {inactivePanels.map((panel) => (
          <Button
            key={panel.id}
            type="button"
            variant="outline"
            onClick={() => setPanelStatus(panel.id, 'open')}
            className="h-9 rounded-md border-white/[0.08] bg-white/[0.04] px-3 text-xs text-zinc-200 hover:bg-white/[0.08]"
          >
            Abrir {panel.title}
          </Button>
        ))}
      </div>
      <Button
        type="button"
        variant="ghost"
        onClick={resetLayout}
        className="h-9 rounded-md px-3 text-xs text-zinc-400 hover:bg-white/[0.06] hover:text-white"
      >
        <RotateCcw className="mr-2 h-3.5 w-3.5" />
        Reset paneles
      </Button>
    </div>
  )
}
