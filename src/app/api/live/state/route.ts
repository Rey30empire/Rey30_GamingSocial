import { NextRequest, NextResponse } from 'next/server'
import { getLiveSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewLiveSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const streamId = request.nextUrl.searchParams.get('streamId') ?? undefined

    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewLiveSnapshot(streamId))
    }

    const snapshot = await getLiveSnapshot(streamId)
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el modulo en vivo.', 500)
  }
}
