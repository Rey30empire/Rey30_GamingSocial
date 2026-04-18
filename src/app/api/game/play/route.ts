import { NextRequest, NextResponse } from 'next/server'
import { playCurrentUserCardByMode } from '@/lib/game-runtime'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''
    const cardId = typeof body?.cardId === 'string' ? body.cardId : ''

    if (isPreviewModeEnabled()) {
      publishRealtimeEvent({
        type: 'match-updated',
        roomId: roomId || 'preview-room-alpha',
        note: `Preview sin persistencia: ${cardId || 'carta'} no se jugo de forma real.`,
      })

      return NextResponse.json({
        ok: true,
        roomId: roomId || 'preview-room-alpha',
        summary: 'Modo preview: la mesa visual esta disponible, pero la jugada real requiere DB.',
      })
    }

    const result = await playCurrentUserCardByMode(roomId, cardId)

    publishRealtimeEvent({
      type: 'match-updated',
      roomId: result.roomId,
      note: result.summary,
    })

    return NextResponse.json({ ok: true, ...result })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo jugar la carta.')
  }
}
