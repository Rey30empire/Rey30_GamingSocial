import { ensureSeedData } from '@/lib/app-data'

async function main() {
  await ensureSeedData({ force: true, reset: true })
  console.log('[db] Seed completado.')
}

void main().catch((error) => {
  console.error(error)
  process.exit(1)
})
