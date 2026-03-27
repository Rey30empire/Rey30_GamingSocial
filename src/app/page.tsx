import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ensureSeedData } from '@/lib/app-data'
import HomePageShell from '@/components/rey30/home-page-shell'
import { isDatabaseConfigured } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function Page() {
  if (!isDatabaseConfigured()) {
    redirect('/login')
  }

  await ensureSeedData()

  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return <HomePageShell />
}
