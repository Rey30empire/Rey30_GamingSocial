import { NextRequest, NextResponse } from 'next/server'
import { playCurrentUserCard } from '@/lib/game-core'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''
    const cardId = typeof body?.cardId === 'string' ? body.cardId : ''

    const result = await playCurrentUserCard(roomId, cardId)

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
