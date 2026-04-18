import { NextRequest, NextResponse } from 'next/server'
import { createApiErrorResponse } from '@/lib/api-errors'
import { toggleFeedCommentReaction } from '@/lib/app-data'
import { publishRealtimeEvent } from '@/lib/realtime'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    if (isPreviewModeEnabled()) {
      throw new Error('El feed preview no acepta reacciones persistidas en comentarios.')
    }

    const body = await request.json().catch(() => ({}))
    const commentId = typeof body?.commentId === 'string' ? body.commentId : ''
    const post = await toggleFeedCommentReaction(commentId)

    publishRealtimeEvent({
      type: 'feed-updated',
      note: `Comentario reaccionado en ${post.author.name}`,
    })

    return NextResponse.json({ ok: true, post })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar la reaccion del comentario.')
  }
}
