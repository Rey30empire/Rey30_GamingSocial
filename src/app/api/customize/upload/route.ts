import { NextRequest, NextResponse } from 'next/server'
import { deleteCardArtwork, getCardCustomizationSnapshot, saveCardArtwork } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')
    const deckKey = typeof formData.get('deckKey') === 'string' ? String(formData.get('deckKey')) : null

    if (!(file instanceof File)) {
      throw new Error('Debes seleccionar una imagen valida.')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imagenes para el Card Lab.')
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error('La imagen supera el limite de 8MB para Card Lab.')
    }

    const artwork = await saveCardArtwork({
      fileName: file.name,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    })
    const snapshot = await getCardCustomizationSnapshot({ deckKey })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Nueva imagen subida: ${artwork.originalName}`,
    })

    return NextResponse.json({ ok: true, artwork, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo subir la imagen.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const artworkId = typeof body?.artworkId === 'string' ? body.artworkId : ''
    const deckKey = typeof body?.deckKey === 'string' ? body.deckKey : null

    const artwork = await deleteCardArtwork(artworkId)
    const snapshot = await getCardCustomizationSnapshot({ deckKey })

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Imagen eliminada: ${artwork.originalName}`,
    })

    return NextResponse.json({ ok: true, artworkId: artwork.id, artwork, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo eliminar la imagen.')
  }
}
