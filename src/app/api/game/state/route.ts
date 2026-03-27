import { NextRequest, NextResponse } from 'next/server'
import { getGameSnapshot } from '@/lib/game-core'
import { createApiErrorResponse } from '@/lib/api-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const roomId = request.nextUrl.searchParams.get('roomId') ?? undefined
    const snapshot = await getGameSnapshot(roomId)
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar la mesa.')
  }
}
