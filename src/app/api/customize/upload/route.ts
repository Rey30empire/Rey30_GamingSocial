import { NextRequest, NextResponse } from 'next/server'
import { getCardCustomizationSnapshot, saveCardArtwork } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new Error('Debes seleccionar una imagen valida.')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imagenes para el Card Lab.')
    }

    const artwork = await saveCardArtwork({
      fileName: file.name,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    })
    const snapshot = await getCardCustomizationSnapshot()

    publishRealtimeEvent({
      type: 'customize-updated',
      note: `Nueva imagen subida: ${artwork.originalName}`,
    })

    return NextResponse.json({ ok: true, artwork, snapshot })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo subir la imagen.')
  }
}
