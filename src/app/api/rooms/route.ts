import { NextRequest, NextResponse } from 'next/server'
import { createRoom, getLobbySnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { ensureGameMatchForRoomByMode } from '@/lib/game-runtime'
import { getPreviewAppSnapshot } from '@/lib/preview-data'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewAppSnapshot().lobby)
    }

    const snapshot = await getLobbySnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el lobby.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const room = await createRoom({
      name: typeof body?.name === 'string' ? body.name : '',
      mode: body?.mode === 'ranked' || body?.mode === 'tournament' ? body.mode : 'normal',
      isPublic: body?.isPublic !== false,
      botCount: Number.isFinite(body?.botCount) ? Math.max(0, Math.min(9, Number(body.botCount))) : 0,
      tableMode: body?.tableMode === 'custom-table' ? 'custom-table' : 'classic-hearts',
      targetPlayers: Number.isFinite(body?.targetPlayers) ? Number(body.targetPlayers) : undefined,
    })

    publishRealtimeEvent({
      type: 'room-created',
      roomId: room.id,
      note: room.name,
    })

    await ensureGameMatchForRoomByMode(room.id)

    return NextResponse.json({ ok: true, room })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo crear la sala.')
  }
}
