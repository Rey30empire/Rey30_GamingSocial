import { NextRequest, NextResponse } from 'next/server'
import { createLiveChatMessage } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const streamId = typeof body?.streamId === 'string' ? body.streamId : ''
    const content = typeof body?.content === 'string' ? body.content : ''

    const message = await createLiveChatMessage(streamId, content)

    publishRealtimeEvent({
      type: 'stream-updated',
      streamId,
      note: content.slice(0, 80),
    })

    return NextResponse.json({ ok: true, message })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo enviar el mensaje en vivo.')
  }
}
