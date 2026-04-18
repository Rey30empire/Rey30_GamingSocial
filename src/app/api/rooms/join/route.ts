import { NextRequest, NextResponse } from 'next/server'
import { createApiErrorResponse } from '@/lib/api-errors'
import { joinCurrentUserToRoomByInviteCode } from '@/lib/game-core'
import { ensureGameMatchForRoomByMode } from '@/lib/game-runtime'
import { getPreviewAppSnapshot } from '@/lib/preview-data'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const inviteCode = typeof body?.inviteCode === 'string' ? body.inviteCode : ''

    if (isPreviewModeEnabled()) {
      const previewRoom = getPreviewAppSnapshot().lobby.rooms.find((room) => room.type === 'private') ?? null

      if (!previewRoom) {
        throw new Error('Preview sin salas privadas disponibles.')
      }

      return NextResponse.json({
        ok: true,
        room: {
          id: previewRoom.id,
          name: previewRoom.name,
          inviteCode: previewRoom.inviteCode ?? 'DEMO42',
        },
      })
    }

    const joinedRoom = await joinCurrentUserToRoomByInviteCode(inviteCode)
    await ensureGameMatchForRoomByMode(joinedRoom.roomId)

    publishRealtimeEvent({
      type: 'room-created',
      roomId: joinedRoom.roomId,
      note: joinedRoom.alreadyMember
        ? `Reingreso por codigo a ${joinedRoom.roomName}`
        : `Nuevo ingreso privado a ${joinedRoom.roomName}`,
    })

    return NextResponse.json({
      ok: true,
      room: {
        id: joinedRoom.roomId,
        name: joinedRoom.roomName,
        inviteCode: joinedRoom.inviteCode,
      },
      alreadyMember: joinedRoom.alreadyMember,
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo entrar a la sala privada.')
  }
}
