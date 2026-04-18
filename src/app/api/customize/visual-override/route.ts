import { NextRequest, NextResponse } from 'next/server'
import {
  activateCardVisualOverrideFromTemplate,
  deactivateCardVisualOverride,
  getCardCustomizationSnapshot,
} from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const templateId = typeof body?.templateId === 'string' ? body.templateId : ''
    const deckKey = typeof body?.deckKey === 'string' ? body.deckKey : null

    const override = await activateCardVisualOverrideFromTemplate(templateId, deckKey)
    const snapshot = await getCardCustomizationSnapshot({ deckKey })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: 'Override visual activado.',
    })

    return NextResponse.json({ ok: true, override, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo activar el override visual.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const overrideId = typeof body?.overrideId === 'string' ? body.overrideId : ''
    const deckKey = typeof body?.deckKey === 'string' ? body.deckKey : null

    const override = await deactivateCardVisualOverride(overrideId)
    const snapshot = await getCardCustomizationSnapshot({ deckKey })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: 'Override visual desactivado.',
    })

    return NextResponse.json({ ok: true, overrideId: override.id, override, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo desactivar el override visual.')
  }
}
