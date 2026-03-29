const truthyValues = new Set(['1', 'true', 'yes', 'on'])

function readEnv(name: string) {
  return process.env[name]?.trim() ?? ''
}

function getConfiguredDatabaseSchema() {
  return readEnv('REY30_DATABASE_SCHEMA') || 'rey30verse'
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
