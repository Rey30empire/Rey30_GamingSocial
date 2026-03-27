import { NextRequest, NextResponse } from 'next/server'
import { sendLiveGift } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const streamId = typeof body?.streamId === 'string' ? body.streamId : ''
    const itemId = typeof body?.itemId === 'string' ? body.itemId : ''
    const quantity = Number.isFinite(body?.quantity) ? Number(body.quantity) : 1

    const gift = await sendLiveGift({
      streamId,
      itemId,
      quantity,
    })

    publishRealtimeEvent({
      type: 'stream-updated',
      streamId,
      note: `${gift.itemName} x${gift.quantity}`,
    })

    return NextResponse.json({ ok: true, gift })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo enviar el regalo.')
  }
}
