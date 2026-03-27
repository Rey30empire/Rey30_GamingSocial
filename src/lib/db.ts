import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL?.trim())
}

function createPrismaClient() {
  if (!isDatabaseConfigured()) {
    throw new Error('DATABASE_URL is not configured.')
  }

  return new PrismaClient()
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
