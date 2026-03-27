import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ensureSeedData } from '@/lib/app-data'
import { LoginForm } from '@/components/auth/login-form'
import { isDatabaseConfigured } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function LoginPage() {
  if (!isDatabaseConfigured()) {
    return <LoginForm />
  }

  await ensureSeedData()

  const session = await auth()

  if (session?.user?.id) {
    redirect('/')
  }

  return <LoginForm />
}
