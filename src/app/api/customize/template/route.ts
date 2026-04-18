import { NextRequest, NextResponse } from 'next/server'
import {
  deleteDeckTemplate,
  duplicateDeckTemplate,
  getCardCustomizationSnapshot,
  renameDeckTemplate,
  saveDeckTemplate,
} from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const template = await saveDeckTemplate({
      templateId: typeof body?.templateId === 'string' ? body.templateId : null,
      deckKey: typeof body?.deckKey === 'string' ? body.deckKey : null,
      name: typeof body?.name === 'string' ? body.name : '',
      styleId: typeof body?.styleId === 'string' ? body.styleId : null,
      artworkId: typeof body?.artworkId === 'string' ? body.artworkId : null,
      scope:
        body?.scope === 'card' || body?.scope === 'suit' || body?.scope === 'module' || body?.scope === 'element'
          ? body.scope
          : 'deck',
      targetCard: typeof body?.targetCard === 'string' ? body.targetCard : null,
      targetSuit: typeof body?.targetSuit === 'string' ? body.targetSuit : null,
      targetModule: typeof body?.targetModule === 'string' ? body.targetModule : null,
      targetElement: typeof body?.targetElement === 'string' ? body.targetElement : null,
      zoom: Number.isFinite(body?.zoom) ? Number(body.zoom) : 100,
      rotation: Number.isFinite(body?.rotation) ? Number(body.rotation) : 0,
      offsetX: Number.isFinite(body?.offsetX) ? Number(body.offsetX) : 0,
      offsetY: Number.isFinite(body?.offsetY) ? Number(body.offsetY) : 0,
      equip: Boolean(body?.equip),
    })
    const snapshot = await getCardCustomizationSnapshot({
      deckKey: typeof body?.deckKey === 'string' ? body.deckKey : null,
    })

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

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const templateId = typeof body?.templateId === 'string' ? body.templateId : ''

    const template = await deleteDeckTemplate(templateId)
    const snapshot = await getCardCustomizationSnapshot({
      deckKey: typeof body?.deckKey === 'string' ? body.deckKey : null,
    })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Template eliminado: ${template.name}`,
    })
    publishRealtimeEvent({
      type: 'inventory-updated',
      note: 'Inventario sincronizado tras eliminar un template.',
    })

    return NextResponse.json({ ok: true, templateId: template.id, template, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo eliminar el template.')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action : ''
    const templateId = typeof body?.templateId === 'string' ? body.templateId : ''

    if (action === 'duplicate') {
      const template = await duplicateDeckTemplate(templateId, typeof body?.name === 'string' ? body.name : null)
      const snapshot = await getCardCustomizationSnapshot({
        deckKey: typeof body?.deckKey === 'string' ? body.deckKey : null,
      })

      publishRealtimeEvent({
        type: 'customize-updated',
        note: `Template duplicado: ${template.name}`,
      })

      return NextResponse.json({ ok: true, action, template, snapshot })
    }

    if (action === 'rename') {
      const template = await renameDeckTemplate(templateId, typeof body?.name === 'string' ? body.name : '')
      const snapshot = await getCardCustomizationSnapshot({
        deckKey: typeof body?.deckKey === 'string' ? body.deckKey : null,
      })

      publishRealtimeEvent({
        type: 'customize-updated',
        note: `Template renombrado: ${template.name}`,
      })

      return NextResponse.json({ ok: true, action, template, snapshot })
    }

    throw new Error('Accion de template no soportada.')
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar el template.')
  }
}
