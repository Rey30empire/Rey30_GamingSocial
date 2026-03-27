import { NextResponse } from 'next/server'
import { getCardCustomizationSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const snapshot = await getCardCustomizationSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar Card Lab.', 500)
  }
}
