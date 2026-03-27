import { NextRequest, NextResponse } from 'next/server'
import { createRoom } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { ensureGameMatchForRoom } from '@/lib/game-core'
import { publishRealtimeEvent } from '@/lib/realtime'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const room = await createRoom({
      name: typeof body?.name === 'string' ? body.name : '',
      mode: body?.mode === 'ranked' || body?.mode === 'tournament' ? body.mode : 'normal',
      isPublic: body?.isPublic !== false,
      botCount: Number.isFinite(body?.botCount) ? Math.max(0, Math.min(3, Number(body.botCount))) : 0,
    })

    publishRealtimeEvent({
      type: 'room-created',
      roomId: room.id,
      note: room.name,
    })

    await ensureGameMatchForRoom(room.id)

    return NextResponse.json({ ok: true, room })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo crear la sala.')
  }
}
