import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    stdio: 'pipe',
    encoding: 'utf8',
    ...options,
  })
}

const managedContainers = [
  {
    name: 'rey30-postgres',
    label: 'PostgreSQL',
    service: 'postgres',
  },
  {
    name: 'rey30-coturn',
    label: 'coturn',
    service: 'coturn',
  },
]

for (const container of managedContainers) {
  const inspect = run('docker', ['ps', '-a', '--filter', `name=^/${container.name}$`, '--format', '{{.Names}}\t{{.Status}}'])

  if (inspect.status !== 0) {
    console.error(inspect.stderr || '[services] No se pudo consultar Docker.')
    process.exit(inspect.status ?? 1)
  }

  const containerInfo = inspect.stdout.trim()
  container.info = containerInfo
}

const allRunning = managedContainers.every((container) => container.info.startsWith(container.name) && /\bUp\b/i.test(container.info))

if (allRunning) {
  console.log('[services] PostgreSQL y coturn ya están activos.')
  process.exit(0)
}

const existingStoppedContainers = managedContainers.filter(
  (container) => container.info.startsWith(container.name) && !/\bUp\b/i.test(container.info)
)

if (existingStoppedContainers.length) {
  const start = spawnSync(
    'docker',
    ['start', ...existingStoppedContainers.map((container) => container.name)],
    {
      stdio: 'inherit',
    }
  )

  if (start.status !== 0) {
    process.exit(start.status ?? 1)
  }
}

const missingContainers = managedContainers.filter((container) => !container.info.startsWith(container.name))

for (const container of missingContainers) {
  const up = spawnSync('docker', ['compose', '-f', 'docker-compose.dev.yml', 'up', '-d', container.service], {
    stdio: 'inherit',
  })

  if (up.status !== 0) {
    process.exit(up.status ?? 1)
  }
}

console.log('[services] PostgreSQL y coturn listos para desarrollo local.')
