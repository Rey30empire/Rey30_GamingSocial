import { NextResponse } from 'next/server'
import { getShellSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewAppSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    if (isPreviewModeEnabled()) {
      const preview = getPreviewAppSnapshot()

      return NextResponse.json({
        currentUser: preview.currentUser,
        presence: preview.presence,
        dashboard: preview.dashboard,
        profile: preview.profile,
      })
    }

    const snapshot = await getShellSnapshot()
    return NextResponse.json(snapshot)
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo cargar el shell principal.', 500)
  }
}
