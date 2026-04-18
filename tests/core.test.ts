import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import test from 'node:test'
import { GameMatchStatus, LiveCallParticipantRole, LiveCallSignalType } from '@prisma/client'

if (existsSync('.env')) {
  process.loadEnvFile('.env')
}
process.env.NODE_ENV = 'test'
process.env.REY30_PREVIEW_MODE = 'false'
process.env.REY30_ENABLE_RUNTIME_SEED = 'true'

async function loadModule<T = unknown>(path: string): Promise<T> {
  const loaded = await import(path)
  return (loaded.default ?? loaded) as T
}

async function bootstrapDatabase() {
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')
  await appData.ensureSeedData({ force: true, reset: true })
}

test('auth credentials provider valida el usuario demo real', async () => {
  process.env.REY30_DISABLE_AUTH = 'false'
  await bootstrapDatabase()

  const authModule = await loadModule<typeof import('@/lib/auth')>('../src/lib/auth.ts')
  const provider = authModule.authOptions.providers?.[0] as {
    options: {
      authorize: (credentials: Record<string, string>) => Promise<{
        email: string
        handle: string
        name: string
      } | null>
    }
  }

  const user = await provider.options.authorize({
    identifier: 'alex@rey30verse.gg',
    password: 'rey30demo',
  })

  assert.ok(user)
  assert.equal(user.email, 'alex@rey30verse.gg')
  assert.equal(user.handle, 'alexrey30')
  assert.equal(user.name, 'AlexRey30')
})

test('seed mantiene IDs demo estables entre resets completos', async () => {
  process.env.REY30_DISABLE_AUTH = 'false'
  await bootstrapDatabase()

  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')
  const firstUser = await dbModule.db.user.findUnique({
    where: {
      handle: 'alexrey30',
    },
    select: {
      id: true,
    },
  })

  await bootstrapDatabase()

  const secondUser = await dbModule.db.user.findUnique({
    where: {
      handle: 'alexrey30',
    },
    select: {
      id: true,
    },
  })

  assert.equal(firstUser?.id, 'seed-user-alex')
  assert.equal(secondUser?.id, 'seed-user-alex')
})

test('bootstrap devuelve snapshot real con chat y lobby persistidos', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const routeModule = await loadModule<typeof import('@/app/api/bootstrap/route')>('../src/app/api/bootstrap/route.ts')
  const shellRouteModule = await loadModule<typeof import('@/app/api/shell/state/route')>('../src/app/api/shell/state/route.ts')
  const response = await routeModule.GET()
  const shellResponse = await shellRouteModule.GET()
  const payload = await response.json()
  const shellPayload = await shellResponse.json()

  assert.equal(response.status, 200)
  assert.equal(shellResponse.status, 200)
  assert.equal(payload.currentUser.displayName, 'AlexRey30')
  assert.equal(shellPayload.currentUser.displayName, 'AlexRey30')
  assert.ok(shellPayload.dashboard.activeRooms.length > 0)
  assert.ok(payload.chat.rooms.length > 0)
  assert.ok(payload.chat.messages.length > 0)
  assert.ok(payload.lobby.rooms.length > 0)
})

test('feed permite listar, publicar, comentar y reaccionar', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const feedRoute = await loadModule<typeof import('@/app/api/feed/route')>('../src/app/api/feed/route.ts')
  const commentsRoute = await loadModule<typeof import('@/app/api/feed/comments/route')>('../src/app/api/feed/comments/route.ts')
  const commentReactionsRoute = await loadModule<typeof import('@/app/api/feed/comments/reactions/route')>(
    '../src/app/api/feed/comments/reactions/route.ts'
  )
  const reactionsRoute = await loadModule<typeof import('@/app/api/feed/reactions/route')>('../src/app/api/feed/reactions/route.ts')
  const uploadRoute = await loadModule<typeof import('@/app/api/feed/upload/route')>('../src/app/api/feed/upload/route.ts')
  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')

  const initialResponse = await feedRoute.GET()
  const initialPayload = await initialResponse.json()
  const initialCount = initialPayload.posts.length

  const svgFile = new File(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360">
        <rect width="640" height="360" fill="#18112a" />
        <circle cx="160" cy="180" r="80" fill="#8b5cf6" />
        <circle cx="470" cy="180" r="60" fill="#22d3ee" />
      </svg>`,
    ],
    'feed-test.svg',
    { type: 'image/svg+xml' }
  )
  const uploadFormData = new FormData()
  uploadFormData.set('file', svgFile)
  const uploadResponse = await uploadRoute.POST(
    new Request('http://localhost/api/feed/upload', {
      method: 'POST',
      body: uploadFormData,
    })
  )
  const uploadPayload = await uploadResponse.json()

  assert.equal(uploadResponse.status, 200)
  assert.ok(uploadPayload.media?.id)
  assert.ok(uploadPayload.media?.url)

  const tempDeleteFile = new File(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180">
        <rect width="320" height="180" fill="#0f172a" />
        <rect x="40" y="40" width="240" height="100" rx="22" fill="#ec4899" />
      </svg>`,
    ],
    'feed-temp-delete.svg',
    { type: 'image/svg+xml' }
  )
  const deleteFormData = new FormData()
  deleteFormData.set('file', tempDeleteFile)
  const tempUploadResponse = await uploadRoute.POST(
    new Request('http://localhost/api/feed/upload', {
      method: 'POST',
      body: deleteFormData,
    })
  )
  const tempUploadPayload = await tempUploadResponse.json()

  assert.equal(tempUploadResponse.status, 200)
  assert.ok(tempUploadPayload.media?.id)

  const deleteUploadResponse = await uploadRoute.DELETE(
    new Request('http://localhost/api/feed/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mediaId: tempUploadPayload.media.id,
      }),
    }) as Request
  )
  const deleteUploadPayload = await deleteUploadResponse.json()
  const deletedMedia = await dbModule.db.feedPostMedia.findUnique({
    where: {
      id: tempUploadPayload.media.id,
    },
  })

  assert.equal(deleteUploadResponse.status, 200)
  assert.equal(deleteUploadPayload.mediaId, tempUploadPayload.media.id)
  assert.equal(deletedMedia, null)

  const createResponse = await feedRoute.POST(
    new Request('http://localhost/api/feed', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        content: 'Post de prueba para validar el feed real.',
        mediaAssetIds: [uploadPayload.media.id],
      }),
    })
  )
  const createPayload = await createResponse.json()
  const postId = createPayload.post.id as string

  assert.equal(createResponse.status, 200)
  assert.equal(createPayload.post.content, 'Post de prueba para validar el feed real.')
  assert.equal(createPayload.post.media.length, 1)

  const commentResponse = await commentsRoute.POST(
    new Request('http://localhost/api/feed/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId,
        content: 'Comentario de integración.',
      }),
    })
  )
  const commentPayload = await commentResponse.json()

  assert.equal(commentResponse.status, 200)
  assert.equal(commentPayload.post.commentsCount, 1)

  const replyResponse = await commentsRoute.POST(
    new Request('http://localhost/api/feed/comments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId,
        parentCommentId: commentPayload.post.comments[0].id,
        content: 'Respuesta en thread.',
      }),
    })
  )
  const replyPayload = await replyResponse.json()

  assert.equal(replyResponse.status, 200)
  assert.equal(replyPayload.post.commentsCount, 2)
  assert.equal(replyPayload.post.comments[0].replies.length, 1)
  assert.equal(replyPayload.post.comments[0].replies[0].content, 'Respuesta en thread.')

  const commentReactionResponse = await commentReactionsRoute.POST(
    new Request('http://localhost/api/feed/comments/reactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        commentId: commentPayload.post.comments[0].id,
      }),
    })
  )
  const commentReactionPayload = await commentReactionResponse.json()

  assert.equal(commentReactionResponse.status, 200)
  assert.equal(commentReactionPayload.post.comments[0].likes, 1)
  assert.equal(commentReactionPayload.post.comments[0].isLikedByMe, true)

  const reactionResponse = await reactionsRoute.POST(
    new Request('http://localhost/api/feed/reactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        postId,
      }),
    })
  )
  const reactionPayload = await reactionResponse.json()

  assert.equal(reactionResponse.status, 200)
  assert.equal(reactionPayload.post.isLikedByMe, true)
  assert.ok(reactionPayload.post.likes >= 1)

  const finalResponse = await feedRoute.GET()
  const finalPayload = await finalResponse.json()

  assert.equal(finalResponse.status, 200)
  assert.equal(finalPayload.posts.length, initialCount + 1)
  assert.equal(finalPayload.posts[0].media.length, 1)
  assert.equal(finalPayload.posts[0].comments[0].likes, 1)
})

