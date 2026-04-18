import { db } from '@/lib/db'
import {
  ensureGameMatchForRoom as ensureClassicGameMatchForRoom,
  getGameSnapshot as getClassicGameSnapshot,
  playCurrentUserCard as playClassicCurrentUserCard,
  updateGameControl as updateClassicGameControl,
} from '@/lib/game-core'
import {
  ensureCustomTableMatchForRoom,
  getCustomTableSnapshot,
  playCustomTableCard,
  updateCustomTableControl,
} from '@/lib/custom-table-core'
import { getRoomGameMode } from '@/lib/game-mode-utils'

async function resolveRoomMode(roomId?: string) {
  const room = roomId
    ? await db.room.findUnique({
        where: {
          id: roomId,
        },
        select: {
          maxPlayers: true,
          gameMode: true,
        },
      })
    : await db.room.findFirst({
        where: {
          type: 'GAME',
        },
        orderBy: [{ featured: 'desc' }, { lastActivityAt: 'desc' }],
        select: {
          maxPlayers: true,
          gameMode: true,
        },
      })

  if (!room) {
    return 'classic-hearts' as const
  }

  return getRoomGameMode(room)
}

export async function ensureGameMatchForRoomByMode(roomId?: string) {
  const mode = await resolveRoomMode(roomId)

  if (mode === 'custom-table') {
    return ensureCustomTableMatchForRoom(roomId)
  }

  return ensureClassicGameMatchForRoom(roomId)
}

export async function getGameSnapshotByMode(roomId?: string) {
  const mode = await resolveRoomMode(roomId)

  if (mode === 'custom-table') {
    return getCustomTableSnapshot(roomId)
  }

  return getClassicGameSnapshot(roomId)
}

export async function playCurrentUserCardByMode(roomId: string, cardId: string) {
  const mode = await resolveRoomMode(roomId)

  if (mode === 'custom-table') {
    return playCustomTableCard(roomId, cardId)
  }

  return playClassicCurrentUserCard(roomId, cardId)
}

export async function updateGameControlByMode(params: {
  roomId: string
  action:
    | 'toggle-voice'
    | 'toggle-sound'
    | 'toggle-chat'
    | 'toggle-dark-mode'
    | 'set-table-zoom'
    | 'set-card-scale'
    | 'reset-round'
  value?: number
}) {
  const mode = await resolveRoomMode(params.roomId)

  if (mode === 'custom-table') {
    return updateCustomTableControl(params)
  }

  return updateClassicGameControl(params)
}
