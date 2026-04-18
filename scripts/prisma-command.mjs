import { spawnSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const prismaCliPath = resolve(scriptDirectory, '../node_modules/prisma/build/index.js')
process.loadEnvFile?.(resolve(scriptDirectory, '../.env'))
const configuredDatabaseSchema = process.env.REY30_DATABASE_SCHEMA?.trim() || 'rey30verse'

function normalizeDatabaseUrl(url) {
  if (!url || url.startsWith('file:')) {
    return url
  }

  if (!url.startsWith('postgres://') && !url.startsWith('postgresql://')) {
    return url
  }

  const parsedUrl = new URL(url)

  if (!parsedUrl.searchParams.has('schema')) {
    parsedUrl.searchParams.set('schema', configuredDatabaseSchema)
  }

  return parsedUrl.toString()
}

const databaseUrl = normalizeDatabaseUrl(
  process.env.DATABASE_URL?.trim() || process.env.NETLIFY_DATABASE_URL?.trim()
)
const directUrl =
  normalizeDatabaseUrl(
    process.env.DIRECT_URL?.trim() ||
      process.env.NETLIFY_DATABASE_DIRECT_URL?.trim() ||
      process.env.NETLIFY_DATABASE_URL_UNPOOLED?.trim() ||
      databaseUrl
  )

if (!databaseUrl) {
  console.error('[db] Falta DATABASE_URL o NETLIFY_DATABASE_URL.')
  process.exit(1)
}

const result = spawnSync(process.execPath, [prismaCliPath, ...process.argv.slice(2)], {
  stdio: 'inherit',
  env: {
    ...process.env,
    DATABASE_URL: databaseUrl,
    DIRECT_URL: directUrl,
  },
})

if (result.status !== 0) {
  process.exit(result.status ?? 1)
}
