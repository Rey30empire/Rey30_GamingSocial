import { NextRequest, NextResponse } from 'next/server'
import { getLiveSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const streamId = request.nextUrl.searchParams.get('streamId') ?? undefined
    const snapshot = await getLiveSnapshot(streamId)
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el modulo en vivo.', 500)
  }
}
