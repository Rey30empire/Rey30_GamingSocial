import { NextResponse } from 'next/server'
import { getAppSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'

export async function GET() {
  try {
    const snapshot = await getAppSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el snapshot de la app.', 500)
  }
}
