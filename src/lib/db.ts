import { PrismaClient } from '@prisma/client'
import { getDatabaseUrl, isDatabaseConfigured as hasDatabaseConfig } from '@/lib/runtime-config'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function isDatabaseConfigured() {
  return hasDatabaseConfig()
}

function createPrismaClient() {
  const databaseUrl = getDatabaseUrl()

  if (!databaseUrl) {
    throw new Error('DATABASE_URL or NETLIFY_DATABASE_URL is not configured.')
  }

  return new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  })
}

function getPrismaClient() {
  if (!globalForPrisma.prisma) {
    globalForPrisma.prisma = createPrismaClient()
  }

  return globalForPrisma.prisma
}

export const db = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const prisma = getPrismaClient()
    const value = Reflect.get(prisma, prop, receiver)

    return typeof value === 'function' ? value.bind(prisma) : value
  },
})

if (process.env.NODE_ENV !== 'production' && isDatabaseConfigured()) {
  globalForPrisma.prisma = getPrismaClient()
}
