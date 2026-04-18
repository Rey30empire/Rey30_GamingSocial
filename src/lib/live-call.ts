import { LiveCallParticipantRole, LiveCallSignalType, Prisma } from '@prisma/client'
import { AuthRequiredError, requireAuthSession } from '@/lib/auth'
import { db } from '@/lib/db'
import type { LiveCallSignalSnapshot, LiveCallStateSnapshot, LiveCallParticipantSnapshot } from '@/lib/app-types'

const LIVE_CALL_STALE_MS = 45_000
const LIVE_CALL_SIGNAL_TTL_MS = 10 * 60 * 1000

type LiveCallParticipantRecord = Prisma.LiveCallParticipantGetPayload<{
  include: {
    user: {
      include: {
        profile: true
      }
    }
  }
}>

function mapSignalType(type: LiveCallSignalType): 'offer' | 'answer' | 'ice' {
  return type.toLowerCase() as 'offer' | 'answer' | 'ice'
}

function formatParticipantTimestamp(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

async function getCurrentUserRecord() {
  const session = await requireAuthSession()
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
    include: {
      profile: true,
    },
  })

  if (!user) {
    throw new AuthRequiredError()
  }

  return user
}

async function getLiveSessionRecord(streamId: string) {
  if (!streamId.trim()) {
    throw new Error('Debes seleccionar un stream válido para la videollamada.')
  }

  const liveSession = await db.liveSession.findUnique({
    where: {
      id: streamId,
    },
    include: {
      hostUser: true,
    },
  })

  if (!liveSession) {
    throw new Error('El stream seleccionado ya no existe.')
  }

  return liveSession
}

async function cleanupLiveCallState(streamId: string) {
  const staleBefore = new Date(Date.now() - LIVE_CALL_STALE_MS)
  const oldSignalsBefore = new Date(Date.now() - LIVE_CALL_SIGNAL_TTL_MS)

  await db.$transaction([
    db.liveCallSignal.deleteMany({
      where: {
        liveSessionId: streamId,
        OR: [
          {
            createdAt: {
              lt: oldSignalsBefore,
            },
          },
          {
            consumedAt: {
              lt: oldSignalsBefore,
            },
          },
        ],
      },
    }),
    db.liveCallParticipant.deleteMany({
      where: {
        liveSessionId: streamId,
        lastSeenAt: {
          lt: staleBefore,
        },
      },
    }),
  ])
}

async function getParticipantRecords(streamId: string) {
  const participants = await db.liveCallParticipant.findMany({
    where: {
      liveSessionId: streamId,
    },
    include: {
      user: {
        include: {
          profile: true,
        },
      },
    },
    orderBy: {
      joinedAt: 'asc',
    },
  })

  return participants.sort((left, right) => {
    if (left.role !== right.role) {
      return left.role === LiveCallParticipantRole.HOST ? -1 : 1
    }

    return left.joinedAt.getTime() - right.joinedAt.getTime()
  })
}

function buildParticipantSnapshot(
  participant: LiveCallParticipantRecord,
  currentUserId: string
): LiveCallParticipantSnapshot {
  const isOnline = Date.now() - participant.lastSeenAt.getTime() < LIVE_CALL_STALE_MS

  return {
    id: participant.id,
    userId: participant.userId,
    displayName: participant.user.profile?.displayName ?? participant.user.name,
    handle: participant.user.handle,
    avatar: participant.user.avatarSeed,
    isMe: participant.userId === currentUserId,
    isHost: participant.role === LiveCallParticipantRole.HOST,
    microphoneEnabled: participant.microphoneEnabled,
    cameraEnabled: participant.cameraEnabled,
    joinedAt: formatParticipantTimestamp(participant.joinedAt),
    stateLabel: isOnline ? 'Conectado' : 'Reconectando',
  }
}

function buildSignalSnapshot(signal: {
  id: string
  fromParticipantId: string
  toParticipantId: string
  type: LiveCallSignalType
  payload: Prisma.JsonValue
  createdAt: Date
}): LiveCallSignalSnapshot {
  return {
    id: signal.id,
    fromParticipantId: signal.fromParticipantId,
    toParticipantId: signal.toParticipantId,
    type: mapSignalType(signal.type),
    payload: signal.payload,
    createdAt: signal.createdAt.toISOString(),
  }
}

export async function getLiveCallState(streamId: string): Promise<LiveCallStateSnapshot> {
  const [currentUser, liveSession] = await Promise.all([getCurrentUserRecord(), getLiveSessionRecord(streamId)])
  await cleanupLiveCallState(liveSession.id)

  const participants = await getParticipantRecords(liveSession.id)
  const myParticipant = participants.find((participant) => participant.userId === currentUser.id) ?? null

  return {
    streamId: liveSession.id,
    streamTitle: liveSession.title,
    rtcEnabled: true,
    note: participants.length
      ? null
      : 'La llamada está lista, pero todavía no hay nadie conectado al stream.',
    myParticipantId: myParticipant?.id ?? null,
    participants: participants.map((participant) => buildParticipantSnapshot(participant, currentUser.id)),
  }
}

