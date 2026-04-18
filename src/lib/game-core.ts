import { GameMatchStatus, RoomType, RoomVisibility } from '@prisma/client'
import { AuthRequiredError, requireAuthSession } from '@/lib/auth'
import type { ChatMessageSnapshot, GameSnapshot } from '@/lib/app-types'
import { db } from '@/lib/db'

const HAND_SIZE = 13
const MAX_TRICK_HISTORY = 13
const SEAT_POSITIONS = ['top', 'left', 'right', 'bottom'] as const
const SUITS = ['clubs', 'diamonds', 'spades', 'crowns'] as const
const OPENING_CARD_ID = 'clubs-2'
const MOONSHOT_POINTS = 26
const BOT_POOL = [
  { name: 'MiaBot', avatarSeed: 'miabot', connected: true },
  { name: 'RexBot', avatarSeed: 'rexbot', connected: true },
  { name: 'NovaBot', avatarSeed: 'novabot', connected: true },
  { name: 'KiraBot', avatarSeed: 'kirabot', connected: true },
  { name: 'AxelBot', avatarSeed: 'axelbot', connected: true },
] as const

type GameSuit = (typeof SUITS)[number]

interface GameCardState {
  id: string
  suit: GameSuit
  rank: number
  label: string
}

interface SeatBlueprint {
  seat: number
  playerId: string
  userId: string | null
  displayName: string
  avatarSeed: string
  isBot: boolean
  connected: boolean
}

interface GameSeatState extends SeatBlueprint {
  cards: GameCardState[]
  score: number
  roundPoints: number
  tricksWon: number
}

interface PlayedCardState {
  seat: number
  playerId: string
  displayName: string
  card: GameCardState
}

interface TrickHistoryState {
  trickNumber: number
  winnerSeat: number
  penaltyPoints: number
  cards: PlayedCardState[]
  summary: string
}

interface GameEngineState {
  seats: GameSeatState[]
  tableCards: PlayedCardState[]
  trickHistory: TrickHistoryState[]
}

interface GameSettingsState {
  voiceEnabled: boolean
  soundEnabled: boolean
  tableChatEnabled: boolean
  darkMode: boolean
  tableZoom: number
  cardScale: number
}

interface MatchMutationResult {
  matchId: string
  roomId: string
  summary: string
}

type GameControlAction =
  | 'toggle-voice'
  | 'toggle-sound'
  | 'toggle-chat'
  | 'toggle-dark-mode'
  | 'set-table-zoom'
  | 'set-card-scale'
  | 'reset-round'

const defaultSettings: GameSettingsState = {
  voiceEnabled: true,
  soundEnabled: true,
  tableChatEnabled: true,
  darkMode: true,
  tableZoom: 72,
  cardScale: 64,
}

function stringifyState(value: unknown) {
  return JSON.stringify(value)
}

function parseState(payload: string): GameEngineState {
  const parsed = JSON.parse(payload) as Partial<GameEngineState>

  return {
    seats: (parsed.seats ?? []).map((seat) => ({
      ...(seat as GameSeatState),
      cards: [...((seat as GameSeatState | undefined)?.cards ?? [])].map((card) => ({
        ...card,
        label: card.label ?? cardLabel(card.rank),
      })),
      score: typeof (seat as GameSeatState | undefined)?.score === 'number' ? (seat as GameSeatState).score : 0,
      roundPoints:
        typeof (seat as GameSeatState | undefined)?.roundPoints === 'number' ? (seat as GameSeatState).roundPoints : 0,
      tricksWon: typeof (seat as GameSeatState | undefined)?.tricksWon === 'number' ? (seat as GameSeatState).tricksWon : 0,
      connected: (seat as GameSeatState | undefined)?.connected ?? true,
    })),
    tableCards: [...(parsed.tableCards ?? [])].map((entry) => ({
      ...entry,
      card: {
        ...entry.card,
        label: entry.card.label ?? cardLabel(entry.card.rank),
      },
    })),
    trickHistory: [...(parsed.trickHistory ?? [])].map((entry) => ({
      ...entry,
      cards: entry.cards.map((cardEntry) => ({
        ...cardEntry,
        card: {
          ...cardEntry.card,
          label: cardEntry.card.label ?? cardLabel(cardEntry.card.rank),
        },
      })),
    })),
  }
}

