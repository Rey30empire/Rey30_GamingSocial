import type { PlayerSeat, TurnOrderStrategyConfig } from './types'

export function getActiveSeats(seats: PlayerSeat[]) {
  return seats
    .filter((seat) => seat.playerId && seat.status !== 'empty')
    .sort((left, right) => left.seatIndex - right.seatIndex)
}

export function createSeatsForPlayers(input: {
  playerIds: string[]
  hostPlayerId?: string
  minSeats: number
  maxSeats: number
  displayNames?: Record<string, string>
}): PlayerSeat[] {
  if (input.playerIds.length > input.maxSeats) {
    throw new Error(`Cannot create ${input.playerIds.length} seats with max ${input.maxSeats}.`)
  }

  const seatCount = Math.max(input.minSeats, input.playerIds.length)

  return Array.from({ length: seatCount }, (_, seatIndex) => {
    const playerId = input.playerIds[seatIndex] ?? null

    return {
      seatIndex,
      playerId,
      displayName: playerId ? (input.displayNames?.[playerId] ?? `Jugador ${seatIndex + 1}`) : 'Asiento libre',
      status: playerId ? 'occupied' : 'empty',
      isHost: Boolean(playerId && playerId === input.hostPlayerId),
      isBot: false,
    } satisfies PlayerSeat
  })
}

export function orderSeatsForTurn(seats: PlayerSeat[], strategy: TurnOrderStrategyConfig) {
  const activeSeats = getActiveSeats(seats)

  if (strategy.mode === 'counter-clockwise') {
    return [...activeSeats].sort((left, right) => right.seatIndex - left.seatIndex)
  }

  return activeSeats
}

export function getNextSeatIndex(params: {
  seats: PlayerSeat[]
  currentSeatIndex: number
  strategy: TurnOrderStrategyConfig
}) {
  const orderedSeats = orderSeatsForTurn(params.seats, params.strategy)
  const currentIndex = orderedSeats.findIndex((seat) => seat.seatIndex === params.currentSeatIndex)

  if (currentIndex < 0) {
    return orderedSeats[0]?.seatIndex ?? null
  }

  return orderedSeats[(currentIndex + 1) % orderedSeats.length]?.seatIndex ?? null
}
