import { NextRequest, NextResponse } from 'next/server'
import { equipDeckTemplate, getCardCustomizationSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const templateId = typeof body?.templateId === 'string' ? body.templateId : ''
    const deckKey = typeof body?.deckKey === 'string' ? body.deckKey : null

    const template = await equipDeckTemplate(templateId, deckKey)
    const snapshot = await getCardCustomizationSnapshot({ deckKey })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Template activo: ${template.name}`,
    })
    publishRealtimeEvent({
      type: 'inventory-updated',
      note: `Inventario sincronizado con ${template.name}`,
    })

    return NextResponse.json({ ok: true, template, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo activar el template.')
  }
}