export async function joinLiveCall(payload: {
  streamId: string
  microphoneEnabled?: boolean
  cameraEnabled?: boolean
}) {
  const [currentUser, liveSession] = await Promise.all([getCurrentUserRecord(), getLiveSessionRecord(payload.streamId)])
  await cleanupLiveCallState(liveSession.id)

  await db.liveCallParticipant.upsert({
    where: {
      liveSessionId_userId: {
        liveSessionId: liveSession.id,
        userId: currentUser.id,
      },
    },
    update: {
      role: liveSession.hostUserId === currentUser.id ? LiveCallParticipantRole.HOST : LiveCallParticipantRole.GUEST,
      microphoneEnabled: payload.microphoneEnabled ?? true,
      cameraEnabled: payload.cameraEnabled ?? true,
      lastSeenAt: new Date(),
    },
    create: {
      liveSessionId: liveSession.id,
      userId: currentUser.id,
      role: liveSession.hostUserId === currentUser.id ? LiveCallParticipantRole.HOST : LiveCallParticipantRole.GUEST,
      microphoneEnabled: payload.microphoneEnabled ?? true,
      cameraEnabled: payload.cameraEnabled ?? true,
      lastSeenAt: new Date(),
    },
  })

  return getLiveCallState(liveSession.id)
}

export async function heartbeatLiveCall(payload: {
  streamId: string
  participantId: string
  microphoneEnabled?: boolean
  cameraEnabled?: boolean
}) {
  const currentUser = await getCurrentUserRecord()
  const participant = await db.liveCallParticipant.findFirst({
    where: {
      id: payload.participantId,
      liveSessionId: payload.streamId,
      userId: currentUser.id,
    },
    select: {
      id: true,
    },
  })

  if (!participant) {
    throw new Error('La participación de llamada ya no existe.')
  }

  await db.liveCallParticipant.update({
    where: {
      id: participant.id,
    },
    data: {
      lastSeenAt: new Date(),
      microphoneEnabled: payload.microphoneEnabled ?? true,
      cameraEnabled: payload.cameraEnabled ?? true,
    },
  })

  return getLiveCallState(payload.streamId)
}

export async function leaveLiveCall(payload: {
  streamId: string
  participantId: string
}) {
  const currentUser = await getCurrentUserRecord()

  const deleted = await db.liveCallParticipant.deleteMany({
    where: {
      id: payload.participantId,
      liveSessionId: payload.streamId,
      userId: currentUser.id,
    },
  })

  if (!deleted.count) {
    throw new Error('No se pudo cerrar la participación en la llamada.')
  }

  return {
    ok: true,
  }
}

export async function sendLiveCallSignal(payload: {
  streamId: string
  participantId: string
  toParticipantId: string
  type: 'offer' | 'answer' | 'ice'
  signal: unknown
}) {
  const currentUser = await getCurrentUserRecord()
  await cleanupLiveCallState(payload.streamId)

  const [fromParticipant, toParticipant] = await Promise.all([
    db.liveCallParticipant.findFirst({
      where: {
        id: payload.participantId,
        liveSessionId: payload.streamId,
        userId: currentUser.id,
      },
    }),
    db.liveCallParticipant.findFirst({
      where: {
        id: payload.toParticipantId,
        liveSessionId: payload.streamId,
      },
    }),
  ])

  if (!fromParticipant) {
    throw new Error('No tienes una participación activa para enviar señal WebRTC.')
  }

  if (!toParticipant) {
    throw new Error('La otra persona ya no está disponible en la llamada.')
  }

  if (fromParticipant.id === toParticipant.id) {
    throw new Error('No puedes enviarte una señal WebRTC a ti mismo.')
  }

  if (!payload.signal || typeof payload.signal !== 'object' || Array.isArray(payload.signal)) {
    throw new Error('La señal WebRTC debe ser un objeto JSON válido.')
  }

  const type =
    payload.type === 'offer'
      ? LiveCallSignalType.OFFER
      : payload.type === 'answer'
        ? LiveCallSignalType.ANSWER
        : LiveCallSignalType.ICE

  const signal = await db.liveCallSignal.create({
    data: {
      liveSessionId: payload.streamId,
      fromParticipantId: fromParticipant.id,
      toParticipantId: toParticipant.id,
      type,
      payload: payload.signal as Prisma.InputJsonValue,
    },
  })

  return buildSignalSnapshot(signal)
}

export async function pullLiveCallSignals(payload: {
  streamId: string
  participantId: string
}) {
  const currentUser = await getCurrentUserRecord()
  await cleanupLiveCallState(payload.streamId)

  const participant = await db.liveCallParticipant.findFirst({
    where: {
      id: payload.participantId,
      liveSessionId: payload.streamId,
      userId: currentUser.id,
    },
    select: {
      id: true,
    },
  })

  if (!participant) {
    throw new Error('La participación activa ya no existe para recibir señales.')
  }

  const signals = await db.$transaction(async (tx) => {
    const pendingSignals = await tx.liveCallSignal.findMany({
      where: {
        liveSessionId: payload.streamId,
        toParticipantId: participant.id,
        consumedAt: null,
      },
      orderBy: {
        createdAt: 'asc',
      },
      take: 40,
    })

    if (pendingSignals.length) {
      await tx.liveCallSignal.updateMany({
        where: {
          id: {
            in: pendingSignals.map((signal) => signal.id),
          },
        },
        data: {
          consumedAt: new Date(),
        },
      })
    }

    return pendingSignals
  })

  return signals.map((signal) => buildSignalSnapshot(signal))
}
