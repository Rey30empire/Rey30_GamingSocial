import { NextRequest, NextResponse } from 'next/server'
import { createApiErrorResponse } from '@/lib/api-errors'
import { toggleFeedPostReaction } from '@/lib/app-data'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('El feed preview no acepta reacciones persistidas.')
    }

    const body = await request.json().catch(() => ({}))
    const postId = typeof body?.postId === 'string' ? body.postId : ''
    const post = await toggleFeedPostReaction(postId)

    publishRealtimeEvent({
      type: 'feed-updated',
      note: `Likes ${post.likes}`,
    })

    return NextResponse.json({ ok: true, post })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar la reaccion.')
  }
}
