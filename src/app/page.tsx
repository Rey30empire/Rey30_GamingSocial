import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { ensureSeedData } from '@/lib/app-data'
import HomePageShell from '@/components/rey30/home-page-shell'

export default async function Page() {
  await ensureSeedData()

  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return <HomePageShell />
}
