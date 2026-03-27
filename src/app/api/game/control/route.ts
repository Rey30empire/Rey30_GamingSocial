import { NextRequest, NextResponse } from 'next/server'
import { updateGameControl } from '@/lib/game-core'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

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
      body?.action === 'reset-round'
        ? body.action
        : null

    if (!action) {
      throw new Error('Accion de mesa no valida.')
    }

    const result = await updateGameControl({
      roomId,
      action,
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
