import { NextRequest, NextResponse } from 'next/server'
import { createChatMessage, getChatSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewAppSnapshot } from '@/lib/preview-data'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewAppSnapshot().chat)
    }

    const snapshot = await getChatSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el chat.', 500)
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const roomId = typeof body?.roomId === 'string' ? body.roomId : ''
    const content = typeof body?.content === 'string' ? body.content : ''

    const message = await createChatMessage(roomId, content)

    publishRealtimeEvent({
      type: 'message-created',
      roomId,
      note: content.slice(0, 80),
    })

    publishRealtimeEvent({
      type: 'room-updated',
      roomId,
      note: content.slice(0, 80),
    })

    return NextResponse.json({ ok: true, message })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo guardar el mensaje.')
  }
}
