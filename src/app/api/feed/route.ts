import { NextRequest, NextResponse } from 'next/server'
import { createFeedPost, getFeedSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewFeedSnapshot } from '@/lib/preview-data'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewFeedSnapshot())
    }

    const snapshot = await getFeedSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el feed.')
  }
}

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('El feed preview no acepta publicaciones persistidas.')
    }

    const body = await request.json().catch(() => ({}))
    const content = typeof body?.content === 'string' ? body.content : ''
    const mediaAssetIds = Array.isArray(body?.mediaAssetIds)
      ? body.mediaAssetIds.filter((mediaAssetId): mediaAssetId is string => typeof mediaAssetId === 'string')
      : []
    const post = await createFeedPost({
      content,
      mediaAssetIds,
    })

    publishRealtimeEvent({
      type: 'feed-updated',
      note: post.content.slice(0, 80),
    })

    return NextResponse.json({ ok: true, post })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo publicar en el feed.')
  }
}
