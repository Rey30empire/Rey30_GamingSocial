import { NextResponse } from 'next/server'
import { getMarketplaceSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewMarketplaceSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewMarketplaceSnapshot())
    }

    const snapshot = await getMarketplaceSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el marketplace.', 500)
  }
}
