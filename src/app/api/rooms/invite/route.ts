import { NextRequest, NextResponse } from 'next/server'
import { regenerateRoomInviteCode } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''

    if (isPreviewModeEnabled()) {
      return NextResponse.json({
        ok: true,
        room: {
          id: roomId || 'preview-room-private',
          inviteCode: 'DEMO42',
        },
      })
    }

    const room = await regenerateRoomInviteCode(roomId)

    publishRealtimeEvent({
      type: 'room-created',
      roomId: room.id,
      note: `Codigo privado regenerado para ${room.name}`,
    })

    return NextResponse.json({
      ok: true,
      room: {
        id: room.id,
        inviteCode: room.inviteCode,
      },
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo regenerar el codigo privado.')
  }
}