test('chat y lobby persisten nuevas salas y mensajes', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const chatRoute = await loadModule<typeof import('@/app/api/chat/messages/route')>('../src/app/api/chat/messages/route.ts')
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')
  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')

  const beforeSnapshot = await appData.getAppSnapshot()
  const lobbyCountBefore = beforeSnapshot.lobby.rooms.length

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sala test integración',
        mode: 'normal',
        isPublic: true,
        botCount: 1,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()

  assert.equal(createRoomResponse.status, 200)
  assert.equal(createRoomPayload.room.name, 'Sala test integración')

  const chatMessageResponse = await chatRoute.POST(
    new Request('http://localhost/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId: createRoomPayload.room.id,
        content: 'Mensaje real desde test.',
      }),
    })
  )
  const chatMessagePayload = await chatMessageResponse.json()

  assert.equal(chatMessageResponse.status, 200)
  assert.equal(chatMessagePayload.ok, true)

  const afterSnapshot = await appData.getAppSnapshot()
  const lobbySnapshotResponse = await roomsRoute.GET()
  const lobbySnapshotPayload = await lobbySnapshotResponse.json()
  const chatSnapshotResponse = await chatRoute.GET()
  const chatSnapshotPayload = await chatSnapshotResponse.json()
  const createdRoom = afterSnapshot.lobby.rooms.find((room) => room.id === createRoomPayload.room.id)
  const storedMessage = await dbModule.db.message.findFirst({
    where: {
      roomId: createRoomPayload.room.id,
      content: 'Mensaje real desde test.',
    },
  })

  assert.equal(afterSnapshot.lobby.rooms.length, lobbyCountBefore + 1)
  assert.equal(lobbySnapshotResponse.status, 200)
  assert.equal(chatSnapshotResponse.status, 200)
  assert.ok(createdRoom)
  assert.ok(storedMessage)
  assert.equal(createdRoom?.mode, 'normal')
  assert.equal(createdRoom?.voiceEnabled, true)
  assert.ok((createdRoom?.description.length ?? 0) > 0)
  assert.ok((createdRoom?.activityLabel.length ?? 0) > 0)
  assert.ok(createdRoom?.seats.some((seat) => seat.name === 'AlexRey30'))
  assert.ok(lobbySnapshotPayload.rooms.some((room: { id: string }) => room.id === createRoomPayload.room.id))
  assert.ok(chatSnapshotPayload.rooms.length > 0)
  assert.ok(chatSnapshotPayload.messages.length > 0)
})

test('salas privadas exigen codigo y permiten join real por invitacion', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const joinRoomRoute = await loadModule<typeof import('@/app/api/rooms/join/route')>('../src/app/api/rooms/join/route.ts')
  const inviteRoute = await loadModule<typeof import('@/app/api/rooms/invite/route')>('../src/app/api/rooms/invite/route.ts')
  const gameCore = await loadModule<typeof import('@/lib/game-core')>('../src/lib/game-core.ts')
  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sala privada integración',
        mode: 'normal',
        isPublic: false,
        botCount: 0,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()
  const roomId = createRoomPayload.room.id as string
  const inviteCode = createRoomPayload.room.inviteCode as string

  assert.equal(createRoomResponse.status, 200)
  assert.ok(inviteCode)
  assert.equal(inviteCode.length, 6)

  const lobbyBeforeReset = await appData.getLobbySnapshot()
  const privateRoomBeforeReset = lobbyBeforeReset.rooms.find((room) => room.id === roomId)

  assert.equal(privateRoomBeforeReset?.isHost, true)
  assert.equal(privateRoomBeforeReset?.inviteCode, inviteCode)

  const regenerateInviteResponse = await inviteRoute.PATCH(
    new Request('http://localhost/api/rooms/invite', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
      }),
    })
  )
  const regenerateInvitePayload = await regenerateInviteResponse.json()
  const regeneratedCode = regenerateInvitePayload.room.inviteCode as string

  assert.equal(regenerateInviteResponse.status, 200)
  assert.ok(regeneratedCode)
  assert.notEqual(regeneratedCode, inviteCode)

  await dbModule.db.$transaction([
    dbModule.db.roomMembership.deleteMany({
      where: {
        roomId,
      },
    }),
    dbModule.db.room.update({
      where: {
        id: roomId,
      },
      data: {
        currentPlayers: 0,
        onlineCount: 0,
      },
    }),
  ])

  await assert.rejects(
    () => gameCore.getGameSnapshot(roomId),
    /codigo privado/i
  )

  const oldCodeJoinResponse = await joinRoomRoute.POST(
    new Request('http://localhost/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inviteCode,
      }),
    })
  )
  const oldCodeJoinPayload = await oldCodeJoinResponse.json()

  assert.equal(oldCodeJoinResponse.status, 400)
  assert.match(oldCodeJoinPayload.error, /ninguna sala privada/i)

  const joinRoomResponse = await joinRoomRoute.POST(
    new Request('http://localhost/api/rooms/join', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inviteCode: regeneratedCode,
      }),
    })
  )
  const joinRoomPayload = await joinRoomResponse.json()

  assert.equal(joinRoomResponse.status, 200)
  assert.equal(joinRoomPayload.room.id, roomId)
  assert.equal(joinRoomPayload.room.inviteCode, regeneratedCode)
  assert.equal(joinRoomPayload.alreadyMember, false)

  const restoredSnapshot = await gameCore.getGameSnapshot(roomId)
  const lobbySnapshot = await appData.getLobbySnapshot()
  const restoredRoom = lobbySnapshot.rooms.find((room) => room.id === roomId)

  assert.equal(restoredSnapshot.roomId, roomId)
  assert.ok(restoredRoom)
  assert.equal(restoredRoom?.inviteCode, regeneratedCode)
  assert.equal(restoredRoom?.isMember, true)
  assert.equal(restoredRoom?.isHost, true)
  assert.equal(restoredRoom?.requiresInvite, false)
})

