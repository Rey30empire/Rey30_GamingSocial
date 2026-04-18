import { NextRequest, NextResponse } from 'next/server'
import { createApiErrorResponse } from '@/lib/api-errors'
import { heartbeatLiveCall } from '@/lib/live-call'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('La videollamada WebRTC no está disponible en preview.')
    }

    const body = await request.json().catch(() => ({}))
    const streamId = typeof body?.streamId === 'string' ? body.streamId : ''
    const participantId = typeof body?.participantId === 'string' ? body.participantId : ''
    const microphoneEnabled = body?.microphoneEnabled !== false
    const cameraEnabled = body?.cameraEnabled !== false
    const state = await heartbeatLiveCall({
      streamId,
      participantId,
      microphoneEnabled,
      cameraEnabled,
    })

    publishRealtimeEvent({
      type: 'live-call-updated',
      streamId,
      note: 'Estado de videollamada actualizado.',
    })

    return NextResponse.json({ ok: true, state })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar la videollamada.')
  }
}
