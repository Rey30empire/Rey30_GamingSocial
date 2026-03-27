import { NextRequest, NextResponse } from 'next/server'
import { touchCurrentUserPresence } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { publishRealtimeEvent } from '@/lib/realtime'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const state =
      body?.state === 'away' || body?.state === 'offline'
        ? body.state
        : 'online'
    const screen = typeof body?.screen === 'string' ? body.screen : null
    const latencyMs = Number.isFinite(body?.latencyMs) ? Math.max(0, Math.round(Number(body.latencyMs))) : null

    const presence = await touchCurrentUserPresence({
      state,
      screen,
      latencyMs,
    })

    publishRealtimeEvent({
      type: 'presence-updated',
      screen: presence.currentScreen ?? undefined,
      onlineUsers: presence.onlineUsersCount,
      note: presence.label,
    })

    return NextResponse.json({
      ok: true,
      presence,
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo actualizar la presencia.')
  }
}
