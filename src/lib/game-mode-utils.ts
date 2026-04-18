import type { GameModeId } from '@/lib/game-engine'

export function getRoomGameMode(room: { maxPlayers: number; gameMode?: string | null }): GameModeId {
  if (room.gameMode === 'custom-table') {
    return 'custom-table'
  }

  if (room.gameMode === 'classic-hearts') {
    return 'classic-hearts'
  }

  return room.maxPlayers > 4 ? 'custom-table' : 'classic-hearts'
}

export function isCustomTableRoom(room: { maxPlayers: number; gameMode?: string | null }) {
  return getRoomGameMode(room) === 'custom-table'
}
