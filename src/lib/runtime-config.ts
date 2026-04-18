const truthyValues = new Set(['1', 'true', 'yes', 'on'])
const falsyValues = new Set(['0', 'false', 'no', 'off'])
const DEFAULT_STUN_URLS = ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302']

function readEnv(name: string) {
  return process.env[name]?.trim() ?? ''
}

function readBooleanEnv(name: string) {
  const value = readEnv(name)

  if (!value) {
    return undefined
  }

  const normalizedValue = value.toLowerCase()

  if (truthyValues.has(normalizedValue)) {
    return true
  }

  if (falsyValues.has(normalizedValue)) {
    return false
  }

  return undefined
}

function getConfiguredDatabaseSchema() {
  return readEnv('REY30_DATABASE_SCHEMA') || 'rey30verse'
}

function readCsvEnv(name: string) {
  return readEnv(name)
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
}

function normalizeDatabaseUrl(url: string) {
  if (!url || url.startsWith('file:')) {
    return url
  }

  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    return url
  }

  const parsedUrl = new URL(url)

  if (!parsedUrl.searchParams.has('schema')) {
    parsedUrl.searchParams.set('schema', getConfiguredDatabaseSchema())
  }

  return parsedUrl.toString()
}

export function isProductionEnvironment() {
  return process.env.NODE_ENV === 'production'
}

export function isDevelopmentAuthBypassEnabled() {
  if (isProductionEnvironment()) {
    return false
  }

  return readBooleanEnv('REY30_DISABLE_AUTH') ?? true
}

export function isPreviewModeEnabled() {
  if (isProductionEnvironment()) {
    return false
  }

  return readBooleanEnv('REY30_PREVIEW_MODE') ?? false
}

export function getDatabaseUrl() {
  return normalizeDatabaseUrl(readEnv('DATABASE_URL') || readEnv('NETLIFY_DATABASE_URL'))
}

export function getDirectDatabaseUrl() {
  return normalizeDatabaseUrl(
    readEnv('DIRECT_URL') ||
      readEnv('NETLIFY_DATABASE_DIRECT_URL') ||
      readEnv('NETLIFY_DATABASE_URL_UNPOOLED') ||
      getDatabaseUrl()
  )
}

export function isDatabaseConfigured() {
  return Boolean(getDatabaseUrl())
}

export function isRuntimeSeedEnabled() {
  const configuredValue = readEnv('REY30_ENABLE_RUNTIME_SEED')

  if (!configuredValue) {
    return !isProductionEnvironment()
  }

  return truthyValues.has(configuredValue.toLowerCase())
}

export function getAuthSecret() {
  const secret = readEnv('NEXTAUTH_SECRET')

  if (secret) {
    return secret
  }

  if (!isProductionEnvironment()) {
    return 'rey30verse-dev-secret'
  }

  throw new Error('NEXTAUTH_SECRET must be configured in production.')
}

export function getDatabaseMode(databaseUrl = getDatabaseUrl()) {
  if (!databaseUrl) {
    return {
      mode: 'missing',
      detail: 'DATABASE_URL o NETLIFY_DATABASE_URL no estan configuradas.',
    }
  }

  if (databaseUrl.startsWith('file:')) {
    return {
      mode: 'sqlite-legacy',
      detail: 'Se detecto una URL SQLite legacy. Esta app ahora espera PostgreSQL/Neon.',
    }
  }

  if (/neon(\.tech|\.build|\.database)?/i.test(databaseUrl)) {
    return {
      mode: 'postgresql-neon',
      detail: 'Neon PostgreSQL configurado para runtime o migraciones.',
    }
  }

  try {
    const parsedUrl = new URL(databaseUrl)

    if (['127.0.0.1', 'localhost', 'postgres'].includes(parsedUrl.hostname.toLowerCase())) {
      return {
        mode: 'postgresql-local',
        detail: 'PostgreSQL local de desarrollo configurado para runtime y migraciones.',
      }
    }
  } catch {
    // Ignore invalid URLs and keep the generic fallback below.
  }

  if (databaseUrl.startsWith('postgres://') || databaseUrl.startsWith('postgresql://')) {
    return {
      mode: 'postgresql',
      detail: 'PostgreSQL externo configurado por variables de entorno.',
    }
  }

  return {
    mode: 'external',
    detail: 'Base de datos externa configurada por variables de entorno.',
  }
}

export function getDemoLoginCredentials() {
  if (!isRuntimeSeedEnabled()) {
    return null
  }

  return {
    identifier: 'alex@rey30verse.gg',
    password: 'rey30demo',
  }
}

export function getRtcIceServers() {
  const configuredStunUrls = readCsvEnv('RTC_STUN_URLS')
  const configuredTurnUrls = readCsvEnv('RTC_TURN_URLS')
  const turnUsername = readEnv('RTC_TURN_USERNAME')
  const turnPassword = readEnv('RTC_TURN_PASSWORD')
  const stunUrls = configuredStunUrls.length ? configuredStunUrls : DEFAULT_STUN_URLS

  return [
    {
      urls: stunUrls,
    },
    ...(configuredTurnUrls.length && turnUsername && turnPassword
      ? [
          {
            urls: configuredTurnUrls,
            username: turnUsername,
            credential: turnPassword,
          },
        ]
      : []),
  ]
}

export function getRtcModeSnapshot() {
  const configuredStunUrls = readCsvEnv('RTC_STUN_URLS')
  const configuredTurnUrls = readCsvEnv('RTC_TURN_URLS')
  const turnUsername = readEnv('RTC_TURN_USERNAME')
  const turnPassword = readEnv('RTC_TURN_PASSWORD')
  const hasTurnServer = configuredTurnUrls.length > 0 && Boolean(turnUsername && turnPassword)

  if (hasTurnServer) {
    return {
      enabled: true,
      mode: 'turn+stun' as const,
      hasTurnServer: true,
      stunServerCount: (configuredStunUrls.length ? configuredStunUrls : DEFAULT_STUN_URLS).length,
      turnServerCount: configuredTurnUrls.length,
      detail: 'TURN y STUN configurados para videollamadas WebRTC más estables.',
    }
  }

  if (configuredTurnUrls.length > 0) {
    return {
      enabled: true,
      mode: 'stun-only' as const,
      hasTurnServer: false,
      stunServerCount: (configuredStunUrls.length ? configuredStunUrls : DEFAULT_STUN_URLS).length,
      turnServerCount: configuredTurnUrls.length,
      detail: 'RTC_TURN_URLS está definido, pero faltan RTC_TURN_USERNAME o RTC_TURN_PASSWORD.',
    }
  }

  return {
    enabled: true,
    mode: 'stun-only' as const,
    hasTurnServer: false,
    stunServerCount: (configuredStunUrls.length ? configuredStunUrls : DEFAULT_STUN_URLS).length,
    turnServerCount: 0,
    detail: configuredStunUrls.length
      ? 'STUN configurado por variables de entorno. Para redes difíciles conviene añadir TURN.'
      : 'Usando STUN por defecto para desarrollo. Para despliegues reales conviene configurar TURN.',
  }
}
