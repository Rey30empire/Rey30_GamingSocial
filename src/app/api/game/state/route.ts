import { NextRequest, NextResponse } from 'next/server'
import { getGameSnapshotByMode } from '@/lib/game-runtime'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewGameSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const requestUrl = new URL(request.url)
    const roomId = requestUrl.searchParams.get('roomId') ?? undefined

    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewGameSnapshot(roomId))
    }

    const snapshot = await getGameSnapshotByMode(roomId)
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar la mesa.')
  }
}
