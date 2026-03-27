import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: DefaultSession['user'] & {
      id: string
      handle: string
      avatarSeed: string
    }
  }

  interface User {
    handle: string
    avatarSeed: string
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id?: string
    handle?: string
    avatarSeed?: string
  }
}