test('lobby permite marcar listo y lanzar una sala cuando la mesa cumple condiciones', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const readyRoute = await loadModule<typeof import('@/app/api/rooms/ready/route')>('../src/app/api/rooms/ready/route.ts')
  const launchRoute = await loadModule<typeof import('@/app/api/rooms/launch/route')>('../src/app/api/rooms/launch/route.ts')
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sala ready integración',
        mode: 'normal',
        isPublic: false,
        botCount: 1,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()
  const roomId = createRoomPayload.room.id as string

  assert.equal(createRoomResponse.status, 200)

  const readyResponse = await readyRoute.POST(
    new Request('http://localhost/api/rooms/ready', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        ready: true,
      }),
    })
  )
  const readyPayload = await readyResponse.json()
  const lobbyReadySnapshot = await appData.getLobbySnapshot()
  const readyRoom = lobbyReadySnapshot.rooms.find((room) => room.id === roomId)

  assert.equal(readyResponse.status, 200)
  assert.equal(readyPayload.ready, true)
  assert.ok(readyRoom)
  assert.equal(readyRoom?.isReadyByMe, true)
  assert.equal(readyRoom?.readyCount, 1)
  assert.equal(readyRoom?.canLaunch, true)

  const launchResponse = await launchRoute.POST(
    new Request('http://localhost/api/rooms/launch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
      }),
    })
  )
  const launchPayload = await launchResponse.json()
  const launchedSnapshot = await appData.getLobbySnapshot()
  const launchedRoom = launchedSnapshot.rooms.find((room) => room.id === roomId)

  assert.equal(launchResponse.status, 200)
  assert.equal(launchPayload.room.id, roomId)
  assert.equal(launchPayload.room.status, 'starting')
  assert.equal(launchedRoom?.status, 'starting')
})

test('lobby expone chat interno a miembros y bloquea escribir fuera de la sala', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const chatRoute = await loadModule<typeof import('@/app/api/chat/messages/route')>('../src/app/api/chat/messages/route.ts')
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')
  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Sala chat previo',
        mode: 'normal',
        isPublic: false,
        botCount: 1,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()
  const roomId = createRoomPayload.room.id as string

  assert.equal(createRoomResponse.status, 200)

  const beforeChatSnapshot = await appData.getLobbySnapshot()
  const memberRoom = beforeChatSnapshot.rooms.find((room) => room.id === roomId)

  assert.ok(memberRoom)
  assert.equal(memberRoom?.canViewInternals, true)
  assert.ok((memberRoom?.recentMessages.length ?? 0) >= 1)

  const chatResponse = await chatRoute.POST(
    new Request('http://localhost/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        content: 'Mensaje real dentro del lobby privado.',
      }),
    })
  )
  const chatPayload = await chatResponse.json()

  assert.equal(chatResponse.status, 200)
  assert.equal(chatPayload.ok, true)

  const afterChatSnapshot = await appData.getLobbySnapshot()
  const updatedRoom = afterChatSnapshot.rooms.find((room) => room.id === roomId)

  assert.ok(updatedRoom)
  assert.ok(updatedRoom?.recentMessages.some((message) => message.content === 'Mensaje real dentro del lobby privado.'))

  await dbModule.db.roomMembership.deleteMany({
    where: {
      roomId,
    },
  })
  await dbModule.db.room.update({
    where: {
      id: roomId,
    },
    data: {
      currentPlayers: 0,
      onlineCount: 0,
    },
  })

  const blockedChatResponse = await chatRoute.POST(
    new Request('http://localhost/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        content: 'Intento sin membresia.',
      }),
    })
  )
  const blockedChatPayload = await blockedChatResponse.json()
  const lockedSnapshot = await appData.getLobbySnapshot()
  const lockedRoom = lockedSnapshot.rooms.find((room) => room.id === roomId)

  assert.equal(blockedChatResponse.status, 400)
  assert.match(blockedChatPayload.error, /dentro de la sala/i)
  assert.ok(lockedRoom)
  assert.equal(lockedRoom?.requiresInvite, true)
  assert.equal(lockedRoom?.canViewInternals, false)
  assert.equal(lockedRoom?.seats.length, 0)
  assert.equal(lockedRoom?.recentMessages.length, 0)
})

test('juego principal persiste zoom y escala de cartas con labels correctos', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const gameCore = await loadModule<typeof import('@/lib/game-core')>('../src/lib/game-core.ts')
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Mesa control integración',
        mode: 'ranked',
        isPublic: true,
        botCount: 3,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()
  const roomId = createRoomPayload.room.id as string

  assert.equal(createRoomResponse.status, 200)

  const initialSnapshot = await gameCore.getGameSnapshot(roomId)
  const lobbySnapshot = await appData.getLobbySnapshot()
  const createdRoom = lobbySnapshot.rooms.find((room) => room.id === roomId)

  await gameCore.updateGameControl({
    roomId,
    action: 'set-table-zoom',
    value: 88,
  })
  await gameCore.updateGameControl({
    roomId,
    action: 'set-card-scale',
    value: 78,
  })

  const updatedSnapshot = await gameCore.getGameSnapshot(roomId)

  assert.equal(initialSnapshot.controls.tableZoom, 72)
  assert.equal(initialSnapshot.controls.cardScale, 64)
  assert.equal(updatedSnapshot.controls.tableZoom, 88)
  assert.equal(updatedSnapshot.controls.cardScale, 78)
  assert.ok(updatedSnapshot.seats.every((seat) => seat.isMe || seat.statusLabel !== 'Tu turno'))
  assert.equal(createdRoom?.mode, 'ranked')
  assert.equal(createdRoom?.pointsRequired, 120)
  assert.equal(createdRoom?.voiceEnabled, true)
})

