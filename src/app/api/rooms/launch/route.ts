import { NextRequest, NextResponse } from 'next/server'
import { launchReadyRoom } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { ensureGameMatchForRoomByMode } from '@/lib/game-runtime'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''

    if (isPreviewModeEnabled()) {
      return NextResponse.json({
        ok: true,
        room: {
          id: roomId || 'preview-room-private',
          status: 'starting',
        },
      })
    }

    await ensureGameMatchForRoomByMode(roomId)
    const room = await launchReadyRoom(roomId)

    publishRealtimeEvent({
      type: 'room-updated',
      roomId: room.id,
      note: `Mesa lanzada: ${room.name}`,
    })
    publishRealtimeEvent({
      type: 'match-updated',
      roomId: room.id,
      note: `Mesa lista para iniciar en ${room.name}`,
    })

    return NextResponse.json({
      ok: true,
      room: {
        id: room.id,
        status: room.status.toLowerCase(),
      },
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo lanzar la sala.')
  }
}
