import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStorageHealthSnapshot } from '@/lib/storage'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function getDatabaseMode() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || ''

  if (!databaseUrl) {
    return {
      mode: 'missing',
      detail: 'DATABASE_URL no esta configurada.',
    }
  }

  if (databaseUrl.startsWith('file:')) {
    return {
      mode: 'sqlite-local',
      detail: 'SQLite local activo. Ideal para desarrollo o demo privada.',
    }
  }

  return {
    mode: 'external',
    detail: 'Base de datos externa configurada por DATABASE_URL.',
  }
}

export async function GET() {
  const storage = await getStorageHealthSnapshot()
  const database = getDatabaseMode()

  try {
    await db.$queryRawUnsafe('SELECT 1')

    const ok = storage.ok

    return NextResponse.json(
      {
        ok,
        status: ok ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        database: {
          ...database,
          reachable: true,
        },
        storage,
      },
      { status: ok ? 200 : 503 }
    )
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        status: 'degraded',
        timestamp: new Date().toISOString(),
        database: {
          ...database,
          reachable: false,
          detail: error instanceof Error ? error.message : 'No se pudo consultar la base de datos.',
        },
        storage,
      },
      { status: 503 }
    )
  }
}