test('juego principal expone jugadas legales y chat de mesa persistido', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const chatRoute = await loadModule<typeof import('@/app/api/chat/messages/route')>('../src/app/api/chat/messages/route.ts')
  const gameCore = await loadModule<typeof import('@/lib/game-core')>('../src/lib/game-core.ts')

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Mesa completa integración',
        mode: 'normal',
        isPublic: true,
        botCount: 3,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()
  const roomId = createRoomPayload.room.id as string

  assert.equal(createRoomResponse.status, 200)

  const initialSnapshot = await gameCore.getGameSnapshot(roomId)

  assert.ok(initialSnapshot.ruleHint.length > 0)
  assert.ok(initialSnapshot.tableMessages.length >= 1)
  assert.ok(initialSnapshot.playableCardIds.length >= 1)
  assert.ok(initialSnapshot.playableCardIds.every((cardId) => initialSnapshot.hand.some((card) => card.id === cardId)))

  const chatResponse = await chatRoute.POST(
    new Request('http://localhost/api/chat/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        content: 'Mensaje real desde la mesa principal.',
      }),
    })
  )
  const chatPayload = await chatResponse.json()

  assert.equal(chatResponse.status, 200)
  assert.equal(chatPayload.ok, true)

  const updatedSnapshot = await gameCore.getGameSnapshot(roomId)

  assert.ok(updatedSnapshot.tableMessages.some((message) => message.content === 'Mensaje real desde la mesa principal.'))
})

test('custom-table consume protect-points al resolver una carta de agua ganadora', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const roomsRoute = await loadModule<typeof import('@/app/api/rooms/route')>('../src/app/api/rooms/route.ts')
  const gameStateRoute = await loadModule<typeof import('@/app/api/game/state/route')>('../src/app/api/game/state/route.ts')
  const gamePlayRoute = await loadModule<typeof import('@/app/api/game/play/route')>('../src/app/api/game/play/route.ts')
  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')
  const engine = await loadModule<typeof import('@/lib/game-engine')>('../src/lib/game-engine/index.ts')

  const createRoomResponse = await roomsRoute.POST(
    new Request('http://localhost/api/rooms', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Mesa agua protect test',
        mode: 'normal',
        isPublic: true,
        tableMode: 'custom-table',
        targetPlayers: 6,
        botCount: 5,
      }),
    })
  )
  const createRoomPayload = await createRoomResponse.json()
  const roomId = createRoomPayload.room.id as string

  assert.equal(createRoomResponse.status, 200)

  await gameStateRoute.GET(new Request(`http://localhost/api/game/state?roomId=${roomId}`) as Parameters<typeof gameStateRoute.GET>[0])

  const match = await dbModule.db.gameMatch.findUnique({
    where: {
      roomId,
    },
  })

  assert.ok(match)

  const waterCard = engine.deckModules.find((module) => module.id === 'element-water')?.cards.find((card) => card.value === 13)
  const lowCards = engine.classic52Module.cards.filter((card) => (card.value ?? 0) >= 2 && (card.value ?? 0) <= 6).slice(0, 5)

  assert.ok(waterCard)
  assert.equal(lowCards.length, 5)

  const state = JSON.parse(match.statePayload) as {
    seats: Array<{
      seatIndex: number
      playerId: string
      displayName: string
      cards: unknown[]
      protectedPoints: number
    }>
    tableCards: unknown[]
  }
  const challengerSeats = state.seats.filter((seat) => seat.seatIndex !== 0)

  state.seats = state.seats.map((seat) => ({
    ...seat,
    cards: seat.seatIndex === 0 ? [waterCard] : [],
    protectedPoints: 0,
  }))
  state.tableCards = challengerSeats.map((seat, index) => ({
    seatIndex: seat.seatIndex,
    playerId: seat.playerId,
    displayName: seat.displayName,
    card: lowCards[index],
  }))

  await dbModule.db.gameMatch.update({
    where: {
      id: match.id,
    },
    data: {
      status: GameMatchStatus.ACTIVE,
      turnSeat: 0,
      trickNumber: 1,
      statePayload: JSON.stringify(state),
      lastActionSummary: 'Test preparado con agua ganadora.',
    },
  })

  const playResponse = await gamePlayRoute.POST(
    new Request('http://localhost/api/game/play', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        roomId,
        cardId: waterCard.id,
      }),
    })
  )
  const playPayload = await playResponse.json()

  assert.equal(playResponse.status, 200)
  assert.equal(playPayload.ok, true)

  const afterStateResponse = await gameStateRoute.GET(
    new Request(`http://localhost/api/game/state?roomId=${roomId}`) as Parameters<typeof gameStateRoute.GET>[0]
  )
  const afterStatePayload = await afterStateResponse.json()

  assert.equal(afterStateResponse.status, 200)
  assert.equal(afterStatePayload.tableMode, 'custom-table')
  assert.equal(afterStatePayload.seats.find((seat: { seat: number }) => seat.seat === 0)?.protectedPoints, 0)
  assert.ok(
    afterStatePayload.effectHistory.some(
      (entry: { type: string; effectId: string; summary: string }) =>
        entry.type === 'protect-points' &&
        entry.effectId === 'protected-points-consumed' &&
        /absorbe 3 de presion/.test(entry.summary)
    )
  )
  assert.ok(
    afterStatePayload.recentEvents.some(
      (entry: { type: string; summary: string }) =>
        entry.type === 'CUSTOM_EFFECT_RESOLVED' && /Proteccion consumida/.test(entry.summary)
    )
  )
})

test('live permite enviar chat y gifts con snapshot sincronizado', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const liveChatRoute = await loadModule<typeof import('@/app/api/live/chat/route')>('../src/app/api/live/chat/route.ts')
  const liveGiftsRoute = await loadModule<typeof import('@/app/api/live/gifts/route')>('../src/app/api/live/gifts/route.ts')
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')

  const beforeSnapshot = await appData.getLiveSnapshot()
  const activeStreamId = beforeSnapshot.activeStreamId
  const ownedGift = beforeSnapshot.giftOptions.find((gift) => gift.ownedQuantity > 0 && gift.canSend)

  assert.ok(activeStreamId)
  assert.ok(ownedGift)
  assert.ok(beforeSnapshot.wallet.coins.length > 0)

  const chatResponse = await liveChatRoute.POST(
    new Request('http://localhost/api/live/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: activeStreamId,
        content: 'Mensaje en vivo desde test.',
      }),
    })
  )
  const chatPayload = await chatResponse.json()

  assert.equal(chatResponse.status, 200)
  assert.equal(chatPayload.ok, true)

  const giftResponse = await liveGiftsRoute.POST(
    new Request('http://localhost/api/live/gifts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId: activeStreamId,
        itemId: ownedGift.id,
        quantity: 1,
      }),
    })
  )
  const giftPayload = await giftResponse.json()

  assert.equal(giftResponse.status, 200)
  assert.equal(giftPayload.ok, true)

  const afterSnapshot = await appData.getLiveSnapshot(activeStreamId)
  const updatedGift = afterSnapshot.giftOptions.find((gift) => gift.id === ownedGift.id)

  assert.ok(afterSnapshot.chatMessages.some((message) => message.message === 'Mensaje en vivo desde test.'))
  assert.ok(afterSnapshot.gifts.some((gift) => gift.senderName === 'Tú'))
  assert.ok(updatedGift)
  assert.equal(updatedGift.ownedQuantity, ownedGift.ownedQuantity - 1)
})

