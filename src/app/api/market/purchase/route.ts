import { NextRequest, NextResponse } from 'next/server'
import { getMarketplaceSnapshot, purchaseMarketplaceItem } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const itemId = typeof body?.itemId === 'string' ? body.itemId : ''

    const item = await purchaseMarketplaceItem(itemId)
    const snapshot = await getMarketplaceSnapshot()

    publishRealtimeEvent({
      type: 'inventory-updated',
      note: `Compra completada: ${item.name}`,
    })

    return NextResponse.json({ ok: true, item, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo completar la compra.')
  }
}
