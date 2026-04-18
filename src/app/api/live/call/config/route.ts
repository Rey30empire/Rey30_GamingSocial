import { NextResponse } from 'next/server'
import { requireAuthSession } from '@/lib/auth'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewLiveCallConfig } from '@/lib/preview-data'
import { getRtcIceServers, getRtcModeSnapshot, isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      return NextResponse.json(getPreviewLiveCallConfig())
    }

    await requireAuthSession()
    const rtc = getRtcModeSnapshot()

    return NextResponse.json({
      rtcEnabled: rtc.enabled,
      mode: rtc.mode,
      hasTurnServer: rtc.hasTurnServer,
      note: rtc.detail,
      iceServers: getRtcIceServers(),
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar la configuración WebRTC.')
  }
}
