import type { NextAuthOptions } from 'next-auth'
import { getServerSession } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { db } from '@/lib/db'
import { verifyPassword } from '@/lib/passwords'

const AUTH_SECRET = process.env.NEXTAUTH_SECRET ?? 'rey30verse-dev-secret'

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

export function auth() {
  return getServerSession(authOptions)
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
