import { spawnSync } from 'node:child_process'

function runPrismaCommand(args) {
  const result = spawnSync(process.execPath, ['scripts/prisma-command.mjs', ...args], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

function runSeedCommand() {
  const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/seed-db.ts'], {
    stdio: 'inherit',
    env: process.env,
  })

  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}

runPrismaCommand(['generate'])
runPrismaCommand(['migrate', 'deploy'])
runSeedCommand()
