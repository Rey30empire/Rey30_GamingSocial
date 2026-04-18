import { NextRequest, NextResponse } from 'next/server'
import { updateGameControlByMode } from '@/lib/game-runtime'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''
    const action =
      body?.action === 'toggle-voice' ||
      body?.action === 'toggle-sound' ||
      body?.action === 'toggle-chat' ||
      body?.action === 'toggle-dark-mode' ||
      body?.action === 'set-table-zoom' ||
      body?.action === 'set-card-scale' ||
      body?.action === 'reset-round'
        ? body.action
        : null
    const value = Number.isFinite(body?.value) ? Number(body.value) : undefined

    if (!action) {
      throw new Error('Accion de mesa no valida.')
    }

    if (isPreviewModeEnabled()) {
      publishRealtimeEvent({
        type: 'match-updated',
        roomId: roomId || 'preview-room-alpha',
        note: `Preview sin persistencia: accion ${action}.`,
      })

      return NextResponse.json({
        ok: true,
        roomId: roomId || 'preview-room-alpha',
        summary: 'Modo preview: los controles se muestran, pero no persisten cambios sin DB.',
      })
    }

    const result = await updateGameControlByMode({
      roomId,
      action,
      value,
    })

    publishRealtimeEvent({
      type: 'match-updated',
      roomId: result.roomId,
      note: result.summary,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar la mesa.')
  }
}
