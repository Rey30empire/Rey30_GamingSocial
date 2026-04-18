import { NextRequest, NextResponse } from 'next/server'
import { deleteFeedPostMedia, saveFeedPostMedia } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_UPLOAD_SIZE_BYTES = 8 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('El feed preview no acepta uploads persistidos.')
    }

    const formData = await request.formData()
    const file = formData.get('file')

    if (!(file instanceof File)) {
      throw new Error('Debes seleccionar una imagen valida para el post.')
    }

    if (!file.type.startsWith('image/')) {
      throw new Error('Solo se permiten imagenes en el feed por ahora.')
    }

    if (file.size > MAX_UPLOAD_SIZE_BYTES) {
      throw new Error('La imagen supera el limite de 8MB para publicaciones.')
    }

    const media = await saveFeedPostMedia({
      fileName: file.name,
      mimeType: file.type,
      buffer: Buffer.from(await file.arrayBuffer()),
    })

    return NextResponse.json({
      ok: true,
      media: {
        id: media.id,
        url: media.publicUrl ?? media.filePath,
        mimeType: media.mimeType,
        width: media.width,
        height: media.height,
        originalName: media.originalName,
      },
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo subir la imagen del post.')
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('El feed preview no administra uploads persistidos.')
    }

    const body = await request.json().catch(() => ({}))
    const mediaId = typeof body?.mediaId === 'string' ? body.mediaId : ''
    const deleted = await deleteFeedPostMedia(mediaId)

    return NextResponse.json({
      ok: true,
      mediaId: deleted.id,
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo eliminar la imagen temporal del post.')
  }
}
