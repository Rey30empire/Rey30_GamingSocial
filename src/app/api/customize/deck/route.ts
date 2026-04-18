import { NextRequest, NextResponse } from 'next/server'
import {
  activateCardDeckProfile,
  createCardDeckProfile,
  deleteCardDeckProfile,
  duplicateCardDeckProfile,
  getCardCustomizationSnapshot,
  renameCardDeckProfile,
} from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const profile = await createCardDeckProfile(typeof body?.name === 'string' ? body.name : '')
    const snapshot = await getCardCustomizationSnapshot({ deckKey: profile.deckKey })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Mazo guardado creado: ${profile.name}`,
    })

    return NextResponse.json({ ok: true, deck: profile, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo crear el mazo guardado.')
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const action = typeof body?.action === 'string' ? body.action : ''
    const deckKey = typeof body?.deckKey === 'string' ? body.deckKey : 'default'

    if (action === 'activate') {
      const profile = await activateCardDeckProfile(deckKey)
      const snapshot = await getCardCustomizationSnapshot({ deckKey: profile.deckKey })

      publishRealtimeEvent({
        type: 'customize-updated',
        note: `Mazo activo: ${profile.name}`,
      })

      return NextResponse.json({ ok: true, action, deck: profile, snapshot })
    }

    if (action === 'rename') {
      const profile = await renameCardDeckProfile(deckKey, typeof body?.name === 'string' ? body.name : '')
      const snapshot = await getCardCustomizationSnapshot({ deckKey: profile.deckKey })

      publishRealtimeEvent({
        type: 'customize-updated',
        note: `Mazo renombrado: ${profile.name}`,
      })

      return NextResponse.json({ ok: true, action, deck: profile, snapshot })
    }

    if (action === 'duplicate') {
      const { profile, copiedOverrideCount } = await duplicateCardDeckProfile(deckKey, typeof body?.name === 'string' ? body.name : null)
      const snapshot = await getCardCustomizationSnapshot({ deckKey: profile.deckKey })

      publishRealtimeEvent({
        type: 'customize-updated',
        note: `Mazo duplicado: ${profile.name} (${copiedOverrideCount} overrides)`,
      })

      return NextResponse.json({ ok: true, action, deck: profile, copiedOverrideCount, snapshot })
    }

    throw new Error('Accion de mazo no soportada.')
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar el mazo guardado.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const deckKey = typeof body?.deckKey === 'string' ? body.deckKey : ''
    const profile = await deleteCardDeckProfile(deckKey)
    const snapshot = await getCardCustomizationSnapshot({ deckKey: 'default' })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Mazo eliminado: ${profile.name}`,
    })

    return NextResponse.json({ ok: true, deckKey: profile.deckKey, deck: profile, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo eliminar el mazo guardado.')
  }
}
