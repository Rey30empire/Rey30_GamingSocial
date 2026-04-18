import type { CardDefinition, DealOrder, DealResult, DealStrategyConfig, PlayerSeat } from './types'
import { getActiveSeats } from './seats'

function hashString(value: string) {
  let hash = 0

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return hash || 1
}

export function seededShuffle<T>(items: T[], seedSource = 'rey30-game-engine') {
  const result = [...items]
  let seed = hashString(seedSource)

  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    const swapIndex = seed % (index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

function orderSeatsForDeal(seats: PlayerSeat[], dealOrder: DealOrder) {
  const activeSeats = getActiveSeats(seats)

  if (dealOrder === 'counter-clockwise') {
    return [...activeSeats].sort((left, right) => right.seatIndex - left.seatIndex)
  }

  return activeSeats
}

function createEmptyHands(seats: PlayerSeat[]) {
  return Object.fromEntries(
    seats.map((seat) => {
      if (!seat.playerId) {
        throw new Error('Cannot create a hand for an empty seat.')
      }

      return [seat.playerId, [] as CardDefinition[]]
    })
  )
}

function resolveLeftovers(leftoverCards: CardDefinition[], strategy: DealStrategyConfig) {
  if (leftoverCards.length === 0) {
    return {
      pot: [] as CardDefinition[],
      discarded: [] as CardDefinition[],
      undealt: [] as CardDefinition[],
      leftoverAction: strategy.leftoverStrategy,
    }
  }

  if (strategy.leftoverStrategy === 'none' && strategy.mode === 'equal') {
    throw new Error(`Deal strategy ${strategy.id} does not allow leftover cards.`)
  }

  if (strategy.leftoverStrategy === 'discard' || strategy.mode === 'equal-discard-leftovers') {
    return {
      pot: [] as CardDefinition[],
      discarded: leftoverCards,
      undealt: [] as CardDefinition[],
      leftoverAction: 'discard' as const,
    }
  }

  if (strategy.leftoverStrategy === 'partial') {
    return {
      pot: [] as CardDefinition[],
      discarded: [] as CardDefinition[],
      undealt: leftoverCards,
      leftoverAction: 'partial' as const,
    }
  }

  return {
    pot: leftoverCards,
    discarded: [] as CardDefinition[],
    undealt: [] as CardDefinition[],
    leftoverAction: 'pot' as const,
  }
}

function dealPartial(params: {
  orderedSeats: PlayerSeat[]
  shuffledDeck: CardDefinition[]
  strategy: DealStrategyConfig
}): DealResult {
  const hands = createEmptyHands(params.orderedSeats)

  params.shuffledDeck.forEach((card, index) => {
    const seat = params.orderedSeats[index % params.orderedSeats.length]

    if (!seat.playerId) {
      throw new Error('Cannot deal to an empty seat.')
    }

    hands[seat.playerId]?.push(card)
  })

  const handSizes = Object.fromEntries(Object.entries(hands).map(([playerId, cards]) => [playerId, cards.length]))
  const minHandSize = Math.min(...Object.values(handSizes))

  return {
    hands,
    pot: [],
    discarded: [],
    undealt: [],
    cardsPerPlayer: minHandSize,
    handSizes,
    leftoverCount: 0,
    totalDealt: params.shuffledDeck.length,
    dealOrder: params.orderedSeats.map((seat) => seat.playerId!).filter(Boolean),
    leftoverAction: params.strategy.leftoverStrategy,
  }
}

export function dealCards(input: {
  players: PlayerSeat[]
  deck: CardDefinition[]
  strategy: DealStrategyConfig
  seedSource?: string
}): DealResult {
  const orderedSeats = orderSeatsForDeal(input.players, input.strategy.dealOrder)

  if (orderedSeats.length === 0) {
    throw new Error('Cannot deal cards without active players.')
  }

  const shuffledDeck = seededShuffle(input.deck, input.seedSource)

  if (input.strategy.mode === 'partial') {
    return dealPartial({
      orderedSeats,
      shuffledDeck,
      strategy: input.strategy,
    })
  }

  const cardsPerPlayer = input.strategy.cardsPerPlayer ?? Math.floor(shuffledDeck.length / orderedSeats.length)
  const totalDealt = cardsPerPlayer * orderedSeats.length

  if (totalDealt > shuffledDeck.length) {
    throw new Error(`Deck has ${shuffledDeck.length} cards, but strategy ${input.strategy.id} requires ${totalDealt}.`)
  }

  const hands = createEmptyHands(orderedSeats)
  let deckIndex = 0

  for (let round = 0; round < cardsPerPlayer; round += 1) {
    for (const seat of orderedSeats) {
      if (!seat.playerId) {
        throw new Error('Cannot deal to an empty seat.')
      }

      const card = shuffledDeck[deckIndex]

      if (!card) {
        throw new Error('Deck ran out while dealing.')
      }

      hands[seat.playerId]?.push(card)
      deckIndex += 1
    }
  }

  const leftoverCards = shuffledDeck.slice(totalDealt)
  const leftovers = resolveLeftovers(leftoverCards, input.strategy)
  const handSizes = Object.fromEntries(Object.entries(hands).map(([playerId, cards]) => [playerId, cards.length]))

  return {
    hands,
    pot: leftovers.pot,
    discarded: leftovers.discarded,
    undealt: leftovers.undealt,
    cardsPerPlayer,
    handSizes,
    leftoverCount: leftoverCards.length,
    totalDealt,
    dealOrder: orderedSeats.map((seat) => seat.playerId!).filter(Boolean),
    leftoverAction: leftovers.leftoverAction,
  }
}
