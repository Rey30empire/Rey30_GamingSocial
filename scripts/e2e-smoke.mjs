import { spawn } from 'node:child_process'
import { setTimeout as wait } from 'node:timers/promises'

const PORT = 3011
const baseUrl = `http://127.0.0.1:${PORT}`
const useShell = process.platform === 'win32'

process.loadEnvFile('.env')

async function runBootstrap() {
  const commands = [
    ['npm', ['run', 'db:up']],
    ['node', ['scripts/prisma-command.mjs', 'migrate', 'deploy']],
    ['npm', ['run', 'db:seed']],
    ['npm', ['run', 'build']],
  ]

  for (const [command, args] of commands) {
    await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'inherit',
        shell: useShell,
      })

      child.on('exit', (code) => {
        if (code === 0) {
          resolve()
          return
        }

        reject(new Error(`${command} ${args.join(' ')} terminó con código ${code ?? -1}`))
      })

      child.on('error', reject)
    })
  }
}

async function ensurePortAvailable() {
  if (process.platform === 'win32') {
    await new Promise((resolve, reject) => {
      const child = spawn(
        'powershell',
        [
          '-NoProfile',
          '-Command',
          `Get-NetTCPConnection -LocalPort ${PORT} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique | ForEach-Object { Stop-Process -Id $_ -Force }`,
        ],
        {
          cwd: process.cwd(),
          env: process.env,
          stdio: 'ignore',
          shell: false,
        }
      )

      child.on('exit', () => resolve())
      child.on('error', reject)
    })

    return
  }

  await new Promise((resolve, reject) => {
    const child = spawn('bash', ['-lc', `lsof -ti tcp:${PORT} | xargs -r kill -9`], {
      cwd: process.cwd(),
      env: process.env,
      stdio: 'ignore',
      shell: false,
    })

    child.on('exit', () => resolve())
    child.on('error', reject)
  })
}

async function stopProcessTree(server) {
  if (!server.pid) {
    return
  }

  if (process.platform === 'win32') {
    await new Promise((resolve) => {
      const child = spawn('taskkill', ['/PID', String(server.pid), '/T', '/F'], {
        cwd: process.cwd(),
        env: process.env,
        stdio: 'ignore',
        shell: false,
      })

      child.on('exit', () => resolve())
      child.on('error', () => resolve())
    })

    return
  }

  server.kill('SIGTERM')
  await wait(1500)

  if (!server.killed) {
    server.kill('SIGKILL')
  }
}

function mergeSetCookies(cookieJar, response) {
  const setCookies = typeof response.headers.getSetCookie === 'function' ? response.headers.getSetCookie() : []

  for (const cookie of setCookies) {
    const [nameValue] = cookie.split(';', 1)
    const separatorIndex = nameValue.indexOf('=')

    if (separatorIndex <= 0) {
      continue
    }

    const name = nameValue.slice(0, separatorIndex)
    const value = nameValue.slice(separatorIndex + 1)
    cookieJar.set(name, value)
  }
}

function serializeCookies(cookieJar) {
  return Array.from(cookieJar.entries())
    .map(([name, value]) => `${name}=${value}`)
    .join('; ')
}

async function authenticateDemoUser() {
  const cookieJar = new Map()

  const csrfResponse = await fetch(`${baseUrl}/api/auth/csrf`, {
    cache: 'no-store',
    redirect: 'manual',
  })

  if (!csrfResponse.ok) {
    throw new Error(`CSRF inválido: ${csrfResponse.status}`)
  }

  mergeSetCookies(cookieJar, csrfResponse)
  const csrfPayload = await csrfResponse.json()

  const loginBody = new URLSearchParams({
    csrfToken: csrfPayload.csrfToken,
    identifier: 'alex@rey30verse.gg',
    password: 'rey30demo',
    callbackUrl: `${baseUrl}/`,
  })

  const loginResponse = await fetch(`${baseUrl}/api/auth/callback/credentials?json=true`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: serializeCookies(cookieJar),
    },
    body: loginBody.toString(),
    redirect: 'manual',
  })

  mergeSetCookies(cookieJar, loginResponse)

  if (![200, 302].includes(loginResponse.status)) {
    throw new Error(`Login inválido: ${loginResponse.status}`)
  }

  if (!cookieJar.has('next-auth.session-token') && !cookieJar.has('__Secure-next-auth.session-token')) {
    throw new Error('No se generó cookie de sesión después del login.')
  }

  return serializeCookies(cookieJar)
}

