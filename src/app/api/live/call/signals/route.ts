import { NextRequest, NextResponse } from 'next/server'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewLiveCallState } from '@/lib/preview-data'
import { pullLiveCallSignals, sendLiveCallSignal } from '@/lib/live-call'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const searchParams = new URL(request.url).searchParams
    const streamId = searchParams.get('streamId') ?? ''
    const participantId = searchParams.get('participantId') ?? ''

    if (isPreviewModeEnabled()) {
      return NextResponse.json({
        ...getPreviewLiveCallState(streamId || undefined),
        signals: [],
      })
    }

    const signals = await pullLiveCallSignals({
      streamId,
      participantId,
    })

    return NextResponse.json({ ok: true, signals })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudieron cargar las señales WebRTC.')
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('La videollamada WebRTC no está disponible en preview.')
    }

    const body = await request.json().catch(() => ({}))
    const streamId = typeof body?.streamId === 'string' ? body.streamId : ''
    const participantId = typeof body?.participantId === 'string' ? body.participantId : ''
    const toParticipantId = typeof body?.toParticipantId === 'string' ? body.toParticipantId : ''
    const type =
      body?.type === 'offer' || body?.type === 'answer' || body?.type === 'ice'
        ? body.type
        : 'ice'
    const signal = await sendLiveCallSignal({
      streamId,
      participantId,
      toParticipantId,
      type,
      signal: body?.signal,
    })

    publishRealtimeEvent({
      type: 'live-call-updated',
      streamId,
      note: `Señal ${signal.type} enviada.`,
    })

    return NextResponse.json({ ok: true, signal })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo enviar la señal WebRTC.')
  }
}
