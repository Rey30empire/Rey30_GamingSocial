import { NextResponse } from 'next/server'
import sharp from 'sharp'
import { getCardCustomizationSnapshot } from '@/lib/app-data'
import { createApiErrorResponse } from '@/lib/api-errors'
import { getPreviewCustomizationSnapshot } from '@/lib/preview-data'
import { isPreviewModeEnabled } from '@/lib/runtime-config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function escapeXml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

function buildCreatorCardSvg(snapshot: Awaited<ReturnType<typeof getCardCustomizationSnapshot>>) {
  const creator = snapshot.creatorCard
  const accentStyle = snapshot.styles.find((style) => style.name === creator.equippedStyleName) ?? snapshot.styles[0]
  const [gradientFrom = 'from-violet-500', gradientTo = 'to-fuchsia-500'] = accentStyle?.colors.split(' ') ?? []
  const colorMap: Record<string, string> = {
    'from-violet-500': '#8b5cf6',
    'to-fuchsia-500': '#d946ef',
    'from-cyan-500': '#06b6d4',
    'to-emerald-400': '#34d399',
    'from-zinc-700': '#3f3f46',
    'to-zinc-950': '#09090b',
    'to-cyan-500': '#06b6d4',
    'from-purple-500': '#a855f7',
    'to-purple-500': '#a855f7',
  }
  const primary = colorMap[gradientFrom] ?? '#8b5cf6'
  const secondary = colorMap[gradientTo] ?? '#d946ef'

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="675">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${primary}" />
        <stop offset="100%" stop-color="${secondary}" />
      </linearGradient>
      <linearGradient id="panel" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#0f172a" stop-opacity="0.94" />
        <stop offset="100%" stop-color="#09090b" stop-opacity="0.9" />
      </linearGradient>
    </defs>
    <rect width="1200" height="675" rx="42" fill="#050816" />
    <rect x="20" y="20" width="1160" height="635" rx="34" fill="url(#bg)" />
    <circle cx="1040" cy="118" r="112" fill="rgba(255,255,255,0.14)" />
    <circle cx="146" cy="566" r="140" fill="rgba(255,255,255,0.10)" />
    <rect x="64" y="64" width="1072" height="547" rx="30" fill="url(#panel)" />
    <rect x="94" y="96" width="170" height="170" rx="28" fill="rgba(255,255,255,0.1)" />
    <text x="179" y="198" text-anchor="middle" fill="#ffffff" font-size="68" font-family="Arial, sans-serif" font-weight="700">${escapeXml(creator.initials)}</text>
    <text x="308" y="138" fill="#94a3b8" font-size="20" font-family="Arial, sans-serif" letter-spacing="5">CREATOR CARD</text>
    <text x="308" y="188" fill="#ffffff" font-size="56" font-family="Arial, sans-serif" font-weight="700">${escapeXml(creator.displayName)}</text>
    <text x="308" y="226" fill="#c4b5fd" font-size="24" font-family="Arial, sans-serif">${escapeXml(creator.username)}</text>
    <text x="308" y="266" fill="#e4e4e7" font-size="24" font-family="Arial, sans-serif">${escapeXml(creator.roleLine)}</text>

    <rect x="94" y="316" width="214" height="112" rx="24" fill="rgba(255,255,255,0.06)" />
    <text x="122" y="352" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">FOLLOWERS</text>
    <text x="122" y="399" fill="#ffffff" font-size="38" font-family="Arial, sans-serif" font-weight="700">${escapeXml(creator.followers)}</text>

    <rect x="328" y="316" width="214" height="112" rx="24" fill="rgba(255,255,255,0.06)" />
    <text x="356" y="352" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">TEMPLATES</text>
    <text x="356" y="399" fill="#ffffff" font-size="38" font-family="Arial, sans-serif" font-weight="700">${creator.templatesCount}</text>

    <rect x="562" y="316" width="214" height="112" rx="24" fill="rgba(255,255,255,0.06)" />
    <text x="590" y="352" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">ARTWORKS</text>
    <text x="590" y="399" fill="#ffffff" font-size="38" font-family="Arial, sans-serif" font-weight="700">${creator.artworksCount}</text>

    <rect x="796" y="316" width="244" height="112" rx="24" fill="rgba(255,255,255,0.06)" />
    <text x="824" y="352" fill="#94a3b8" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">DECK ACTIVO</text>
    <text x="824" y="399" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">${escapeXml(creator.equippedStyleName)}</text>

    <rect x="94" y="458" width="946" height="122" rx="28" fill="rgba(139,92,246,0.18)" stroke="rgba(196,181,253,0.35)" />
    <text x="126" y="494" fill="#ddd6fe" font-size="18" font-family="Arial, sans-serif" letter-spacing="2">FOCO ACTUAL</text>
    <text x="126" y="536" fill="#ffffff" font-size="32" font-family="Arial, sans-serif" font-weight="700">${escapeXml(creator.activeTemplateName)}</text>
    <text x="126" y="566" fill="#e9d5ff" font-size="22" font-family="Arial, sans-serif">${escapeXml(creator.focusLabel)}</text>
    <text x="126" y="594" fill="#d4d4d8" font-size="18" font-family="Arial, sans-serif">${escapeXml(creator.activityLabel)}</text>

    <text x="1040" y="124" text-anchor="end" fill="#e0f2fe" font-size="20" font-family="Arial, sans-serif" letter-spacing="3">REY30VERSE</text>
    <text x="1040" y="156" text-anchor="end" fill="#ffffff" font-size="30" font-family="Arial, sans-serif" font-weight="700">${escapeXml(creator.level)}</text>
  </svg>`
}

export async function GET() {
  try {
    const snapshot = isPreviewModeEnabled() ? getPreviewCustomizationSnapshot() : await getCardCustomizationSnapshot()
    const svg = buildCreatorCardSvg(snapshot)
    const png = await sharp(Buffer.from(svg)).png().toBuffer()
    const safeUsername = snapshot.creatorCard.username.replace(/^@/, '') || 'creator-card'

    return new NextResponse(new Uint8Array(png), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Content-Disposition': `attachment; filename="${safeUsername}-creator-card.png"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    return createApiErrorResponse(error, 'No se pudo exportar la Creator Card.', 500)
  }
}