function parseSettings(payload: string): GameSettingsState {
  const parsed = JSON.parse(payload) as Partial<GameSettingsState>

  return {
    ...defaultSettings,
    ...parsed,
    soundEnabled: parsed.soundEnabled ?? true,
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function cardLabel(rank: number) {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  return String(rank)
}

function formatCard(card: GameCardState) {
  const suitIcon = {
    crowns: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit]

  return `${card.label}${suitIcon}`
}

function formatEventClock(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function hashString(value: string) {
  let hash = 0

  for (const char of value) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }

  return hash || 1
}

function seededShuffle<T>(items: T[], seedSource: string) {
  const result = [...items]
  let seed = hashString(seedSource)

  for (let index = result.length - 1; index > 0; index -= 1) {
    seed = (seed * 1664525 + 1013904223) % 4294967296
    const swapIndex = seed % (index + 1)
    ;[result[index], result[swapIndex]] = [result[swapIndex], result[index]]
  }

  return result
}

function createDeck(seedSource: string) {
  const deck: GameCardState[] = []

  for (const suit of SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      deck.push({
        id: `${suit}-${rank}`,
        suit,
        rank,
        label: cardLabel(rank),
      })
    }
  }

  return seededShuffle(deck, seedSource)
}

function sortCards(cards: GameCardState[]) {
  return [...cards].sort((left, right) => {
    const suitOrder = SUITS.indexOf(left.suit) - SUITS.indexOf(right.suit)
    return suitOrder !== 0 ? suitOrder : left.rank - right.rank
  })
}

function seatSort(a: { seat: number }, b: { seat: number }) {
  return a.seat - b.seat
}

function getNextSeat(currentSeat: number) {
  return (currentSeat + 1) % 4
}

function isPenaltyCard(card: GameCardState) {
  return card.suit === 'crowns' || (card.suit === 'spades' && card.rank === 12)
}

function getPenaltyPoints(cards: PlayedCardState[]) {
  return cards.reduce((total, entry) => {
    if (entry.card.suit === 'crowns') {
      return total + 1
    }

    if (entry.card.suit === 'spades' && entry.card.rank === 12) {
      return total + 13
    }

    return total
  }, 0)
}

function getLeadWinnerSeat(cards: PlayedCardState[]) {
  const leadSuit = cards[0]?.card.suit
  const leadCards = cards.filter((entry) => entry.card.suit === leadSuit)
  const winner = leadCards.reduce((best, current) => (current.card.rank > best.card.rank ? current : best), leadCards[0])
  return winner.seat
}

function getLegalCards(
  seat: GameSeatState,
  context: {
    leadSuit?: string | null
    crownsReleased: boolean
    trickNumber: number
    cardsOnTable: number
  }
) {
  const sortedCards = sortCards(seat.cards)

  if (context.trickNumber === 1 && context.cardsOnTable === 0) {
    const openingCard = sortedCards.find((card) => card.id === OPENING_CARD_ID)

    if (openingCard) {
      return [openingCard]
    }
  }

  if (context.leadSuit) {
    const sameSuit = sortedCards.filter((card) => card.suit === context.leadSuit)

    if (sameSuit.length) {
      return sameSuit
    }

    if (context.trickNumber === 1) {
      const safeDiscards = sortedCards.filter((card) => !isPenaltyCard(card))

      if (safeDiscards.length) {
        return safeDiscards
      }
    }

    return sortedCards
  }

  if (!context.crownsReleased) {
    const nonCrowns = sortedCards.filter((card) => card.suit !== 'crowns')

    if (nonCrowns.length) {
      return nonCrowns
    }
  }

  return sortedCards
}

function chooseBotCard(
  seat: GameSeatState,
  context: {
    leadSuit?: string | null
    crownsReleased: boolean
    trickNumber: number
    cardsOnTable: number
  }
) {
  const legalCards = getLegalCards(seat, context)
  const followingLeadSuit = Boolean(context.leadSuit) && legalCards.every((card) => card.suit === context.leadSuit)

  if (context.trickNumber === 1 && context.cardsOnTable === 0) {
    return legalCards[0]
  }

  if (followingLeadSuit) {
    return legalCards[0]
  }

  const queenOfSpades = legalCards.find((card) => card.suit === 'spades' && card.rank === 12)

  if (queenOfSpades) {
    return queenOfSpades
  }

  const crowns = legalCards.filter((card) => card.suit === 'crowns')

  if (crowns.length) {
    return crowns[crowns.length - 1]
  }

  return legalCards[legalCards.length - 1] ?? legalCards[0]
}

async function getCurrentUserRecord() {
  const session = await requireAuthSession()
  const user = await db.user.findUnique({
    where: {
      id: session.user.id,
    },
  })

  if (!user) {
    throw new AuthRequiredError()
  }

  return user
}

async function getGameRoomRecord(roomId?: string) {
  if (roomId) {
    const room = await db.room.findUnique({
      where: { id: roomId },
      include: {
        messages: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        memberships: {
          include: {
            user: true,
          },
          orderBy: {
            seatOrder: 'asc',
          },
        },
      },
    })

    if (!room) {
      throw new Error('No se encontro la sala de la partida.')
    }

    if (room.type !== RoomType.GAME) {
      throw new Error('La sala seleccionada no es una mesa de juego.')
    }

    return room
  }

  const room = await db.room.findFirst({
    where: {
      type: RoomType.GAME,
    },
    include: {
      messages: {
        include: {
          user: true,
        },
        orderBy: {
          createdAt: 'asc',
        },
      },
      memberships: {
        include: {
          user: true,
        },
        orderBy: {
          seatOrder: 'asc',
        },
      },
    },
    orderBy: [
      { featured: 'desc' },
      { lastActivityAt: 'desc' },
    ],
  })

  if (!room) {
    throw new Error('Aun no hay mesas disponibles.')
  }

  return room
}

function normalizeInviteCode(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}

async function addCurrentUserMembershipToRoom(
  room: Awaited<ReturnType<typeof getGameRoomRecord>>,
  currentUser: Awaited<ReturnType<typeof getCurrentUserRecord>>
) {
  if (room.memberships.some((membership) => membership.userId === currentUser.id)) {
    return room
  }

  if (room.currentPlayers >= room.maxPlayers) {
    throw new Error('La sala ya esta llena. Prueba con otra mesa disponible.')
  }

  const usedSeats = new Set(room.memberships.map((membership) => membership.seatOrder))
  const nextSeat = Array.from({ length: room.maxPlayers }, (_, seat) => seat).find((seat) => !usedSeats.has(seat))

  if (nextSeat === undefined) {
    throw new Error('No se encontro un asiento libre para entrar a la mesa.')
  }

  await db.$transaction([
    db.roomMembership.create({
      data: {
        roomId: room.id,
        userId: currentUser.id,
        isHost: room.hostUserId === currentUser.id,
        seatOrder: nextSeat,
        seatLabel: room.hostUserId === currentUser.id ? 'Host' : 'Jugador',
      },
    }),
    db.room.update({
      where: {
        id: room.id,
      },
      data: {
        currentPlayers: {
          increment: 1,
        },
        onlineCount: {
          increment: 1,
        },
        lastMessagePreview: `${currentUser.name} se unio a la sala.`,
        lastActivityAt: new Date(),
      },
    }),
    db.message.create({
      data: {
        roomId: room.id,
        userId: currentUser.id,
        content: `${currentUser.name} se unio a la sala.`,
      },
    }),
  ])

  return getGameRoomRecord(room.id)
}

async function ensureCurrentUserMembership(roomId?: string) {
  if (!roomId) {
    return
  }

  const [currentUser, room] = await Promise.all([getCurrentUserRecord(), getGameRoomRecord(roomId)])

  if (room.memberships.some((membership) => membership.userId === currentUser.id)) {
    return
  }

  if (room.visibility === RoomVisibility.PRIVATE) {
    throw new Error('Necesitas unirte con el codigo privado para entrar a esta sala.')
  }

  await addCurrentUserMembershipToRoom(room, currentUser)

  const existingMatch = await db.gameMatch.findUnique({
    where: {
      roomId: room.id,
    },
  })

  if (!existingMatch) {
    return
  }

  const refreshedRoom = await getGameRoomRecord(room.id)
  const previousState = parseState(existingMatch.statePayload)
  const settings = parseSettings(existingMatch.settingsPayload)
  const nextRound = createRoundState(refreshedRoom, existingMatch.roundNumber + 1, previousState.seats)
  const summary = `${currentUser.name} entro a la mesa. Nueva ronda lista.`

  await persistMatchState({
    matchId: existingMatch.id,
    roomId: room.id,
    status: GameMatchStatus.ACTIVE,
    roundNumber: existingMatch.roundNumber + 1,
    trickNumber: nextRound.trickNumber,
    turnSeat: nextRound.turnSeat,
    leadSuit: nextRound.leadSuit,
    crownsReleased: nextRound.crownsReleased,
    lastWinnerSeat: null,
    lastActionSummary: summary,
    state: nextRound.state,
    settings,
  })

  await appendMatchEvent(existingMatch.id, {
    actorUserId: currentUser.id,
    eventType: 'PLAYER_JOINED',
    summary,
  })
}

export async function joinCurrentUserToRoomByInviteCode(inviteCode: string) {
  const normalizedInviteCode = normalizeInviteCode(inviteCode)

  if (normalizedInviteCode.length < 6) {
    throw new Error('Ingresa un codigo valido de 6 caracteres.')
  }

  const [currentUser, room] = await Promise.all([
    getCurrentUserRecord(),
    db.room.findFirst({
      where: {
        inviteCode: normalizedInviteCode,
        type: RoomType.GAME,
      },
      include: {
        messages: {
          include: {
            user: true,
          },
          orderBy: {
            createdAt: 'asc',
          },
        },
        memberships: {
          include: {
            user: true,
          },
          orderBy: {
            seatOrder: 'asc',
          },
        },
      },
    }),
  ])

  if (!room) {
    throw new Error('No existe ninguna sala privada con ese codigo.')
  }

  if (room.visibility !== RoomVisibility.PRIVATE) {
    throw new Error('Ese codigo no pertenece a una sala privada.')
  }

  const alreadyMember = room.memberships.some((membership) => membership.userId === currentUser.id)

  if (!alreadyMember) {
    await addCurrentUserMembershipToRoom(room, currentUser)
  }

  return {
    roomId: room.id,
    roomName: room.name,
    inviteCode: normalizedInviteCode,
    alreadyMember,
  }
}

function buildSeatBlueprints(
  room: Awaited<ReturnType<typeof getGameRoomRecord>>
): SeatBlueprint[] {
  const seats: SeatBlueprint[] = []
  const usedSeats = new Set<number>()

  for (const membership of room.memberships) {
    let seat = membership.seatOrder

    if (seat < 0 || seat > 3 || usedSeats.has(seat)) {
      seat = [0, 1, 2, 3].find((value) => !usedSeats.has(value)) ?? seats.length
    }

    usedSeats.add(seat)
    seats.push({
      seat,
      playerId: membership.userId,
      userId: membership.userId,
      displayName: membership.user.name,
      avatarSeed: membership.user.avatarSeed,
      isBot: false,
      connected: true,
    })
  }

  let botIndex = 0
  while (seats.length < 4) {
    const seat = [0, 1, 2, 3].find((value) => !usedSeats.has(value))

    if (seat === undefined) {
      break
    }

    const bot = BOT_POOL[botIndex % BOT_POOL.length]
    usedSeats.add(seat)
    seats.push({
      seat,
      playerId: `bot-${room.id}-${seat}`,
      userId: null,
      displayName: bot.name,
      avatarSeed: bot.avatarSeed,
      isBot: true,
      connected: bot.connected,
    })
    botIndex += 1
  }

  return seats.sort(seatSort)
}

function createRoundState(
  room: Awaited<ReturnType<typeof getGameRoomRecord>>,
  roundNumber: number,
  previousSeats?: Pick<GameSeatState, 'playerId' | 'score'>[]
) {
  const deck = createDeck(`${room.id}:${roundNumber}`)
  const seatBlueprints = buildSeatBlueprints(room)
  const scoreByPlayerId = new Map(previousSeats?.map((seat) => [seat.playerId, seat.score]) ?? [])
  const seats = seatBlueprints.map((seat, index) => ({
    ...seat,
    cards: sortCards(deck.slice(index * HAND_SIZE, index * HAND_SIZE + HAND_SIZE)),
    score: scoreByPlayerId.get(seat.playerId) ?? 0,
    roundPoints: 0,
    tricksWon: 0,
  }))

  const openingSeat = seats.find((seat) => seat.cards.some((card) => card.id === OPENING_CARD_ID))?.seat ?? seats[0]?.seat ?? 0

  return {
    turnSeat: openingSeat,
    crownsReleased: false,
    trickNumber: 1,
    leadSuit: null as string | null,
    state: {
      seats,
      tableCards: [],
      trickHistory: [],
    } satisfies GameEngineState,
  }
}

async function upgradeLegacyMatchIfNeeded(
  room: Awaited<ReturnType<typeof getGameRoomRecord>>,
  match: Awaited<ReturnType<typeof db.gameMatch.findUnique>>
) {
  if (!match) {
    throw new Error('No se encontro la partida para actualizarla.')
  }

  const needsRoundUpgrade = !match.statePayload.includes('"roundPoints"')
  const needsSoundUpgrade = !match.settingsPayload.includes('"soundEnabled"')

  if (!needsRoundUpgrade && !needsSoundUpgrade) {
    return match
  }

  const state = parseState(match.statePayload)
  const settings = parseSettings(match.settingsPayload)
  const nextRound = createRoundState(room, match.roundNumber, state.seats)
  const summary = 'Mesa actualizada a rondas completas de 13 cartas.'

  await persistMatchState({
    matchId: match.id,
    roomId: room.id,
    status: GameMatchStatus.ACTIVE,
    roundNumber: match.roundNumber,
    trickNumber: nextRound.trickNumber,
    turnSeat: nextRound.turnSeat,
    leadSuit: nextRound.leadSuit,
    crownsReleased: nextRound.crownsReleased,
    lastWinnerSeat: null,
    lastActionSummary: summary,
    state: nextRound.state,
    settings,
  })

  await appendMatchEvent(match.id, {
    eventType: 'ROUND_UPGRADED',
    summary,
  })

  const refreshedMatch = await db.gameMatch.findUnique({
    where: {
      id: match.id,
    },
  })

  if (!refreshedMatch) {
    throw new Error('No se pudo recargar la mesa actualizada.')
  }

  return refreshedMatch
}

async function appendMatchEvent(matchId: string, event: { actorUserId?: string | null; eventType: string; summary: string; payload?: string }) {
  await db.gameMatchEvent.create({
    data: {
      gameMatchId: matchId,
      actorUserId: event.actorUserId ?? null,
      eventType: event.eventType,
      summary: event.summary,
      payload: event.payload,
    },
  })
}

async function persistMatchState(params: {
  matchId: string
  roomId: string
  status?: GameMatchStatus
  roundNumber?: number
  trickNumber: number
  turnSeat: number
  leadSuit?: string | null
  crownsReleased: boolean
  lastWinnerSeat?: number | null
  lastActionSummary: string
  state: GameEngineState
  settings: GameSettingsState
}) {
  await db.gameMatch.update({
    where: {
      id: params.matchId,
    },
    data: {
      status: params.status,
      roundNumber: params.roundNumber,
      trickNumber: params.trickNumber,
      turnSeat: params.turnSeat,
      leadSuit: params.leadSuit ?? null,
      crownsReleased: params.crownsReleased,
      lastWinnerSeat: params.lastWinnerSeat ?? null,
      lastActionSummary: params.lastActionSummary,
      statePayload: stringifyState(params.state),
      settingsPayload: stringifyState(params.settings),
    },
  })

  await db.room.update({
    where: {
      id: params.roomId,
    },
    data: {
      lastMessagePreview: params.lastActionSummary,
      lastActivityAt: new Date(),
    },
  })
}

function resolveTurnState(params: {
  state: GameEngineState
  turnSeat: number
  leadSuit?: string | null
  crownsReleased: boolean
  trickNumber: number
}) {
  const seats = params.state.seats.map((seat) => ({
    ...seat,
    cards: [...seat.cards],
  }))
  const tableCards = [...params.state.tableCards]
  const trickHistory = [...params.state.trickHistory]

  return {
    seats,
    tableCards,
    trickHistory,
    turnSeat: params.turnSeat,
    leadSuit: params.leadSuit ?? null,
    crownsReleased: params.crownsReleased,
    trickNumber: params.trickNumber,
    status: GameMatchStatus.ACTIVE as GameMatchStatus,
    lastWinnerSeat: null as number | null,
    summary: '',
  }
}

function buildRuleHint(params: {
  mySeat?: GameSeatState
  currentTurn?: GameSeatState
  match: Awaited<ReturnType<typeof db.gameMatch.findUnique>>
  state: GameEngineState
}) {
  if (params.match?.status === GameMatchStatus.FINISHED) {
    return 'La ronda termino. Revisa el resultado y abre la siguiente mano cuando la mesa este lista.'
  }

  if (!params.mySeat) {
    return 'Tu perfil no esta sentado en esta mesa todavia.'
  }

  if (params.currentTurn?.seat !== params.mySeat.seat) {
    return `Espera el turno de ${params.currentTurn?.displayName ?? 'la mesa'}.`
  }

  if (params.match?.trickNumber === 1 && params.state.tableCards.length === 0) {
    const openingCard = params.mySeat.cards.find((card) => card.id === OPENING_CARD_ID)

    if (openingCard) {
      return `Debes abrir la ronda con ${formatCard(openingCard)}.`
    }
  }

  if (params.match?.leadSuit) {
    const sameSuitCards = params.mySeat.cards.filter((card) => card.suit === params.match?.leadSuit)

    if (sameSuitCards.length) {
      return `Debes seguir el palo lider: ${formatCard(sameSuitCards[0]).slice(-1)}.`
    }

    if (params.match?.trickNumber === 1) {
      const safeDiscards = params.mySeat.cards.filter((card) => !isPenaltyCard(card))

      if (safeDiscards.length) {
        return 'Primera baza: evita soltar corazones o la Q♠ mientras tengas otra salida.'
      }
    }

    return 'No tienes el palo lider, asi que puedes descargar libremente.'
  }

  if (!params.match?.crownsReleased) {
    const nonCrowns = params.mySeat.cards.filter((card) => card.suit !== 'crowns')

    if (nonCrowns.length) {
      return 'Los corazones siguen bloqueados hasta que alguien los rompa.'
    }
  }

  return 'Puedes jugar cualquiera de tus cartas legales.'
}

function applyCardPlay(params: {
  state: GameEngineState
  turnSeat: number
  leadSuit?: string | null
  crownsReleased: boolean
  trickNumber: number
  cardId: string
}) {
  const working = resolveTurnState(params)
  const seat = working.seats.find((entry) => entry.seat === params.turnSeat)

  if (!seat) {
    throw new Error('No se encontro el asiento actual.')
  }

  const cardIndex = seat.cards.findIndex((card) => card.id === params.cardId)

  if (cardIndex < 0) {
    throw new Error('La carta no pertenece a la mano actual.')
  }

  const legalCards = getLegalCards(
    seat,
    {
      leadSuit: working.leadSuit,
      crownsReleased: working.crownsReleased,
      trickNumber: working.trickNumber,
      cardsOnTable: working.tableCards.length,
    }
  )
  const legalCardIds = new Set(legalCards.map((card) => card.id))

  if (!legalCardIds.has(params.cardId)) {
    throw new Error('Debes seguir el palo lider si aun lo tienes en mano.')
  }

  const [card] = seat.cards.splice(cardIndex, 1)

  working.tableCards.push({
    seat: seat.seat,
    playerId: seat.playerId,
    displayName: seat.displayName,
    card,
  })

  if (!working.leadSuit) {
    working.leadSuit = card.suit
  }

  if (card.suit === 'crowns') {
    working.crownsReleased = true
  }

  if (working.tableCards.length < 4) {
    working.turnSeat = getNextSeat(seat.seat)
    working.summary = `${seat.displayName} jugo ${formatCard(card)}.`
    return working
  }

  const winnerSeat = getLeadWinnerSeat(working.tableCards)
  const penaltyPoints = getPenaltyPoints(working.tableCards)
  const winner = working.seats.find((entry) => entry.seat === winnerSeat)

  if (!winner) {
    throw new Error('No se pudo resolver la baza.')
  }

  winner.score += penaltyPoints
  winner.roundPoints += penaltyPoints
  winner.tricksWon += 1
  working.summary = `${winner.displayName} gana la baza ${working.trickNumber} y recibe ${penaltyPoints} pts.`
  working.trickHistory.unshift({
    trickNumber: working.trickNumber,
    winnerSeat,
    penaltyPoints,
    cards: working.tableCards,
    summary: working.summary,
  })
  working.trickHistory.splice(MAX_TRICK_HISTORY)
  working.tableCards = []
  working.turnSeat = winnerSeat
  working.leadSuit = null
  working.lastWinnerSeat = winnerSeat
  working.trickNumber += 1

  if (working.seats.every((entry) => entry.cards.length === 0)) {
    working.status = GameMatchStatus.FINISHED
    working.trickNumber = HAND_SIZE
    const moonShooter = working.seats.find((entry) => entry.roundPoints === MOONSHOT_POINTS)

    if (moonShooter) {
      working.seats.forEach((entry) => {
        if (entry.seat === moonShooter.seat) {
          entry.score -= MOONSHOT_POINTS
          entry.roundPoints = 0
          return
        }

        entry.score += MOONSHOT_POINTS
        entry.roundPoints = MOONSHOT_POINTS
      })

      working.summary = `${moonShooter.displayName} limpio toda la mesa y dispara la luna. Los demas reciben ${MOONSHOT_POINTS} pts.`
      return working
    }

    const standings = [...working.seats].sort((left, right) => left.score - right.score)
    working.summary = `Ronda completa. ${standings[0]?.displayName ?? 'Mesa'} lidera con ${standings[0]?.score ?? 0} pts acumulados.`
  }

  return working
}

async function autoPlayBots(matchId: string, roomId: string) {
  let match = await db.gameMatch.findUnique({
    where: {
      id: matchId,
    },
  })

  if (!match) {
    throw new Error('No se encontro la partida.')
  }

  let activeMatch = match as NonNullable<typeof match>
  let settings = parseSettings(activeMatch.settingsPayload)
  let safety = 0

  while (activeMatch.status === GameMatchStatus.ACTIVE && safety < 72) {
    const state = parseState(activeMatch.statePayload)
    const activeSeat = state.seats.find((seat) => seat.seat === activeMatch.turnSeat)

    if (!activeSeat || !activeSeat.isBot) {
      return activeMatch
    }

    const selectedCard = chooseBotCard(
      activeSeat,
      {
        leadSuit: activeMatch.leadSuit,
        crownsReleased: activeMatch.crownsReleased,
        trickNumber: activeMatch.trickNumber,
        cardsOnTable: state.tableCards.length,
      }
    )
    const result = applyCardPlay({
      state,
      turnSeat: activeMatch.turnSeat,
      leadSuit: activeMatch.leadSuit,
      crownsReleased: activeMatch.crownsReleased,
      trickNumber: activeMatch.trickNumber,
      cardId: selectedCard.id,
    })

    await persistMatchState({
      matchId: activeMatch.id,
      roomId,
      status: result.status,
      roundNumber: activeMatch.roundNumber,
      trickNumber: result.trickNumber,
      turnSeat: result.turnSeat,
      leadSuit: result.leadSuit,
      crownsReleased: result.crownsReleased,
      lastWinnerSeat: result.lastWinnerSeat,
      lastActionSummary: result.summary,
      state: {
        seats: result.seats,
        tableCards: result.tableCards,
        trickHistory: result.trickHistory,
      },
      settings,
    })

    await appendMatchEvent(activeMatch.id, {
      actorUserId: null,
      eventType: result.tableCards.length === 0 ? 'TRICK_RESOLVED' : 'BOT_PLAY',
      summary: result.summary,
      payload: stringifyState({
        turnSeat: activeMatch.turnSeat,
        cardId: selectedCard.id,
      }),
    })

    const refreshedMatch = await db.gameMatch.findUnique({
      where: {
        id: activeMatch.id,
      },
    })

    if (!refreshedMatch) {
      throw new Error('La partida dejo de existir durante la simulacion.')
    }

    activeMatch = refreshedMatch
    settings = parseSettings(activeMatch.settingsPayload)
    safety += 1
  }

  return activeMatch
}

export async function ensureGameMatchForRoom(roomId?: string) {
  const room = await getGameRoomRecord(roomId)
  const existing = await db.gameMatch.findUnique({
    where: {
      roomId: room.id,
    },
  })

  if (existing) {
    return existing
  }

  const round = createRoundState(room, 1)
  const match = await db.gameMatch.create({
    data: {
      roomId: room.id,
      status: GameMatchStatus.ACTIVE,
      roundNumber: 1,
      trickNumber: round.trickNumber,
      turnSeat: round.turnSeat,
      leadSuit: round.leadSuit,
      crownsReleased: round.crownsReleased,
      statePayload: stringifyState(round.state),
      settingsPayload: stringifyState(defaultSettings),
      lastActionSummary: `Mesa lista. Turno de ${round.state.seats.find((seat) => seat.seat === round.turnSeat)?.displayName ?? 'la mesa'}.`,
    },
  })

  await appendMatchEvent(match.id, {
    eventType: 'ROUND_READY',
    summary: match.lastActionSummary ?? 'Mesa lista.',
    payload: stringifyState({
      roundNumber: 1,
    }),
  })

  return match
}

async function getReadyMatch(roomId?: string) {
  await ensureCurrentUserMembership(roomId)
  const room = await getGameRoomRecord(roomId)
  await ensureGameMatchForRoom(room.id)

  let match = await db.gameMatch.findUnique({
    where: {
      roomId: room.id,
    },
  })

  if (!match) {
    throw new Error('No se pudo preparar la partida.')
  }

  match = await upgradeLegacyMatchIfNeeded(room, match)
  match = await autoPlayBots(match.id, room.id)

  return { room, match }
}

export async function getGameSnapshot(roomId?: string): Promise<GameSnapshot> {
  const [{ room, match }, currentUser] = await Promise.all([getReadyMatch(roomId), getCurrentUserRecord()])
  const state = parseState(match.statePayload)
  const settings = parseSettings(match.settingsPayload)
  const events = await db.gameMatchEvent.findMany({
    where: {
      gameMatchId: match.id,
    },
    orderBy: {
      createdAt: 'desc',
    },
    take: 8,
  })

  const mySeat = state.seats.find((seat) => seat.userId === currentUser.id)
  const currentTurn = state.seats.find((seat) => seat.seat === match.turnSeat)
  const playableCardIds =
    mySeat && currentTurn?.seat === mySeat.seat && match.status !== GameMatchStatus.FINISHED
      ? getLegalCards(mySeat, {
          leadSuit: match.leadSuit,
          crownsReleased: match.crownsReleased,
          trickNumber: match.trickNumber,
          cardsOnTable: state.tableCards.length,
        }).map((card) => card.id)
      : []
  const tableMessages: ChatMessageSnapshot[] = room.messages.slice(-10).map((message) => ({
    id: message.id,
    roomId: room.id,
    user: {
      name: message.userId === currentUser.id ? 'Yo' : message.user.name,
      avatar: message.user.avatarSeed,
      isMe: message.userId === currentUser.id,
    },
    content: message.content,
    timestamp: formatEventClock(message.createdAt),
  }))

  return {
    tableMode: 'classic-hearts',
    tableModeLabel: 'Mesa clasica',
    matchId: match.id,
    roomId: room.id,
    roomName: room.name,
    status:
      match.status === GameMatchStatus.FINISHED
        ? 'finished'
        : match.status === GameMatchStatus.WAITING
          ? 'waiting'
          : 'active',
    roundNumber: match.roundNumber,
    trickNumber: match.trickNumber,
    crownsReleased: match.crownsReleased,
    leadSuit: match.leadSuit,
    currentTurnSeat: match.turnSeat,
    currentTurnLabel:
      match.status === GameMatchStatus.FINISHED
        ? 'Ronda terminada'
        : `Turno de ${currentTurn?.displayName ?? 'la mesa'}`,
    summary: match.lastActionSummary ?? 'Mesa sincronizada.',
    ruleHint: buildRuleHint({
      mySeat,
      currentTurn,
      match,
      state,
    }),
    hand:
      mySeat?.cards.map((card) => ({
        id: card.id,
        suit: card.suit,
        rank: card.rank,
        label: card.label,
      })) ?? [],
    playableCardIds,
    tableCards: state.tableCards.map((entry) => ({
      seat: entry.seat,
      playerName: entry.displayName,
      card: {
        id: entry.card.id,
        suit: entry.card.suit,
        rank: entry.card.rank,
        label: entry.card.label,
      },
    })),
    tableMessages,
    seats: state.seats
      .map((seat) => ({
        seat: seat.seat,
        name: seat.displayName,
        avatar: seat.avatarSeed,
        score: seat.score,
        roundPoints: seat.roundPoints,
        tricksWon: seat.tricksWon,
        cardsRemaining: seat.cards.length,
        isBot: seat.isBot,
        isMe: seat.userId === currentUser.id,
        isConnected: seat.connected,
        isTurn: seat.seat === match.turnSeat && match.status !== GameMatchStatus.FINISHED,
        position: SEAT_POSITIONS[seat.seat] ?? 'bottom',
        statusLabel:
          !seat.connected
            ? 'Desconectado'
            : seat.seat === match.turnSeat && match.status !== GameMatchStatus.FINISHED
              ? seat.userId === currentUser.id
                ? 'Tu turno'
                : 'En turno'
            : `${seat.tricksWon} bazas • ${seat.roundPoints} pts`,
      }))
      .sort(seatSort),
    standings: [...state.seats]
      .sort((left, right) => left.score - right.score)
      .map((seat) => ({
        seat: seat.seat,
        name: seat.displayName,
        score: seat.score,
        roundPoints: seat.roundPoints,
        tricksWon: seat.tricksWon,
        isMe: seat.userId === currentUser.id,
      })),
    recentEvents: events.map((event) => ({
      id: event.id,
      type: event.eventType,
      summary: event.summary,
      createdAt: formatEventClock(event.createdAt),
    })),
    controls: settings,
  }
}

export async function playCurrentUserCard(roomId: string, cardId: string): Promise<MatchMutationResult> {
  const [{ room, match }, currentUser] = await Promise.all([getReadyMatch(roomId), getCurrentUserRecord()])
  const state = parseState(match.statePayload)
  const settings = parseSettings(match.settingsPayload)
  const currentSeat = state.seats.find((seat) => seat.userId === currentUser.id)

  if (!currentSeat) {
    throw new Error('Tu perfil no esta sentado en esta mesa.')
  }

  if (match.status === GameMatchStatus.FINISHED) {
    throw new Error('La ronda ya termino. Reinicia para jugar otra mano.')
  }

  if (currentSeat.seat !== match.turnSeat) {
    throw new Error('Aun no es tu turno.')
  }

  const result = applyCardPlay({
    state,
    turnSeat: match.turnSeat,
    leadSuit: match.leadSuit,
    crownsReleased: match.crownsReleased,
    trickNumber: match.trickNumber,
    cardId,
  })

  await persistMatchState({
    matchId: match.id,
    roomId: room.id,
    status: result.status,
    roundNumber: match.roundNumber,
    trickNumber: result.trickNumber,
    turnSeat: result.turnSeat,
    leadSuit: result.leadSuit,
    crownsReleased: result.crownsReleased,
    lastWinnerSeat: result.lastWinnerSeat,
    lastActionSummary: result.summary,
    state: {
      seats: result.seats,
      tableCards: result.tableCards,
      trickHistory: result.trickHistory,
    },
    settings,
  })

  await appendMatchEvent(match.id, {
    actorUserId: currentUser.id,
    eventType: result.tableCards.length === 0 ? 'TRICK_RESOLVED' : 'CARD_PLAYED',
    summary: result.summary,
    payload: stringifyState({
      cardId,
      seat: currentSeat.seat,
    }),
  })

  await autoPlayBots(match.id, room.id)

  const readyMatch = await db.gameMatch.findUnique({
    where: {
      id: match.id,
    },
  })

  return {
    matchId: readyMatch?.id ?? match.id,
    roomId: room.id,
    summary: readyMatch?.lastActionSummary ?? result.summary,
  }
}

export async function updateGameControl(params: {
  roomId: string
  action: GameControlAction
  value?: number
}) {
  const { room, match } = await getReadyMatch(params.roomId)
  let settings = parseSettings(match.settingsPayload)
  let state = parseState(match.statePayload)
  let nextStatus = match.status
  let roundNumber = match.roundNumber
  let trickNumber = match.trickNumber
  let turnSeat = match.turnSeat
  let leadSuit = match.leadSuit
  let crownsReleased = match.crownsReleased
  let lastWinnerSeat = match.lastWinnerSeat
  let summary = match.lastActionSummary ?? 'Mesa actualizada.'

  if (params.action === 'toggle-voice') {
    settings = {
      ...settings,
      voiceEnabled: !settings.voiceEnabled,
    }
    summary = settings.voiceEnabled ? 'Voz de sala activada.' : 'Voz de sala silenciada.'
  } else if (params.action === 'toggle-sound') {
    settings = {
      ...settings,
      soundEnabled: !settings.soundEnabled,
    }
    summary = settings.soundEnabled ? 'Audio de efectos activado.' : 'Audio de efectos silenciado.'
  } else if (params.action === 'toggle-chat') {
    settings = {
      ...settings,
      tableChatEnabled: !settings.tableChatEnabled,
    }
    summary = settings.tableChatEnabled ? 'Chat de mesa activado.' : 'Chat de mesa pausado.'
  } else if (params.action === 'toggle-dark-mode') {
    settings = {
      ...settings,
      darkMode: !settings.darkMode,
    }
    summary = settings.darkMode ? 'Modo oscuro de mesa activo.' : 'Modo claro experimental activo.'
  } else if (params.action === 'set-table-zoom') {
    settings = {
      ...settings,
      tableZoom: clampNumber(params.value ?? settings.tableZoom, 60, 110),
    }
    summary = `Zoom de mesa ajustado a ${settings.tableZoom}%.`
  } else if (params.action === 'set-card-scale') {
    settings = {
      ...settings,
      cardScale: clampNumber(params.value ?? settings.cardScale, 50, 110),
    }
    summary = `Escala de cartas ajustada a ${settings.cardScale}%.`
  } else if (params.action === 'reset-round') {
    const nextRound = createRoundState(room, match.roundNumber + 1, state.seats)
    state = nextRound.state
    nextStatus = GameMatchStatus.ACTIVE
    roundNumber = match.roundNumber + 1
    trickNumber = nextRound.trickNumber
    turnSeat = nextRound.turnSeat
    leadSuit = nextRound.leadSuit
    crownsReleased = nextRound.crownsReleased
    lastWinnerSeat = null
    summary = `Nueva ronda lista. Turno de ${state.seats.find((seat) => seat.seat === nextRound.turnSeat)?.displayName ?? 'la mesa'}.`
  }

  await persistMatchState({
    matchId: match.id,
    roomId: room.id,
    status: nextStatus,
    roundNumber,
    trickNumber,
    turnSeat,
    leadSuit,
    crownsReleased,
    lastWinnerSeat,
    lastActionSummary: summary,
    state,
    settings,
  })

  await appendMatchEvent(match.id, {
    eventType: params.action.toUpperCase().replace(/-/g, '_'),
    summary,
  })

  if (params.action === 'reset-round') {
    await autoPlayBots(match.id, room.id)
  }

  return {
    matchId: match.id,
    roomId: room.id,
    summary,
  }
}
