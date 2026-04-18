import type { NextAuthOptions, Session } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db, isDatabaseConfigured } from '@/lib/db'
import { verifyPassword } from '@/lib/passwords'
import { getAuthSecret, isDevelopmentAuthBypassEnabled } from '@/lib/runtime-config'

const AUTH_SECRET = getAuthSecret()
const DEVELOPMENT_BYPASS_HANDLE = 'alexrey30'

export class AuthRequiredError extends Error {
  constructor(message = 'AUTH_REQUIRED') {
    super(message)
    this.name = 'AuthRequiredError'
  }
}

export const authOptions: NextAuthOptions = {
  secret: AUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
  },
  providers: [
    CredentialsProvider({
      name: 'Credenciales',
      credentials: {
        identifier: {
          label: 'Email o usuario',
          type: 'text',
        },
        password: {
          label: 'Password',
          type: 'password',
        },
      },
      async authorize(credentials) {
        const identifier = credentials?.identifier?.trim().toLowerCase()
        const password = credentials?.password ?? ''

        if (!identifier || !password) {
          return null
        }

        const { ensureSeedData } = await import('@/lib/app-data')
        await ensureSeedData()

        const user = await db.user.findFirst({
          where: {
            OR: [{ email: identifier }, { handle: identifier }],
          },
        })

        if (!user?.passwordHash) {
          return null
        }

        const isValid = verifyPassword(password, user.passwordHash)

        if (!isValid) {
          return null
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          handle: user.handle,
          avatarSeed: user.avatarSeed,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.handle = user.handle
        token.avatarSeed = user.avatarSeed
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = typeof token.id === 'string' ? token.id : ''
        session.user.handle = typeof token.handle === 'string' ? token.handle : ''
        session.user.avatarSeed = typeof token.avatarSeed === 'string' ? token.avatarSeed : ''
      }

      return session
    },
  },
}

async function getDevelopmentBypassSession(): Promise<Session | null> {
  if (!isDevelopmentAuthBypassEnabled() || !isDatabaseConfigured()) {
    return null
  }

  const { ensureSeedData } = await import('@/lib/app-data')
  await ensureSeedData()

  const user = await db.user.findUnique({
    where: {
      handle: DEVELOPMENT_BYPASS_HANDLE,
    },
  })

  if (!user) {
    throw new Error('No se encontro el usuario demo para el bypass de desarrollo.')
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      image: null,
      handle: user.handle,
      avatarSeed: user.avatarSeed,
    },
    expires: new Date(Date.now() + 1000 * 60 * 60 * 12).toISOString(),
  }
}

async function validateSession(session: Session | null): Promise<Session | null> {
  if (!session?.user?.id || !isDatabaseConfigured()) {
    return session
  }

  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    select: {
      id: true,
    },
  })

  if (!user) {
    return null
  }

  return session
}

export async function auth() {
  if (isDevelopmentAuthBypassEnabled()) {
    return getDevelopmentBypassSession()
  }

  const session = await getServerSession(authOptions)
  return validateSession(session)
}

export async function requireAuthSession() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new AuthRequiredError()
  }

  return session
}

export function isAuthRequiredError(error: unknown) {
  return error instanceof AuthRequiredError || (error instanceof Error && error.message === 'AUTH_REQUIRED')
}
