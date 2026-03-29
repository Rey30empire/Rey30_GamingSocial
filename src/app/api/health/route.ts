import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStorageHealthSnapshot } from '@/lib/storage'
import { getDatabaseMode } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

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
