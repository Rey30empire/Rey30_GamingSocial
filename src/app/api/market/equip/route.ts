import { NextRequest, NextResponse } from 'next/server'
import { equipMarketplaceItem, getMarketplaceSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const itemId = typeof body?.itemId === 'string' ? body.itemId : ''

    const item = await equipMarketplaceItem(itemId)
    const snapshot = await getMarketplaceSnapshot()

    publishRealtimeEvent({
      type: 'inventory-updated',
      note: `Equipado: ${item.marketplaceItem.name}`,
    })
    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Template sincronizado para ${item.marketplaceItem.name}`,
    })

    return NextResponse.json({ ok: true, item, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo equipar el item.')
  }
}
