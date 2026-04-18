import { NextResponse } from 'next/server'
import { getAppSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewAppSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewAppSnapshot())
    }

    const snapshot = await getAppSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el snapshot de la app.', 500)
  }
}
