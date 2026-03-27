import { NextRequest, NextResponse } from 'next/server'
import { getCardCustomizationSnapshot, saveDeckTemplate } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const template = await saveDeckTemplate({
      templateId: typeof body?.templateId === 'string' ? body.templateId : null,
      name: typeof body?.name === 'string' ? body.name : '',
      styleId: typeof body?.styleId === 'string' ? body.styleId : null,
      artworkId: typeof body?.artworkId === 'string' ? body.artworkId : null,
      scope: body?.scope === 'card' || body?.scope === 'suit' ? body.scope : 'deck',
      targetCard: typeof body?.targetCard === 'string' ? body.targetCard : null,
      targetSuit: typeof body?.targetSuit === 'string' ? body.targetSuit : null,
      zoom: Number.isFinite(body?.zoom) ? Number(body.zoom) : 100,
      rotation: Number.isFinite(body?.rotation) ? Number(body.rotation) : 0,
      offsetX: Number.isFinite(body?.offsetX) ? Number(body.offsetX) : 0,
      offsetY: Number.isFinite(body?.offsetY) ? Number(body.offsetY) : 0,
      equip: Boolean(body?.equip),
    })
    const snapshot = await getCardCustomizationSnapshot()

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Template guardado: ${template.name}`,
    })

    if (body?.equip) {
      publishRealtimeEvent({
        type: 'inventory-updated',
        note: `Inventario sincronizado con ${template.name}`,
      })
    }

    return NextResponse.json({ ok: true, template, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo guardar el template.')
  }
}
