import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ensureSeedData } from '@/lib/app-data'
import { LoginForm } from '@/components/auth/login-form'

export default async function LoginPage() {
  await ensureSeedData()

  const session = await auth()

  if (session?.user?.id) {
    redirect('/')
  }

  return <LoginForm />
}