test('live call permite join, heartbeat, señales y leave reales', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const liveCallRoute = await loadModule<typeof import('@/app/api/live/call/route')>('../src/app/api/live/call/route.ts')
  const liveCallConfigRoute = await loadModule<typeof import('@/app/api/live/call/config/route')>(
    '../src/app/api/live/call/config/route.ts'
  )
  const liveHeartbeatRoute = await loadModule<typeof import('@/app/api/live/call/heartbeat/route')>(
    '../src/app/api/live/call/heartbeat/route.ts'
  )
  const liveSignalsRoute = await loadModule<typeof import('@/app/api/live/call/signals/route')>(
    '../src/app/api/live/call/signals/route.ts'
  )
  const appData = await loadModule<typeof import('@/lib/app-data')>('../src/lib/app-data.ts')
  const dbModule = await loadModule<typeof import('@/lib/db')>('../src/lib/db.ts')

  const liveSnapshot = await appData.getLiveSnapshot()
  const streamId = liveSnapshot.activeStreamId
  const remoteUser = await dbModule.db.user.findUnique({
    where: {
      handle: 'miagamer',
    },
  })

  assert.ok(streamId)
  assert.ok(remoteUser)

  const originalRtcEnv = {
    RTC_STUN_URLS: process.env.RTC_STUN_URLS,
    RTC_TURN_URLS: process.env.RTC_TURN_URLS,
    RTC_TURN_USERNAME: process.env.RTC_TURN_USERNAME,
    RTC_TURN_PASSWORD: process.env.RTC_TURN_PASSWORD,
  }

  try {
    process.env.RTC_STUN_URLS = 'stun:stun.example.test:3478'
    process.env.RTC_TURN_URLS = 'turn:turn.example.test:3478?transport=udp'
    process.env.RTC_TURN_USERNAME = 'turn-user'
    process.env.RTC_TURN_PASSWORD = 'turn-pass'

    const configResponse = await liveCallConfigRoute.GET()
    const configPayload = await configResponse.json()

    assert.equal(configResponse.status, 200)
    assert.equal(configPayload.mode, 'turn+stun')
    assert.equal(configPayload.hasTurnServer, true)
    assert.equal(configPayload.iceServers.length, 2)
    assert.equal(configPayload.iceServers[1].username, 'turn-user')
  } finally {
    if (originalRtcEnv.RTC_STUN_URLS === undefined) delete process.env.RTC_STUN_URLS
    else process.env.RTC_STUN_URLS = originalRtcEnv.RTC_STUN_URLS
    if (originalRtcEnv.RTC_TURN_URLS === undefined) delete process.env.RTC_TURN_URLS
    else process.env.RTC_TURN_URLS = originalRtcEnv.RTC_TURN_URLS
    if (originalRtcEnv.RTC_TURN_USERNAME === undefined) delete process.env.RTC_TURN_USERNAME
    else process.env.RTC_TURN_USERNAME = originalRtcEnv.RTC_TURN_USERNAME
    if (originalRtcEnv.RTC_TURN_PASSWORD === undefined) delete process.env.RTC_TURN_PASSWORD
    else process.env.RTC_TURN_PASSWORD = originalRtcEnv.RTC_TURN_PASSWORD
  }

  const remoteParticipant = await dbModule.db.liveCallParticipant.create({
    data: {
      liveSessionId: streamId!,
      userId: remoteUser!.id,
      role: LiveCallParticipantRole.GUEST,
      microphoneEnabled: true,
      cameraEnabled: true,
      lastSeenAt: new Date(),
    },
  })

  const initialStateResponse = await liveCallRoute.GET(
    new Request(`http://localhost/api/live/call?streamId=${streamId}`) as never
  )
  const initialStatePayload = await initialStateResponse.json()

  assert.equal(initialStateResponse.status, 200)
  assert.equal(initialStatePayload.myParticipantId, null)
  assert.equal(initialStatePayload.participants.length, 1)

  const joinResponse = await liveCallRoute.POST(
    new Request('http://localhost/api/live/call', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        microphoneEnabled: true,
        cameraEnabled: true,
      }),
    })
  )
  const joinPayload = await joinResponse.json()
  const myParticipantId = joinPayload.state.myParticipantId as string

  assert.equal(joinResponse.status, 200)
  assert.ok(myParticipantId)
  assert.equal(joinPayload.state.participants.length, 2)

  const heartbeatResponse = await liveHeartbeatRoute.POST(
    new Request('http://localhost/api/live/call/heartbeat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        participantId: myParticipantId,
        microphoneEnabled: false,
        cameraEnabled: false,
      }),
    })
  )
  const heartbeatPayload = await heartbeatResponse.json()

  assert.equal(heartbeatResponse.status, 200)
  assert.equal(heartbeatPayload.state.participants.find((participant: { isMe?: boolean }) => participant.isMe)?.microphoneEnabled, false)
  assert.equal(heartbeatPayload.state.participants.find((participant: { isMe?: boolean }) => participant.isMe)?.cameraEnabled, false)

  const sendSignalResponse = await liveSignalsRoute.POST(
    new Request('http://localhost/api/live/call/signals', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        participantId: myParticipantId,
        toParticipantId: remoteParticipant.id,
        type: 'offer',
        signal: {
          type: 'offer',
          sdp: 'v=0',
        },
      }),
    })
  )
  const sendSignalPayload = await sendSignalResponse.json()

  assert.equal(sendSignalResponse.status, 200)
  assert.equal(sendSignalPayload.signal.type, 'offer')

  await dbModule.db.liveCallSignal.create({
    data: {
      liveSessionId: streamId!,
      fromParticipantId: remoteParticipant.id,
      toParticipantId: myParticipantId,
      type: LiveCallSignalType.ANSWER,
      payload: {
        type: 'answer',
        sdp: 'v=0-answer',
      },
    },
  })

  const pullSignalsResponse = await liveSignalsRoute.GET(
    new Request(
      `http://localhost/api/live/call/signals?streamId=${streamId}&participantId=${myParticipantId}`
    ) as never
  )
  const pullSignalsPayload = await pullSignalsResponse.json()

  assert.equal(pullSignalsResponse.status, 200)
  assert.equal(pullSignalsPayload.signals.length, 1)
  assert.equal(pullSignalsPayload.signals[0].type, 'answer')

  const secondPullResponse = await liveSignalsRoute.GET(
    new Request(
      `http://localhost/api/live/call/signals?streamId=${streamId}&participantId=${myParticipantId}`
    ) as never
  )
  const secondPullPayload = await secondPullResponse.json()

  assert.equal(secondPullResponse.status, 200)
  assert.equal(secondPullPayload.signals.length, 0)

  const leaveResponse = await liveCallRoute.DELETE(
    new Request('http://localhost/api/live/call', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        streamId,
        participantId: myParticipantId,
      }),
    })
  )
  const leavePayload = await leaveResponse.json()
  const remainingParticipant = await dbModule.db.liveCallParticipant.findUnique({
    where: {
      liveSessionId_userId: {
        liveSessionId: streamId!,
        userId: joinPayload.state.participants.find((participant: { isMe?: boolean; userId: string }) => participant.isMe)!.userId,
      },
    },
  })

  assert.equal(leaveResponse.status, 200)
  assert.equal(leavePayload.ok, true)
  assert.equal(remainingParticipant, null)
})