async function waitForServer(logs) {
  const startedAt = Date.now()

  while (Date.now() - startedAt < 120000) {
    try {
      const response = await fetch(`${baseUrl}/api/health`, { cache: 'no-store' })

      if (response.ok) {
        return
      }
    } catch {
      // Keep polling until the server is ready.
    }

    await wait(1000)
  }

  throw new Error(`El servidor no levantó a tiempo.\n${logs.join('')}`)
}

async function main() {
  await runBootstrap()
  await ensurePortAvailable()

  const logs = []
  const server = spawn('npx', ['next', 'start', '-p', String(PORT)], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      REY30_DISABLE_AUTH: 'false',
      REY30_PREVIEW_MODE: 'false',
      REY30_ENABLE_RUNTIME_SEED: 'true',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: useShell,
  })

  server.stdout.on('data', (chunk) => {
    logs.push(chunk.toString())
  })
  server.stderr.on('data', (chunk) => {
    logs.push(chunk.toString())
  })

  try {
    await waitForServer(logs)
    const sessionCookie = await authenticateDemoUser()

    const authHeaders = {
      Cookie: sessionCookie,
    }

    const [
      healthResponse,
      bootstrapResponse,
      shellResponse,
      chatResponse,
      roomsResponse,
      feedResponse,
      liveResponse,
      liveCallConfigResponse,
      marketResponse,
      customizeResponse,
      homeResponse,
    ] = await Promise.all([
      fetch(`${baseUrl}/api/health`, { cache: 'no-store' }),
      fetch(`${baseUrl}/api/bootstrap`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/shell/state`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/chat/messages`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/rooms`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/feed`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/live/state`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/live/call/config`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/market/state`, { cache: 'no-store', headers: authHeaders }),
      fetch(`${baseUrl}/api/customize/state`, { cache: 'no-store', headers: authHeaders }),
      fetch(baseUrl, { cache: 'no-store', headers: authHeaders, redirect: 'manual' }),
    ])

    const healthPayload = await healthResponse.json()
    const bootstrapPayload = await bootstrapResponse.json()
    const shellPayload = await shellResponse.json()
    const chatPayload = await chatResponse.json()
    const roomsPayload = await roomsResponse.json()
    const feedPayload = await feedResponse.json()
    const livePayload = await liveResponse.json()
    const liveCallConfigPayload = await liveCallConfigResponse.json()
    const marketPayload = await marketResponse.json()
    const customizePayload = await customizeResponse.json()
    const homeHtml = await homeResponse.text()
    const homeContentType = homeResponse.headers.get('content-type') ?? ''

    if (!healthResponse.ok || !healthPayload.database?.reachable) {
      throw new Error(`Health inválido: ${JSON.stringify(healthPayload, null, 2)}`)
    }

    if (!healthPayload.rtc?.mode) {
      throw new Error(`Health RTC inválido: ${JSON.stringify(healthPayload, null, 2)}`)
    }

    if (!bootstrapResponse.ok || !bootstrapPayload.chat?.rooms?.length) {
      throw new Error(`Bootstrap inválido: ${JSON.stringify(bootstrapPayload, null, 2)}`)
    }

    if (!shellResponse.ok || !shellPayload.dashboard?.activeRooms?.length) {
      throw new Error(`Shell inválido: ${JSON.stringify(shellPayload, null, 2)}`)
    }

    if (!chatResponse.ok || !chatPayload.rooms?.length || !chatPayload.messages?.length) {
      throw new Error(`Chat inválido: ${JSON.stringify(chatPayload, null, 2)}`)
    }

    if (!roomsResponse.ok || !roomsPayload.rooms?.length) {
      throw new Error(`Lobby inválido: ${JSON.stringify(roomsPayload, null, 2)}`)
    }

    if (!feedResponse.ok || !feedPayload.posts?.length) {
      throw new Error(`Feed inválido: ${JSON.stringify(feedPayload, null, 2)}`)
    }

    if (!liveResponse.ok || !livePayload.streams?.length || !livePayload.giftOptions?.length) {
      throw new Error(`Live inválido: ${JSON.stringify(livePayload, null, 2)}`)
    }

    if (!liveCallConfigResponse.ok || !liveCallConfigPayload.iceServers?.length) {
      throw new Error(`Live call config inválido: ${JSON.stringify(liveCallConfigPayload, null, 2)}`)
    }

    const liveCallStateResponse = await fetch(`${baseUrl}/api/live/call?streamId=${livePayload.activeStreamId}`, {
      cache: 'no-store',
      headers: authHeaders,
    })
    const liveCallStatePayload = await liveCallStateResponse.json()

    if (!liveCallStateResponse.ok || liveCallStatePayload.rtcEnabled !== true) {
      throw new Error(`Live call state inválido: ${JSON.stringify(liveCallStatePayload, null, 2)}`)
    }

    const liveCallJoinResponse = await fetch(`${baseUrl}/api/live/call`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: livePayload.activeStreamId,
        microphoneEnabled: true,
        cameraEnabled: true,
      }),
    })
    const liveCallJoinPayload = await liveCallJoinResponse.json()

    if (!liveCallJoinResponse.ok || !liveCallJoinPayload.state?.myParticipantId) {
      throw new Error(`Live call join inválido: ${JSON.stringify(liveCallJoinPayload, null, 2)}`)
    }

    const liveCallHeartbeatResponse = await fetch(`${baseUrl}/api/live/call/heartbeat`, {
      method: 'POST',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: livePayload.activeStreamId,
        participantId: liveCallJoinPayload.state.myParticipantId,
        microphoneEnabled: false,
        cameraEnabled: true,
      }),
    })
    const liveCallHeartbeatPayload = await liveCallHeartbeatResponse.json()

    if (!liveCallHeartbeatResponse.ok || !liveCallHeartbeatPayload.state?.participants?.length) {
      throw new Error(`Live call heartbeat inválido: ${JSON.stringify(liveCallHeartbeatPayload, null, 2)}`)
    }

    const liveCallLeaveResponse = await fetch(`${baseUrl}/api/live/call`, {
      method: 'DELETE',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: livePayload.activeStreamId,
        participantId: liveCallJoinPayload.state.myParticipantId,
      }),
    })
    const liveCallLeavePayload = await liveCallLeaveResponse.json()

    if (!liveCallLeaveResponse.ok || liveCallLeavePayload.ok !== true) {
      throw new Error(`Live call leave inválido: ${JSON.stringify(liveCallLeavePayload, null, 2)}`)
    }

    if (!marketResponse.ok || !marketPayload.items?.length || !marketPayload.inventory?.length) {
      throw new Error(`Market inválido: ${JSON.stringify(marketPayload, null, 2)}`)
    }

    if (!customizeResponse.ok || !customizePayload.styles?.length || !customizePayload.templates?.length) {
      throw new Error(`Customize inválido: ${JSON.stringify(customizePayload, null, 2)}`)
    }

    if (
      homeResponse.status !== 200 ||
      !homeContentType.includes('text/html') ||
      homeHtml.length < 500 ||
      !homeHtml.includes('REY30VERSE')
    ) {
      throw new Error(
        `La home no respondió con HTML usable. Status: ${homeResponse.status}. Content-Type: ${homeContentType}. Snippet: ${homeHtml.slice(0, 160)}\nLogs:\n${logs.slice(-40).join('')}`
      )
    }

    console.log('[e2e] Smoke local OK.')
    console.log(
      JSON.stringify(
        {
          health: healthPayload.status,
          currentUser: bootstrapPayload.currentUser.displayName,
          dashboardRooms: shellPayload.dashboard.activeRooms.length,
          chatRooms: chatPayload.rooms.length,
          rooms: bootstrapPayload.lobby.rooms.length,
          posts: feedPayload.posts.length,
          liveStreams: livePayload.streams.length,
          rtcMode: healthPayload.rtc.mode,
          liveCallParticipants: liveCallJoinPayload.state.participants.length,
          marketItems: marketPayload.items.length,
          templates: customizePayload.templates.length,
        },
        null,
        2
      )
    )
  } finally {
    await stopProcessTree(server)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
