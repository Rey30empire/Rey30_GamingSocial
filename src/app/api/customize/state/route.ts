import { NextRequest, NextResponse } from 'next/server'
import { getCardCustomizationSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewCustomizationSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewCustomizationSnapshot())
    }

    const requestUrl = new URL(request.url)
    const snapshot = await getCardCustomizationSnapshot({
      deckKey: requestUrl?.searchParams.get('deckKey'),
    })
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar Card Lab.', 500)
  }
}