test('marketplace y Card Lab compran, equipan y guardan templates reales', async () => {
  process.env.REY30_DISABLE_AUTH = 'true'
  await bootstrapDatabase()

  const marketStateRoute = await loadModule<typeof import('@/app/api/market/state/route')>('../src/app/api/market/state/route.ts')
  const marketPurchaseRoute = await loadModule<typeof import('@/app/api/market/purchase/route')>('../src/app/api/market/purchase/route.ts')
  const marketEquipRoute = await loadModule<typeof import('@/app/api/market/equip/route')>('../src/app/api/market/equip/route.ts')
  const customizeTemplateRoute = await loadModule<typeof import('@/app/api/customize/template/route')>('../src/app/api/customize/template/route.ts')
  const customizeVisualOverrideRoute = await loadModule<typeof import('@/app/api/customize/visual-override/route')>(
    '../src/app/api/customize/visual-override/route.ts'
  )
  const customizeDeckRoute = await loadModule<typeof import('@/app/api/customize/deck/route')>('../src/app/api/customize/deck/route.ts')
  const customizeStateRoute = await loadModule<typeof import('@/app/api/customize/state/route')>('../src/app/api/customize/state/route.ts')
  const customizeUploadRoute = await loadModule<typeof import('@/app/api/customize/upload/route')>('../src/app/api/customize/upload/route.ts')
  const creatorCardRoute = await loadModule<typeof import('@/app/api/customize/creator-card/route')>(
    '../src/app/api/customize/creator-card/route.ts'
  )

  const marketStateResponse = await marketStateRoute.GET()
  const marketStatePayload = await marketStateResponse.json()
  const purchasableDeck = marketStatePayload.items.find(
    (item: { type: string; ownedQuantity?: number; currency: string }) =>
      item.type === 'deck' && (item.ownedQuantity ?? 0) === 0 && item.currency === 'coins'
  )

  assert.equal(marketStateResponse.status, 200)
  assert.ok(purchasableDeck)

  const purchaseResponse = await marketPurchaseRoute.POST(
    new Request('http://localhost/api/market/purchase', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId: purchasableDeck.id,
      }),
    })
  )
  const purchasePayload = await purchaseResponse.json()

  assert.equal(purchaseResponse.status, 200)
  assert.ok(
    purchasePayload.snapshot.inventory.some((item: { id: string; quantity: number }) => item.id === purchasableDeck.id && item.quantity > 0)
  )

  const equipResponse = await marketEquipRoute.POST(
    new Request('http://localhost/api/market/equip', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        itemId: purchasableDeck.id,
      }),
    })
  )
  const equipPayload = await equipResponse.json()

  assert.equal(equipResponse.status, 200)
  assert.ok(
    equipPayload.snapshot.inventory.some((item: { id: string; equipped?: boolean }) => item.id === purchasableDeck.id && item.equipped)
  )

  const customizeStateResponse = await customizeStateRoute.GET(
    new Request('http://localhost/api/customize/state') as Parameters<typeof customizeStateRoute.GET>[0]
  )
  const customizeStatePayload = await customizeStateResponse.json()

  assert.equal(customizeStateResponse.status, 200)
  assert.ok(
    customizeStatePayload.inventoryDecks.some((item: { id: string }) => item.id === purchasableDeck.id)
  )
  assert.equal(customizeStatePayload.creatorCard.displayName, 'AlexRey30')
  assert.equal(customizeStatePayload.activeDeckKey, 'default')
  assert.ok(
    customizeStatePayload.deckOptions.some(
      (option: { key: string; name: string; isDefault?: boolean; isEquipped?: boolean }) =>
        option.key === 'default' && option.name === 'Mazo principal' && option.isDefault && option.isEquipped
    )
  )

  const createDeckResponse = await customizeDeckRoute.POST(
    new Request('http://localhost/api/customize/deck', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'Mazo agua custom',
      }),
    }) as Parameters<typeof customizeDeckRoute.POST>[0]
  )
  const createDeckPayload = await createDeckResponse.json()

  assert.equal(createDeckResponse.status, 200)
  assert.equal(createDeckPayload.deck.name, 'Mazo agua custom')
  assert.match(createDeckPayload.deck.deckKey, /^deck-mazo-agua-custom/)
  assert.equal(createDeckPayload.snapshot.activeDeckKey, createDeckPayload.deck.deckKey)
  assert.ok(
    createDeckPayload.snapshot.deckOptions.some(
      (option: { key: string; name: string; isDefault?: boolean; isEquipped?: boolean }) =>
        option.key === createDeckPayload.deck.deckKey && option.name === 'Mazo agua custom' && !option.isDefault && option.isEquipped
    )
  )

  const activeDeckKey = createDeckPayload.snapshot.activeDeckKey as string
  const renameDeckResponse = await customizeDeckRoute.PATCH(
    new Request('http://localhost/api/customize/deck', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'rename',
        deckKey: activeDeckKey,
        name: 'Mazo ranked agua',
      }),
    }) as Parameters<typeof customizeDeckRoute.PATCH>[0]
  )
  const renameDeckPayload = await renameDeckResponse.json()

  assert.equal(renameDeckResponse.status, 200)
  assert.equal(renameDeckPayload.deck.deckKey, activeDeckKey)
  assert.equal(renameDeckPayload.deck.name, 'Mazo ranked agua')
  assert.ok(
    renameDeckPayload.snapshot.deckOptions.some(
      (option: { key: string; name: string; isEquipped?: boolean }) =>
        option.key === activeDeckKey && option.name === 'Mazo ranked agua' && option.isEquipped
    )
  )

  const artworkFile = new File(
    [
      `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640">
        <rect width="640" height="640" fill="#120f24" />
        <circle cx="320" cy="220" r="120" fill="#8b5cf6" />
        <rect x="160" y="360" width="320" height="120" rx="30" fill="#22d3ee" />
      </svg>`,
    ],
    'card-lab-test.svg',
    { type: 'image/svg+xml' }
  )
  const artworkFormData = new FormData()
  artworkFormData.set('file', artworkFile)
  const uploadArtworkResponse = await customizeUploadRoute.POST(
    new Request('http://localhost/api/customize/upload', {
      method: 'POST',
      body: artworkFormData,
    })
  )
  const uploadArtworkPayload = await uploadArtworkResponse.json()

  assert.equal(uploadArtworkResponse.status, 200)
  assert.ok(uploadArtworkPayload.artwork?.id)

  const saveTemplateResponse = await customizeTemplateRoute.POST(
    new Request('http://localhost/api/customize/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: null,
        deckKey: activeDeckKey,
        name: 'Template test integración',
        styleId: purchasableDeck.image,
        artworkId: uploadArtworkPayload.artwork.id,
        scope: 'card',
        targetCard: 'Q-spades',
        targetSuit: null,
        zoom: 110,
        rotation: -5,
        offsetX: 4,
        offsetY: -2,
        equip: true,
      }),
    })
  )
  const saveTemplatePayload = await saveTemplateResponse.json()
  const savedTemplateId = saveTemplatePayload.template.id as string

  assert.equal(saveTemplateResponse.status, 200)
  assert.equal(saveTemplatePayload.template.name, 'Template test integración')
  assert.ok(
    saveTemplatePayload.snapshot.templates.some(
      (template: { name: string; isEquipped: boolean; styleId: string | null }) =>
        template.name === 'Template test integración' && template.isEquipped && template.styleId === purchasableDeck.image
    )
  )
  assert.equal(saveTemplatePayload.snapshot.creatorCard.activeTemplateName, 'Template test integración')

  const saveModuleTemplateResponse = await customizeTemplateRoute.POST(
    new Request('http://localhost/api/customize/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: null,
        deckKey: activeDeckKey,
        name: 'Template modulo fuego',
        styleId: purchasableDeck.image,
        artworkId: null,
        scope: 'module',
        targetCard: null,
        targetSuit: null,
        targetModule: 'element-fire',
        targetElement: null,
        zoom: 100,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        equip: true,
      }),
    })
  )
  const saveModuleTemplatePayload = await saveModuleTemplateResponse.json()

  assert.equal(saveModuleTemplateResponse.status, 200)
  assert.equal(saveModuleTemplatePayload.template.scope, 'MODULE')
  assert.equal(saveModuleTemplatePayload.template.targetModule, 'element-fire')
  assert.equal(saveModuleTemplatePayload.template.targetElement, null)
  assert.ok(
    saveModuleTemplatePayload.snapshot.visualOverrides.some(
      (override: { scope: string; targetModule: string | null; sourceTemplateId: string | null }) =>
        override.scope === 'module' &&
        override.targetModule === 'element-fire' &&
        override.sourceTemplateId === saveModuleTemplatePayload.template.id
    )
  )
  assert.ok(
    saveModuleTemplatePayload.snapshot.templates.some(
      (template: { name: string; scope: string; targetModule: string | null }) =>
        template.name === 'Template modulo fuego' &&
        template.scope === 'module' &&
        template.targetModule === 'element-fire'
    )
  )
  assert.equal(
    saveModuleTemplatePayload.snapshot.deckModules
      .find(
        (module: { id: string; previewCards: Array<{ resolvedVisual?: { sourceScope?: string; styleId?: string } }> }) =>
          module.id === 'element-fire'
      )
      ?.previewCards[0]?.resolvedVisual?.sourceScope,
    'module'
  )
  assert.equal(
    saveModuleTemplatePayload.snapshot.deckModules
      .find(
        (module: { id: string; previewCards: Array<{ resolvedVisual?: { sourceScope?: string; styleId?: string } }> }) =>
          module.id === 'element-fire'
      )
      ?.previewCards[0]?.resolvedVisual?.styleId,
    purchasableDeck.image
  )

  const saveElementTemplateResponse = await customizeTemplateRoute.POST(
    new Request('http://localhost/api/customize/template', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: null,
        deckKey: activeDeckKey,
        name: 'Template elemento agua',
        styleId: purchasableDeck.image,
        artworkId: null,
        scope: 'element',
        targetCard: null,
        targetSuit: null,
        targetModule: null,
        targetElement: 'water',
        zoom: 100,
        rotation: 0,
        offsetX: 0,
        offsetY: 0,
        equip: true,
      }),
    })
  )
  const saveElementTemplatePayload = await saveElementTemplateResponse.json()

  assert.equal(saveElementTemplateResponse.status, 200)
  assert.equal(saveElementTemplatePayload.template.scope, 'ELEMENT')
  assert.equal(saveElementTemplatePayload.template.targetModule, null)
  assert.equal(saveElementTemplatePayload.template.targetElement, 'water')
  assert.ok(
    saveElementTemplatePayload.snapshot.visualOverrides.some(
      (override: { scope: string; targetElement: string | null; sourceTemplateId: string | null }) =>
        override.scope === 'element' &&
        override.targetElement === 'water' &&
        override.sourceTemplateId === saveElementTemplatePayload.template.id
    )
  )
  assert.ok(
    saveElementTemplatePayload.snapshot.templates.some(
      (template: { name: string; scope: string; targetElement: string | null }) =>
        template.name === 'Template elemento agua' && template.scope === 'element' && template.targetElement === 'water'
    )
  )
  assert.equal(
    saveElementTemplatePayload.snapshot.deckModules
      .find(
        (
          module: {
            id: string
            previewCards: Array<{ resolvedVisual?: { sourceScope?: string; sourceTarget?: string } }>
          }
        ) => module.id === 'element-water'
      )
      ?.previewCards[0]?.resolvedVisual?.sourceScope,
    'element'
  )
  assert.equal(
    saveElementTemplatePayload.snapshot.deckModules
      .find(
        (
          module: {
            id: string
            previewCards: Array<{ resolvedVisual?: { sourceScope?: string; sourceTarget?: string } }>
          }
        ) => module.id === 'element-water'
      )
      ?.previewCards[0]?.resolvedVisual?.sourceTarget,
    'water'
  )

  const duplicateDeckResponse = await customizeDeckRoute.PATCH(
    new Request('http://localhost/api/customize/deck', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'duplicate',
        deckKey: activeDeckKey,
        name: 'Mazo ranked agua copia',
      }),
    }) as Parameters<typeof customizeDeckRoute.PATCH>[0]
  )
  const duplicateDeckPayload = await duplicateDeckResponse.json()
  const duplicatedDeckKey = duplicateDeckPayload.deck.deckKey as string

  assert.equal(duplicateDeckResponse.status, 200)
  assert.notEqual(duplicatedDeckKey, activeDeckKey)
  assert.equal(duplicateDeckPayload.deck.name, 'Mazo ranked agua copia')
  assert.equal(duplicateDeckPayload.copiedOverrideCount, 3)
  assert.equal(duplicateDeckPayload.snapshot.activeDeckKey, duplicatedDeckKey)
  assert.ok(
    duplicateDeckPayload.snapshot.deckComparisons.some(
      (deck: { deckKey: string; overrides: Array<{ scope: string; targetModule: string | null; targetElement: string | null }> }) =>
        deck.deckKey === duplicatedDeckKey &&
        deck.overrides.some((override) => override.scope === 'module' && override.targetModule === 'element-fire') &&
        deck.overrides.some((override) => override.scope === 'element' && override.targetElement === 'water')
    )
  )
  assert.ok(
    duplicateDeckPayload.snapshot.visualOverrides.some(
      (override: { deckKey: string; scope: string; targetModule: string | null; sourceTemplateId: string | null }) =>
        override.deckKey === duplicatedDeckKey &&
        override.scope === 'module' &&
        override.targetModule === 'element-fire' &&
        override.sourceTemplateId === saveModuleTemplatePayload.template.id
    )
  )
  assert.ok(
    duplicateDeckPayload.snapshot.visualOverrides.some(
      (override: { deckKey: string; scope: string; targetElement: string | null; sourceTemplateId: string | null }) =>
        override.deckKey === duplicatedDeckKey &&
        override.scope === 'element' &&
        override.targetElement === 'water' &&
        override.sourceTemplateId === saveElementTemplatePayload.template.id
    )
  )

  const moduleOverride = saveElementTemplatePayload.snapshot.visualOverrides.find(
    (override: { scope: string; targetModule: string | null }) =>
      override.scope === 'module' && override.targetModule === 'element-fire'
  )

  assert.ok(moduleOverride)

  const deactivateModuleOverrideResponse = await customizeVisualOverrideRoute.DELETE(
    new Request('http://localhost/api/customize/visual-override', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        overrideId: moduleOverride.id,
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const deactivateModuleOverridePayload = await deactivateModuleOverrideResponse.json()

  assert.equal(deactivateModuleOverrideResponse.status, 200)
  assert.ok(
    deactivateModuleOverridePayload.snapshot.visualOverrides.every(
      (override: { id: string }) => override.id !== moduleOverride.id
    )
  )

  const reactivateModuleOverrideResponse = await customizeVisualOverrideRoute.POST(
    new Request('http://localhost/api/customize/visual-override', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: saveModuleTemplatePayload.template.id,
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const reactivateModuleOverridePayload = await reactivateModuleOverrideResponse.json()

  assert.equal(reactivateModuleOverrideResponse.status, 200)
  assert.ok(
    reactivateModuleOverridePayload.snapshot.visualOverrides.some(
      (override: { scope: string; targetModule: string | null; sourceTemplateName: string | null }) =>
        override.scope === 'module' &&
        override.targetModule === 'element-fire' &&
        override.sourceTemplateName === 'Template modulo fuego'
    )
  )

  const defaultDeckStateResponse = await customizeStateRoute.GET(
    new Request('http://localhost/api/customize/state?deckKey=default') as Parameters<typeof customizeStateRoute.GET>[0]
  )
  const defaultDeckStatePayload = await defaultDeckStateResponse.json()

  assert.equal(defaultDeckStateResponse.status, 200)
  assert.equal(defaultDeckStatePayload.activeDeckKey, 'default')
  assert.ok(
    defaultDeckStatePayload.visualOverrides.every(
      (override: { scope: string; targetModule: string | null }) =>
        !(override.scope === 'module' && override.targetModule === 'element-fire')
    )
  )

  const selectedDeckStateResponse = await customizeStateRoute.GET(
    new Request(`http://localhost/api/customize/state?deckKey=${encodeURIComponent(activeDeckKey)}`) as Parameters<
      typeof customizeStateRoute.GET
    >[0]
  )
  const selectedDeckStatePayload = await selectedDeckStateResponse.json()

  assert.equal(selectedDeckStateResponse.status, 200)
  assert.equal(selectedDeckStatePayload.activeDeckKey, activeDeckKey)
  assert.ok(
    selectedDeckStatePayload.visualOverrides.some(
      (override: { scope: string; targetModule: string | null }) =>
        override.scope === 'module' && override.targetModule === 'element-fire'
    )
  )

  const duplicateTemplateResponse = await customizeTemplateRoute.PATCH(
    new Request('http://localhost/api/customize/template', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'duplicate',
        templateId: savedTemplateId,
        name: 'Template test integración copia',
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const duplicateTemplatePayload = await duplicateTemplateResponse.json()
  const duplicatedTemplateId = duplicateTemplatePayload.template.id as string

  assert.equal(duplicateTemplateResponse.status, 200)
  assert.ok(
    duplicateTemplatePayload.snapshot.templates.some(
      (template: { id: string; name: string }) => template.id === duplicatedTemplateId && template.name === 'Template test integración copia'
    )
  )

  const renameTemplateResponse = await customizeTemplateRoute.PATCH(
    new Request('http://localhost/api/customize/template', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action: 'rename',
        templateId: duplicatedTemplateId,
        name: 'Template rename integración',
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const renameTemplatePayload = await renameTemplateResponse.json()

  assert.equal(renameTemplateResponse.status, 200)
  assert.equal(renameTemplatePayload.template.name, 'Template rename integración')

  const creatorCardResponse = await creatorCardRoute.GET()

  assert.equal(creatorCardResponse.status, 200)
  assert.equal(creatorCardResponse.headers.get('Content-Type'), 'image/png')
  assert.match(creatorCardResponse.headers.get('Content-Disposition') ?? '', /creator-card\.png/i)
  assert.ok((await creatorCardResponse.arrayBuffer()).byteLength > 0)

  const deleteArtworkResponse = await customizeUploadRoute.DELETE(
    new Request('http://localhost/api/customize/upload', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        artworkId: uploadArtworkPayload.artwork.id,
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const deleteArtworkPayload = await deleteArtworkResponse.json()

  assert.equal(deleteArtworkResponse.status, 200)
  assert.ok(
    deleteArtworkPayload.snapshot.artworks.every((artwork: { id: string }) => artwork.id !== uploadArtworkPayload.artwork.id)
  )
  assert.equal(
    deleteArtworkPayload.snapshot.templates.find((template: { id: string }) => template.id === savedTemplateId)?.artwork,
    null
  )

  const deleteTemplateResponse = await customizeTemplateRoute.DELETE(
    new Request('http://localhost/api/customize/template', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: savedTemplateId,
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const deleteTemplatePayload = await deleteTemplateResponse.json()

  assert.equal(deleteTemplateResponse.status, 200)
  assert.ok(
    deleteTemplatePayload.snapshot.templates.every((template: { id: string }) => template.id !== savedTemplateId)
  )

  const deleteDuplicatedTemplateResponse = await customizeTemplateRoute.DELETE(
    new Request('http://localhost/api/customize/template', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        templateId: duplicatedTemplateId,
        deckKey: activeDeckKey,
      }),
    }) as Request
  )
  const deleteDuplicatedTemplatePayload = await deleteDuplicatedTemplateResponse.json()

  assert.equal(deleteDuplicatedTemplateResponse.status, 200)
  assert.ok(
    deleteDuplicatedTemplatePayload.snapshot.templates.every((template: { id: string }) => template.id !== duplicatedTemplateId)
  )
})
