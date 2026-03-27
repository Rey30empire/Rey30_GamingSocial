import { NextResponse } from 'next/server'
import { isAuthRequiredError } from '@/lib/auth'

export function createApiErrorResponse(error: unknown, fallbackMessage: string, defaultStatus = 400) {
  if (isAuthRequiredError(error)) {
    return NextResponse.json({ error: 'Sesion requerida.' }, { status: 401 })
  }

  const message = error instanceof Error ? error.message : fallbackMessage
  return NextResponse.json({ error: message }, { status: defaultStatus })
}
