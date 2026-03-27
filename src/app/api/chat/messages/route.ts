import { NextRequest, NextResponse } from 'next/server'
import { createChatMessage } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

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

    return NextResponse.json({ ok: true, message })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo guardar el mensaje.')
  }
}
