import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getStorageHealthSnapshot } from '@/lib/storage'
import { getDatabaseMode, getRtcModeSnapshot, isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  const storage = await getStorageHealthSnapshot()
  const database = getDatabaseMode()
  const rtc = getRtcModeSnapshot()

  if (isPreviewModeEnabled()) {
    return NextResponse.json({
      ok: true,
      status: 'preview',
      timestamp: new Date().toISOString(),
      database: {
        ...database,
        reachable: false,
        detail: 'Modo preview activo. La app se abre con datos de muestra para revisar UI y modulos.',
      },
      rtc: {
        ...rtc,
        enabled: false,
        mode: 'disabled',
        detail: 'Modo preview activo. La configuración WebRTC real está deshabilitada.',
      },
      storage,
    })
  }

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
        rtc,
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
        rtc,
        storage,
      },
      { status: 503 }
    )
  }
}
