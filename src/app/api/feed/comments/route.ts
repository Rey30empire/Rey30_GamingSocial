import { NextRequest, NextResponse } from 'next/server'
import { createFeedComment } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('El feed preview no acepta comentarios persistidos.')
    }

    const body = await request.json().catch(() => ({}))
    const postId = typeof body?.postId === 'string' ? body.postId : ''
    const content = typeof body?.content === 'string' ? body.content : ''
    const parentCommentId = typeof body?.parentCommentId === 'string' ? body.parentCommentId : null
    const post = await createFeedComment(postId, content, parentCommentId)

    publishRealtimeEvent({
      type: 'feed-updated',
      note: `Nuevo comentario en ${post.author.name}`,
    })

    return NextResponse.json({ ok: true, post })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo comentar la publicacion.')
  }
}
