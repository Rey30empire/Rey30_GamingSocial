import { NextRequest, NextResponse } from 'next/server'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewLiveCallState } from '@/lib/preview-data'
import { getLiveCallState, joinLiveCall, leaveLiveCall } from '@/lib/live-call'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const streamId = new URL(request.url).searchParams.get('streamId') ?? ''

    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewLiveCallState(streamId || undefined))
    }

    const state = await getLiveCallState(streamId)
    return NextResponse.json(state)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el estado de la videollamada.')
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('La videollamada WebRTC no está disponible en preview.')
    }

    const body = await request.json().catch(() => ({}))
    const streamId = typeof body?.streamId === 'string' ? body.streamId : ''
    const microphoneEnabled = body?.microphoneEnabled !== false
    const cameraEnabled = body?.cameraEnabled !== false
    const state = await joinLiveCall({
      streamId,
      microphoneEnabled,
      cameraEnabled,
    })

    publishRealtimeEvent({
      type: 'live-call-updated',
      streamId,
      note: 'Participante conectado a la videollamada.',
    })

    return NextResponse.json({ ok: true, state })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo entrar a la videollamada.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('La videollamada WebRTC no está disponible en preview.')
    }

    const body = await request.json().catch(() => ({}))
    const streamId = typeof body?.streamId === 'string' ? body.streamId : ''
    const participantId = typeof body?.participantId === 'string' ? body.participantId : ''
    const result = await leaveLiveCall({
      streamId,
      participantId,
    })

    publishRealtimeEvent({
      type: 'live-call-updated',
      streamId,
      note: 'Participante desconectado de la videollamada.',
    })

    return NextResponse.json(result)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo salir de la videollamada.')
  }
}
