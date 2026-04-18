import { NextRequest, NextResponse } from 'next/server'
import { setRoomReadyState } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''
    const ready = typeof body?.ready === 'boolean' ? body.ready : undefined

    if (isPreviewModeEnabled()) {
      return NextResponse.json({
        ok: true,
        roomId: roomId || 'preview-room-private',
        ready: ready ?? true,
      })
    }

    const result = await setRoomReadyState(roomId, ready)

    publishRealtimeEvent({
      type: 'room-updated',
      roomId: result.roomId,
      note: result.ready ? 'Jugador listo' : 'Jugador no listo',
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar el estado listo.')
  }
}
