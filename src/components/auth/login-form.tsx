'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Loader2, Lock, Sparkles } from 'lucide-react'

interface LoginFormProps {
  demoCredentials?: {
    identifier: string
    password: string
  } | null
}

export function LoginForm({ demoCredentials = null }: LoginFormProps) {
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/'
  const [identifier, setIdentifier] = useState(demoCredentials?.identifier ?? '')
  const [password, setPassword] = useState(demoCredentials?.password ?? '')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setIsSubmitting(true)
    setError(null)

    const result = await signIn('credentials', {
      identifier,
      password,
      redirect: false,
      callbackUrl,
    })

    if (result?.error) {
      setError('Credenciales incorrectas. Revisa email/usuario y password.')
      setIsSubmitting(false)
      return
    }

    window.location.href = result?.url ?? callbackUrl
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.18),transparent_28%),radial-gradient(circle_at_top_right,rgba(34,211,238,0.15),transparent_24%),linear-gradient(180deg,#070511,#0b0916)]" />

      <Card className="w-full max-w-md rounded-[2rem] border-white/[0.08] bg-[#0e0a17]/90 p-6 shadow-[0_30px_120px_rgba(6,4,18,0.65)] backdrop-blur-xl">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-[1.2rem] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20">
            <img src="/logo.svg" alt="REY30VERSE" className="h-10 w-10" />
          </div>
          <div>
            <p className="text-sm uppercase tracking-[0.34em] text-violet-300/70">Access Core</p>
            <h1 className="mt-1 text-2xl font-semibold text-white">Entrar a REY30VERSE</h1>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Badge className="border-0 bg-violet-500/15 text-violet-100">
            <Sparkles className="mr-1 h-3 w-3" />
            Chat + Juego + Stream
          </Badge>
          <Badge className="border-0 bg-cyan-500/15 text-cyan-100">
            <Crown className="mr-1 h-3 w-3" />
            Demo premium activa
          </Badge>
        </div>

        <form className="mt-6 space-y-4" onSubmit={submit}>
          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Email o usuario</label>
            <Input
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              className="h-12 rounded-full border-violet-400/10 bg-black/25 text-white"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm text-zinc-300">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="h-12 rounded-full border-violet-400/10 bg-black/25 text-white"
            />
          </div>

          {demoCredentials ? (
            <div className="rounded-[1.2rem] border border-violet-400/10 bg-white/[0.04] p-4 text-sm text-zinc-300">
              <div className="flex items-center gap-2 text-violet-100">
                <Lock className="h-4 w-4" />
                Credenciales demo
              </div>
              <p className="mt-2">Email: {demoCredentials.identifier}</p>
              <p>Password: {demoCredentials.password}</p>
            </div>
          ) : null}

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <Button
            type="submit"
            disabled={isSubmitting}
            className="h-12 w-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:opacity-90"
          >
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Lock className="mr-2 h-4 w-4" />}
            Entrar al hub
          </Button>
        </form>
      </Card>
    </div>
  )
}
