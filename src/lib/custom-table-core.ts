import { GameMatchStatus, RoomType, RoomVisibility } from '@prisma/client'
import { AuthRequiredError, requireAuthSession } from '@/lib/auth'
import type { ChatMessageSnapshot, GameCardSnapshot, GameSnapshot } from '@/lib/app-types'
import { db } from '@/lib/db'
import {
  buildDeckForTable,
  createCustomTableConfig,
  dealCards,
  deckModules,
  customTableMode,
  applyEffectTrigger,
  getNextSeatIndex,
  type AppliedEffectTrigger,
  type CardDefinition,
  type DealResult,
  type DeckModuleEffectAction,
  type DeckModuleEffect,
  type PlayerSeat,
} from '@/lib/game-engine'
import { getRoomGameMode } from '@/lib/game-mode-utils'

const MAX_CUSTOM_EVENTS = 16
const CUSTOM_SCORING = customTableMode.scoringStrategy
const BOT_POOL = [
  { name: 'MiaBot', avatarSeed: 'miabot', connected: true },
  { name: 'RexBot', avatarSeed: 'rexbot', connected: true },
  { name: 'NovaBot', avatarSeed: 'novabot', connected: true },
  { name: 'KiraBot', avatarSeed: 'kirabot', connected: true },
  { name: 'AxelBot', avatarSeed: 'axelbot', connected: true },
  { name: 'OrionBot', avatarSeed: 'orionbot', connected: true },
  { name: 'VegaBot', avatarSeed: 'vegabot', connected: true },
] as const

interface CustomTableSeatState {
  seatIndex: number
  playerId: string
  userId: string | null
  displayName: string
  avatarSeed: string
  isBot: boolean
  connected: boolean
  cards: CardDefinition[]
  blockedCardIds: string[]
  protectedPoints: number
  score: number
  roundPoints: number
  tricksWon: number
}

interface CustomPlayedCardState {
  seatIndex: number
  playerId: string
  displayName: string
  card: CardDefinition
}

interface CustomTableEventState {
  trickNumber: number
  winnerSeat: number
  points: number
  cards: CustomPlayedCardState[]
  summary: string
}

interface CustomEffectLogState {
  id: string
  type: DeckModuleEffectAction['type'] | 'score'
  effectId: string
  effectName: string
  cardId: string
  actorSeat: number
  targetSeat?: number
  summary: string
}

interface CustomTableState {
  schemaVersion: 1
  modeId: 'custom-table'
  seats: CustomTableSeatState[]
  tableCards: CustomPlayedCardState[]
  trickHistory: CustomTableEventState[]
  effectLog: CustomEffectLogState[]
  deck: {
    totalCards: number
    modules: Array<{
      id: string
      name: string
      type: string
      themeColor: string
      cards: number
      effects: Array<{
        id: string
        name: string
        description: string
        trigger: DeckModuleEffect['trigger']
        scoreModifier?: number
        actions?: DeckModuleEffectAction[]
        priority: number
      }>
    }>
    automaticModuleIds: string[]
    manualModuleIds: string[]
  }
  deal: {
    cardsPerPlayer: number
    leftoverCount: number
    pot: CardDefinition[]
    discarded: CardDefinition[]
    undealt: CardDefinition[]
  }
}

interface CustomSettingsState {
  voiceEnabled: boolean
  soundEnabled: boolean
  tableChatEnabled: boolean
  darkMode: boolean
  tableZoom: number
  cardScale: number
}

interface CustomMutationResult {
  matchId: string
  roomId: string
  summary: string
}

type CustomControlAction =
  | 'toggle-voice'
  | 'toggle-sound'
  | 'toggle-chat'
  | 'toggle-dark-mode'
  | 'set-table-zoom'
  | 'set-card-scale'
  | 'reset-round'

const defaultSettings: CustomSettingsState = {
  voiceEnabled: true,
  soundEnabled: true,
  tableChatEnabled: true,
  darkMode: true,
  tableZoom: 82,
  cardScale: 72,
}

function stringifyState(value: unknown) {
  return JSON.stringify(value)
}

function parseState(payload: string): CustomTableState {
  const parsed = JSON.parse(payload) as CustomTableState

  return {
    ...parsed,
    schemaVersion: 1,
    modeId: 'custom-table',
    seats: (parsed.seats ?? []).map((seat) => ({
      ...seat,
      cards: seat.cards ?? [],
      blockedCardIds: seat.blockedCardIds ?? [],
      protectedPoints: typeof seat.protectedPoints === 'number' ? seat.protectedPoints : 0,
      score: typeof seat.score === 'number' ? seat.score : 0,
      roundPoints: typeof seat.roundPoints === 'number' ? seat.roundPoints : 0,
      tricksWon: typeof seat.tricksWon === 'number' ? seat.tricksWon : 0,
      connected: seat.connected ?? true,
    })),
    tableCards: parsed.tableCards ?? [],
    trickHistory: parsed.trickHistory ?? [],
    effectLog: parsed.effectLog ?? [],
    deck: parsed.deck,
    deal: parsed.deal,
  }
}

function parseSettings(payload: string): CustomSettingsState {
  const parsed = JSON.parse(payload) as Partial<CustomSettingsState>

  return {
    ...defaultSettings,
    ...parsed,
  }
}

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.round(value)))
}

function formatClock(date: Date) {
  return new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatCard(card: CardDefinition) {
  if (card.element) {
    return `${card.name}`
  }

  const suitIcon = {
    crowns: '♥',
    diamonds: '♦',
    clubs: '♣',
    spades: '♠',
  }[card.suit ?? 'clubs']

  return `${card.label}${suitIcon}`
}

function mapStatus(status: GameMatchStatus): GameSnapshot['status'] {
  if (status === GameMatchStatus.FINISHED) return 'finished'
  if (status === GameMatchStatus.WAITING) return 'waiting'
  return 'active'
}

function mapCard(card: CardDefinition): GameCardSnapshot {
  return {
    id: card.id,
    suit: card.suit as GameCardSnapshot['suit'],
    element: card.element,
    moduleId: card.moduleId,
    type: card.type,
    rank: card.rank ?? card.value ?? 0,
    label: card.label,
    name: card.name,
    themeColor: card.visual.themeColor,
    accentColor: card.visual.accentColor,
  }
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

async function getCustomRoomRecord(roomId?: string) {
  const include = {
    messages: {
      include: {
        user: true,
      },
      orderBy: {
        createdAt: 'asc' as const,
      },
    },
    memberships: {
      include: {
        user: true,
      },
      orderBy: {
        seatOrder: 'asc' as const,
      },
    },
  }

  const room = roomId
    ? await db.room.findUnique({
        where: { id: roomId },
        include,
      })
    : await db.room.findFirst({
        where: {
          type: RoomType.GAME,
          maxPlayers: {
            gt: 4,
          },
        },
        include,
        orderBy: [{ featured: 'desc' }, { lastActivityAt: 'desc' }],
      })

  if (!room) {
    throw new Error('No se encontro la mesa custom.')
  }

  if (room.type !== RoomType.GAME) {
    throw new Error('La sala seleccionada no es una mesa de juego.')
  }

  if (getRoomGameMode(room) !== 'custom-table') {
    throw new Error('La sala seleccionada no es una mesa custom.')
  }

  return room
}

function toPlayerSeat(seat: CustomTableSeatState): PlayerSeat {
  return {
    seatIndex: seat.seatIndex,
    playerId: seat.playerId,
    displayName: seat.displayName,
    status: seat.connected ? (seat.isBot ? 'bot' : 'occupied') : 'disconnected',
    isHost: false,
    isBot: seat.isBot,
  }
}

function buildSeatBlueprints(room: Awaited<ReturnType<typeof getCustomRoomRecord>>) {
  const usedSeats = new Set<number>()
  const seats: Omit<
    CustomTableSeatState,
    'cards' | 'blockedCardIds' | 'protectedPoints' | 'score' | 'roundPoints' | 'tricksWon'
  >[] = []
  const targetSeats = Math.max(5, Math.min(10, room.maxPlayers))

  for (const membership of room.memberships) {
    let seatIndex = membership.seatOrder

    if (seatIndex < 0 || seatIndex >= targetSeats || usedSeats.has(seatIndex)) {
      seatIndex = Array.from({ length: targetSeats }, (_, index) => index).find((index) => !usedSeats.has(index)) ?? seats.length
    }

    if (seatIndex >= targetSeats) {
      continue
    }

    usedSeats.add(seatIndex)
    seats.push({
      seatIndex,
      playerId: membership.userId,
      userId: membership.userId,
      displayName: membership.user.name,
      avatarSeed: membership.user.avatarSeed,
      isBot: false,
      connected: true,
    })
  }

  let botIndex = 0

  while (seats.length < targetSeats) {
    const seatIndex = Array.from({ length: targetSeats }, (_, index) => index).find((index) => !usedSeats.has(index))

    if (seatIndex == null) {
      break
    }

    const bot = BOT_POOL[botIndex % BOT_POOL.length]
    usedSeats.add(seatIndex)
    seats.push({
      seatIndex,
      playerId: `custom-bot-${room.id}-${seatIndex}`,
      userId: null,
      displayName: bot.name,
      avatarSeed: bot.avatarSeed,
      isBot: true,
      connected: bot.connected,
    })
    botIndex += 1
  }

  return seats.sort((left, right) => left.seatIndex - right.seatIndex)
}

function buildRoundState(
  room: Awaited<ReturnType<typeof getCustomRoomRecord>>,
  roundNumber: number,
  previousSeats?: Pick<CustomTableSeatState, 'playerId' | 'score'>[]
) {
  const seatBlueprints = buildSeatBlueprints(room)
  const tableConfig = createCustomTableConfig({
    id: room.id,
    name: room.name,
    targetPlayers: seatBlueprints.length,
  })
  const builtDeck = buildDeckForTable({
    tableConfig,
    playerCount: seatBlueprints.length,
  })
  const deal = dealCards({
    players: seatBlueprints.map((seat) => ({
      seatIndex: seat.seatIndex,
      playerId: seat.playerId,
      displayName: seat.displayName,
      status: seat.isBot ? 'bot' : 'occupied',
      isHost: room.hostUserId === seat.userId,
      isBot: seat.isBot,
    })),
    deck: builtDeck.cards,
    strategy: tableConfig.dealStrategy,
    seedSource: `${room.id}:custom:${roundNumber}`,
  })
  const scoreByPlayerId = new Map(previousSeats?.map((seat) => [seat.playerId, seat.score]) ?? [])
  const seats: CustomTableSeatState[] = seatBlueprints.map((seat) => ({
    ...seat,
    cards: deal.hands[seat.playerId] ?? [],
    blockedCardIds: [],
    protectedPoints: 0,
    score: scoreByPlayerId.get(seat.playerId) ?? 0,
    roundPoints: 0,
    tricksWon: 0,
  }))

  return {
    turnSeat: seats[0]?.seatIndex ?? 0,
    trickNumber: 1,
    state: {
      schemaVersion: 1,
      modeId: 'custom-table',
      seats,
      tableCards: [],
      trickHistory: [],
      effectLog: [],
      deck: {
        totalCards: builtDeck.totalCards,
        modules: builtDeck.modules.map((module) => ({
          id: module.id,
          name: module.name,
          type: module.type,
          themeColor: module.themeColor,
          cards: module.cards.length,
          effects: module.effects,
        })),
        automaticModuleIds: builtDeck.source.automaticModuleIds,
        manualModuleIds: builtDeck.source.manualModuleIds,
      },
      deal: {
        cardsPerPlayer: deal.cardsPerPlayer,
        leftoverCount: deal.leftoverCount,
        pot: deal.pot,
        discarded: deal.discarded,
        undealt: deal.undealt,
      },
    } satisfies CustomTableState,
  }
}

async function appendMatchEvent(
  gameMatchId: string,
  event: {
    actorUserId?: string | null
    eventType: string
    summary: string
    payload?: string
  }
) {
  return db.gameMatchEvent.create({
    data: {
      gameMatchId,
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
  status: GameMatchStatus
  roundNumber: number
  trickNumber: number
  turnSeat: number
  lastWinnerSeat?: number | null
  lastActionSummary: string
  state: CustomTableState
  settings: CustomSettingsState
}) {
  const [match] = await db.$transaction([
    db.gameMatch.update({
      where: {
        id: params.matchId,
      },
      data: {
        status: params.status,
        roundNumber: params.roundNumber,
        trickNumber: params.trickNumber,
        turnSeat: params.turnSeat,
        leadSuit: null,
        crownsReleased: false,
        lastWinnerSeat: params.lastWinnerSeat ?? null,
        lastActionSummary: params.lastActionSummary,
        statePayload: stringifyState(params.state),
        settingsPayload: stringifyState(params.settings),
      },
    }),
    db.room.update({
      where: {
        id: params.roomId,
      },
      data: {
        lastMessagePreview: params.lastActionSummary,
        lastActivityAt: new Date(),
      },
    }),
  ])

  return match
}

async function ensureCurrentUserMembership(roomId?: string) {
  if (!roomId) {
    return
  }

  const [currentUser, room] = await Promise.all([getCurrentUserRecord(), getCustomRoomRecord(roomId)])

  if (room.memberships.some((membership) => membership.userId === currentUser.id)) {
    return
  }

  if (room.visibility === RoomVisibility.PRIVATE) {
    throw new Error('Necesitas unirte con el codigo privado para entrar a esta sala.')
  }

  if (room.currentPlayers >= room.maxPlayers) {
    throw new Error('La sala ya esta llena. Prueba con otra mesa disponible.')
  }

  const usedSeats = new Set(room.memberships.map((membership) => membership.seatOrder))
  const nextSeat = Array.from({ length: room.maxPlayers }, (_, index) => index).find((seat) => !usedSeats.has(seat))

  if (nextSeat == null) {
    throw new Error('No se encontro un asiento libre para entrar a la mesa custom.')
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
        lastMessagePreview: `${currentUser.name} se unio a la mesa custom.`,
        lastActivityAt: new Date(),
      },
    }),
    db.message.create({
      data: {
        roomId: room.id,
        userId: currentUser.id,
        content: `${currentUser.name} se unio a la mesa custom.`,
      },
    }),
  ])

  const match = await db.gameMatch.findUnique({
    where: {
      roomId: room.id,
    },
  })

  if (!match) {
    return
  }

  const refreshedRoom = await getCustomRoomRecord(room.id)
  const previousState = parseState(match.statePayload)
  const settings = parseSettings(match.settingsPayload)
  const nextRound = buildRoundState(refreshedRoom, match.roundNumber + 1, previousState.seats)
  const summary = `${currentUser.name} entro a la mesa custom. Nueva ronda lista.`

  await persistMatchState({
    matchId: match.id,
    roomId: room.id,
    status: GameMatchStatus.ACTIVE,
    roundNumber: match.roundNumber + 1,
    trickNumber: nextRound.trickNumber,
    turnSeat: nextRound.turnSeat,
    lastActionSummary: summary,
    state: nextRound.state,
    settings,
  })

  await appendMatchEvent(match.id, {
    actorUserId: currentUser.id,
    eventType: 'CUSTOM_PLAYER_JOINED',
    summary,
  })
}

export async function ensureCustomTableMatchForRoom(roomId?: string) {
  const room = await getCustomRoomRecord(roomId)
  const existing = await db.gameMatch.findUnique({
    where: {
      roomId: room.id,
    },
  })

  if (existing) {
    return existing
  }

  const round = buildRoundState(room, 1)
  const match = await db.gameMatch.create({
    data: {
      roomId: room.id,
      status: GameMatchStatus.ACTIVE,
      roundNumber: 1,
      trickNumber: round.trickNumber,
      turnSeat: round.turnSeat,
      leadSuit: null,
      crownsReleased: false,
      statePayload: stringifyState(round.state),
      settingsPayload: stringifyState(defaultSettings),
      lastActionSummary: `Mesa custom lista. ${round.state.seats.length} asientos dinamicos y ${round.state.deck.totalCards} cartas.`,
    },
  })

  await appendMatchEvent(match.id, {
    eventType: 'CUSTOM_ROUND_READY',
    summary: match.lastActionSummary ?? 'Mesa custom lista.',
    payload: stringifyState({
      modeId: 'custom-table',
      modules: round.state.deck.modules.map((module) => module.id),
      cards: round.state.deck.totalCards,
    }),
  })

  return match
}

function getWinnerSeat(tableCards: CustomPlayedCardState[]) {
  const winner = tableCards.reduce((best, current) => {
    const bestValue = best.card.value ?? best.card.rank ?? 0
    const currentValue = current.card.value ?? current.card.rank ?? 0
    return currentValue > bestValue ? current : best
  }, tableCards[0])

  return winner.seatIndex
}

function getPlayableCardIdsForSeat(seat?: Pick<CustomTableSeatState, 'cards' | 'blockedCardIds'> | null) {
  if (!seat) {
    return []
  }

  const blockedIds = new Set(seat.blockedCardIds ?? [])
  const unblockedCards = seat.cards.filter((card) => !blockedIds.has(card.id))
  const playableCards = unblockedCards.length > 0 ? unblockedCards : seat.cards
  return playableCards.map((card) => card.id)
}

function getNextOccupiedSeatIndex(seats: CustomTableSeatState[], currentSeatIndex: number) {
  return getNextSeatIndex({
    seats: seats.map(toPlayerSeat),
    currentSeatIndex,
    strategy: {
      id: 'custom-dynamic-clockwise',
      mode: 'clockwise',
      startRule: 'first-seat',
    },
  })
}

function advanceTurnSeat(seats: CustomTableSeatState[], currentSeatIndex: number, steps: number) {
  let nextSeatIndex = currentSeatIndex

  for (let index = 0; index < steps; index += 1) {
    nextSeatIndex = getNextOccupiedSeatIndex(seats, nextSeatIndex) ?? nextSeatIndex
  }

  return nextSeatIndex
}

function findStrongestUnblockedCard(seat: CustomTableSeatState) {
  const blockedIds = new Set(seat.blockedCardIds)
  const candidates = seat.cards.filter((card) => !blockedIds.has(card.id))

  if (candidates.length <= 1) {
    return null
  }

  return candidates.reduce<CardDefinition | null>((best, card) => {
    if (!best) {
      return card
    }

    const bestValue = best.value ?? best.rank ?? 0
    const cardValue = card.value ?? card.rank ?? 0
    return cardValue > bestValue ? card : best
  }, null)
}

function createEffectLog(params: {
  type: CustomEffectLogState['type']
  effectId: string
  effectName: string
  cardId: string
  actorSeat: number
  targetSeat?: number
  summary: string
}): CustomEffectLogState {
  return {
    id: `${params.cardId}-${params.effectId}-${params.type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    ...params,
  }
}

function resolvePlayedCardEffect(params: {
  entry: CustomPlayedCardState
  tableCards: CustomPlayedCardState[]
  playerCount: number
  trigger?: DeckModuleEffect['trigger']
}) {
  const baseValue = params.entry.card.rules?.scoreValue ?? params.entry.card.value ?? 1
  const activeModule = deckModules.find((module) => module.id === params.entry.card.moduleId)

  return applyEffectTrigger({
    card: params.entry.card,
    modules: deckModules,
    trigger: params.trigger ?? 'on-score',
    baseScore: baseValue,
    minScore: 0,
    context: {
      gameMode: 'custom-table',
      player: {
        id: params.entry.playerId,
        seatIndex: params.entry.seatIndex,
        displayName: params.entry.displayName,
      },
      trick: {
        tableCardCount: params.tableCards.length,
        playedCardIds: params.tableCards.map((playedCard) => playedCard.card.id),
      },
      table: {
        modeId: 'custom-table',
        playerCount: params.playerCount,
      },
      activeModule: activeModule
        ? {
            id: activeModule.id,
            name: activeModule.name,
            type: activeModule.type,
            element: params.entry.card.element,
          }
        : undefined,
    },
  })
}

function applyResolvedEffectActions(params: {
  result: AppliedEffectTrigger
  actor: CustomTableSeatState
  seats: CustomTableSeatState[]
  deal: CustomTableState['deal']
  card: CardDefinition
}) {
  const logs: CustomEffectLogState[] = []
  let turnShift = 0

  for (const effect of params.result.effects) {
    if (effect.effect.scoreModifier) {
      logs.push(
        createEffectLog({
          type: 'score',
          effectId: effect.effect.id,
          effectName: effect.effect.name,
          cardId: params.card.id,
          actorSeat: params.actor.seatIndex,
          summary: `${effect.effect.name}: ${formatCard(params.card)} cambia ${params.result.baseScore} -> ${params.result.score} pts.`,
        })
      )
    }

    for (const action of effect.effect.actions ?? []) {
      if (action.type === 'draw-card') {
        const drawCount = Math.max(1, action.value ?? 1)
        const drawnCards = params.deal.pot.splice(0, drawCount)

        if (!drawnCards.length) {
          drawnCards.push(...params.deal.undealt.splice(0, drawCount))
        }

        if (drawnCards.length > 0) {
          params.actor.cards.push(...drawnCards)
          logs.push(
            createEffectLog({
              type: action.type,
              effectId: effect.effect.id,
              effectName: action.label,
              cardId: params.card.id,
              actorSeat: params.actor.seatIndex,
              summary: `${action.label}: ${params.actor.displayName} roba ${drawnCards.length} carta(s).`,
            })
          )
        } else {
          logs.push(
            createEffectLog({
              type: action.type,
              effectId: effect.effect.id,
              effectName: action.label,
              cardId: params.card.id,
              actorSeat: params.actor.seatIndex,
              summary: `${action.label}: no habia cartas disponibles para robar.`,
            })
          )
        }
      }

      if (action.type === 'block-card') {
        const targetSeatIndex = getNextOccupiedSeatIndex(params.seats, params.actor.seatIndex)
        const targetSeat = params.seats.find((seat) => seat.seatIndex === targetSeatIndex)
        const targetCard = targetSeat ? findStrongestUnblockedCard(targetSeat) : null

        if (targetSeat && targetCard) {
          targetSeat.blockedCardIds = Array.from(new Set([...targetSeat.blockedCardIds, targetCard.id]))
          logs.push(
            createEffectLog({
              type: action.type,
              effectId: effect.effect.id,
              effectName: action.label,
              cardId: params.card.id,
              actorSeat: params.actor.seatIndex,
              targetSeat: targetSeat.seatIndex,
              summary: `${action.label}: ${formatCard(targetCard)} queda bloqueada para ${targetSeat.displayName}.`,
            })
          )
        } else if (targetSeat) {
          logs.push(
            createEffectLog({
              type: action.type,
              effectId: effect.effect.id,
              effectName: action.label,
              cardId: params.card.id,
              actorSeat: params.actor.seatIndex,
              targetSeat: targetSeat.seatIndex,
              summary: `${action.label}: ${targetSeat.displayName} no tiene suficientes cartas libres para bloquear sin cortar la partida.`,
            })
          )
        }
      }

      if (action.type === 'shift-turn') {
        turnShift += Math.max(1, action.value ?? 1)
        logs.push(
          createEffectLog({
            type: action.type,
            effectId: effect.effect.id,
            effectName: action.label,
            cardId: params.card.id,
            actorSeat: params.actor.seatIndex,
            summary: `${action.label}: el orden de turno avanza ${turnShift} asiento(s) extra.`,
          })
        )
      }

      if (action.type === 'protect-points') {
        const shieldValue = Math.max(1, action.value ?? 1)
        params.actor.protectedPoints += shieldValue
        logs.push(
          createEffectLog({
            type: action.type,
            effectId: effect.effect.id,
            effectName: action.label,
            cardId: params.card.id,
            actorSeat: params.actor.seatIndex,
            summary: `${action.label}: ${params.actor.displayName} protege ${shieldValue} pts del siguiente choque recibido.`,
          })
        )
      }
    }
  }

  return {
    logs,
    turnShift,
  }
}

function getTrickPoints(tableCards: CustomPlayedCardState[]) {
  return tableCards.reduce((total, entry) => {
    const effectResult = resolvePlayedCardEffect({
      entry,
      tableCards,
      playerCount: tableCards.length,
    })
    return total + effectResult.score
  }, 0)
}

function applyCustomCardPlay(params: {
  state: CustomTableState
  turnSeat: number
  trickNumber: number
  cardId: string
}) {
  const seats = params.state.seats.map((seat) => ({
    ...seat,
    cards: [...seat.cards],
    blockedCardIds: [...seat.blockedCardIds],
  }))
  const deal: CustomTableState['deal'] = {
    ...params.state.deal,
    pot: [...params.state.deal.pot],
    discarded: [...params.state.deal.discarded],
    undealt: [...params.state.deal.undealt],
  }
  let tableCards = [...params.state.tableCards]
  const trickHistory = [...params.state.trickHistory]
  let effectLog = [...params.state.effectLog]
  const resolvedEffectLogs: CustomEffectLogState[] = []
  const seat = seats.find((entry) => entry.seatIndex === params.turnSeat)

  if (!seat) {
    throw new Error('No se encontro el asiento actual.')
  }

  const cardIndex = seat.cards.findIndex((card) => card.id === params.cardId)

  if (cardIndex < 0) {
    throw new Error('La carta no pertenece a la mano actual.')
  }

  const playableCardIds = getPlayableCardIdsForSeat(seat)

  if (!playableCardIds.includes(params.cardId)) {
    throw new Error('Esa carta esta bloqueada por un efecto activo. Juega otra carta.')
  }

  const [card] = seat.cards.splice(cardIndex, 1)
  seat.blockedCardIds = []
  tableCards.push({
    seatIndex: seat.seatIndex,
    playerId: seat.playerId,
    displayName: seat.displayName,
    card,
  })

  const playedEntry = tableCards[tableCards.length - 1]
  const effectResult = resolvePlayedCardEffect({
    entry: playedEntry,
    tableCards,
    playerCount: seats.length,
  })
  const actionResult = applyResolvedEffectActions({
    result: effectResult,
    actor: seat,
    seats,
    deal,
    card,
  })
  resolvedEffectLogs.push(...actionResult.logs)

  const nextSeatIndex = getNextOccupiedSeatIndex(seats, seat.seatIndex)
  let status: GameMatchStatus = GameMatchStatus.ACTIVE
  let turnSeat =
    actionResult.turnShift > 0
      ? advanceTurnSeat(seats, nextSeatIndex ?? seat.seatIndex, actionResult.turnShift)
      : nextSeatIndex ?? seat.seatIndex
  let trickNumber = params.trickNumber
  let lastWinnerSeat: number | null = null
  let summary = `${seat.displayName} jugo ${formatCard(card)}.`

  if (tableCards.length >= seats.length) {
    const winnerSeat = getWinnerSeat(tableCards)
    const trickPoints = getTrickPoints(tableCards)
    const winner = seats.find((entry) => entry.seatIndex === winnerSeat)

    if (!winner) {
      throw new Error('No se pudo resolver la mano custom.')
    }

    const protectedPoints = Math.min(winner.protectedPoints, trickPoints)
    const scoredPoints = Math.max(0, trickPoints - protectedPoints)
    winner.protectedPoints = Math.max(0, winner.protectedPoints - protectedPoints)
    winner.score += scoredPoints
    winner.roundPoints += scoredPoints
    winner.tricksWon += 1
    summary =
      protectedPoints > 0
        ? `${winner.displayName} controla el choque ${trickNumber} y recibe ${scoredPoints} de presion. Escudo absorbe ${protectedPoints}.`
        : `${winner.displayName} controla el choque ${trickNumber} y recibe ${trickPoints} de presion.`

    if (protectedPoints > 0) {
      resolvedEffectLogs.push(
        createEffectLog({
          type: 'protect-points',
          effectId: 'protected-points-consumed',
          effectName: 'Proteccion consumida',
          cardId: tableCards.find((entry) => entry.seatIndex === winnerSeat)?.card.id ?? card.id,
          actorSeat: winnerSeat,
          summary: `Proteccion consumida: ${winner.displayName} absorbe ${protectedPoints} de presion del choque.`,
        })
      )
    }

    trickHistory.unshift({
      trickNumber,
      winnerSeat,
      points: scoredPoints,
      cards: tableCards,
      summary,
    })
    trickHistory.splice(MAX_CUSTOM_EVENTS)
    tableCards = []
    turnSeat = winnerSeat
    lastWinnerSeat = winnerSeat
    trickNumber += 1
  }

  effectLog = [...resolvedEffectLogs, ...effectLog].slice(0, MAX_CUSTOM_EVENTS)

  if (seats.every((entry) => entry.cards.length === 0)) {
    status = GameMatchStatus.FINISHED
    const standings = [...seats].sort((left, right) => left.score - right.score)
    summary = `Ronda custom completa. ${standings[0]?.displayName ?? 'Mesa'} lidera con menor presion: ${standings[0]?.score ?? 0}.`
  }

  return {
    status,
    turnSeat,
    trickNumber,
    lastWinnerSeat,
    summary,
    state: {
      ...params.state,
      seats,
      tableCards,
      trickHistory,
      effectLog,
      deal,
    } satisfies CustomTableState,
    effectLogs: resolvedEffectLogs,
  }
}

export async function getCustomTableSnapshot(roomId?: string): Promise<GameSnapshot> {
  await ensureCurrentUserMembership(roomId)
  const room = await getCustomRoomRecord(roomId)
  await ensureCustomTableMatchForRoom(room.id)

  const [currentUser, match] = await Promise.all([
    getCurrentUserRecord(),
    db.gameMatch.findUnique({
      where: {
        roomId: room.id,
      },
      include: {
        events: {
          orderBy: {
            createdAt: 'desc',
          },
          take: 10,
        },
      },
    }),
  ])

  if (!match) {
    throw new Error('No se encontro la partida custom.')
  }

  const state = parseState(match.statePayload)
  const settings = parseSettings(match.settingsPayload)
  const mySeat = state.seats.find((seat) => seat.userId === currentUser.id)
  const currentTurn = state.seats.find((seat) => seat.seatIndex === match.turnSeat)
  const canPlay = Boolean(mySeat && currentTurn?.seatIndex === mySeat.seatIndex && match.status !== GameMatchStatus.FINISHED)
  const playableCardIds = canPlay ? getPlayableCardIdsForSeat(mySeat) : []
  const blockedCardIds = new Set(mySeat?.blockedCardIds ?? [])
  const tableMessages: ChatMessageSnapshot[] = room.messages.slice(-10).map((message) => ({
    id: message.id,
    roomId: room.id,
    user: {
      name: message.user.id === currentUser.id ? 'Yo' : message.user.name,
      avatar: message.user.avatarSeed,
      isMe: message.userId === currentUser.id,
    },
    content: message.content,
    timestamp: formatClock(message.createdAt),
  }))

  return {
    tableMode: 'custom-table',
    tableModeLabel: 'Mesa custom',
    matchId: match.id,
    roomId: room.id,
    roomName: room.name,
    status: mapStatus(match.status),
    roundNumber: match.roundNumber,
    trickNumber: match.trickNumber,
    crownsReleased: false,
    leadSuit: null,
    currentTurnSeat: match.turnSeat,
    currentTurnLabel: currentTurn
      ? currentTurn.userId === currentUser.id
        ? 'Tu turno'
        : `Turno de ${currentTurn.displayName}`
      : 'Turno pendiente',
    summary: match.lastActionSummary ?? 'Mesa custom sincronizada.',
    scoring: {
      id: CUSTOM_SCORING?.id ?? 'custom-table-pressure-scoring',
      mode: CUSTOM_SCORING?.mode ?? 'trick-based',
      pointPolarity: CUSTOM_SCORING?.pointPolarity,
      pointsLabel: CUSTOM_SCORING?.pointsLabel,
      summary: CUSTOM_SCORING?.summary,
      protectionRule: CUSTOM_SCORING?.protectionRule
        ? 'protect-points absorbe presion entrante al resolver el choque y se consume hasta el valor protegido.'
        : undefined,
    },
    playerEffects: {
      blockedCardIds: mySeat?.blockedCardIds ?? [],
      blockedCards: mySeat?.blockedCardIds.length ?? 0,
      protectedPoints: mySeat?.protectedPoints ?? 0,
    },
    ruleHint: canPlay
      ? 'Mesa custom: la carta mas alta controla el choque y recibe presion. Menor presion lidera.'
      : 'Espera a que el orden dinamico vuelva a tu asiento.',
    hand:
      mySeat?.cards.map((card) => ({
        ...mapCard(card),
        isBlocked: blockedCardIds.has(card.id),
      })) ?? [],
    playableCardIds,
    tableCards: state.tableCards.map((entry) => ({
      seat: entry.seatIndex,
      playerName: entry.displayName,
      card: mapCard(entry.card),
    })),
    tableMessages,
    seats: state.seats.map((seat) => ({
      seat: seat.seatIndex,
      name: seat.displayName,
      avatar: seat.avatarSeed,
      score: seat.score,
      roundPoints: seat.roundPoints,
      tricksWon: seat.tricksWon,
      cardsRemaining: seat.cards.length,
      isBot: seat.isBot,
      isMe: seat.userId === currentUser.id,
      isConnected: seat.connected,
      isTurn: seat.seatIndex === match.turnSeat && match.status !== GameMatchStatus.FINISHED,
      position: 'dynamic',
      angleDegrees: Math.round((360 / state.seats.length) * seat.seatIndex - 90),
      blockedCards: seat.blockedCardIds.length,
      protectedPoints: seat.protectedPoints,
      statusLabel:
        !seat.connected
          ? 'Reconectando'
          : seat.seatIndex === match.turnSeat && match.status !== GameMatchStatus.FINISHED
            ? seat.userId === currentUser.id
              ? 'Tu turno'
              : 'En turno'
            : seat.blockedCardIds.length > 0
              ? `${seat.blockedCardIds.length} carta bloqueada`
            : seat.protectedPoints > 0
                ? `Escudo ${seat.protectedPoints} presion`
                : `${seat.tricksWon} choques - ${seat.roundPoints} presion`,
    })),
    standings: [...state.seats]
      .sort((left, right) => left.score - right.score)
      .map((seat) => ({
        seat: seat.seatIndex,
        name: seat.displayName,
        score: seat.score,
        roundPoints: seat.roundPoints,
        tricksWon: seat.tricksWon,
        isMe: seat.userId === currentUser.id,
      })),
    recentEvents: match.events.map((event) => ({
      id: event.id,
      type: event.eventType,
      summary: event.summary,
      createdAt: formatClock(event.createdAt),
    })),
    effectHistory: state.effectLog.map((entry) => ({
      id: entry.id,
      type: entry.type,
      effectId: entry.effectId,
      effectName: entry.effectName,
      cardId: entry.cardId,
      actorSeat: entry.actorSeat,
      targetSeat: entry.targetSeat,
      summary: entry.summary,
    })),
    controls: settings,
    deck: {
      totalCards: state.deck.totalCards,
      cardsPerPlayer: state.deal.cardsPerPlayer,
      leftoverCount: state.deal.leftoverCount,
      modules: state.deck.modules,
    },
  }
}

export async function playCustomTableCard(roomId: string, cardId: string): Promise<CustomMutationResult> {
  const room = await getCustomRoomRecord(roomId)
  const currentUser = await getCurrentUserRecord()
  await ensureCustomTableMatchForRoom(room.id)

  const match = await db.gameMatch.findUnique({
    where: {
      roomId: room.id,
    },
  })

  if (!match) {
    throw new Error('No se encontro la partida custom.')
  }

  if (match.status === GameMatchStatus.FINISHED) {
    throw new Error('La ronda custom termino. Reinicia la mesa para seguir.')
  }

  const settings = parseSettings(match.settingsPayload)
  const state = parseState(match.statePayload)
  const currentSeat = state.seats.find((seat) => seat.userId === currentUser.id)

  if (!currentSeat) {
    throw new Error('Tu perfil no esta sentado en esta mesa custom.')
  }

  if (currentSeat.seatIndex !== match.turnSeat) {
    throw new Error('Aun no es tu turno.')
  }

  const result = applyCustomCardPlay({
    state,
    turnSeat: match.turnSeat,
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
    lastWinnerSeat: result.lastWinnerSeat,
    lastActionSummary: result.summary,
    state: result.state,
    settings,
  })

  await appendMatchEvent(match.id, {
    actorUserId: currentUser.id,
    eventType: result.state.tableCards.length === 0 ? 'CUSTOM_TRICK_RESOLVED' : 'CUSTOM_CARD_PLAYED',
    summary: result.summary,
    payload: stringifyState({
      cardId,
      seat: currentSeat.seatIndex,
    }),
  })

  for (const effectLog of result.effectLogs) {
    await appendMatchEvent(match.id, {
      actorUserId: currentUser.id,
      eventType: 'CUSTOM_EFFECT_RESOLVED',
      summary: effectLog.summary,
      payload: stringifyState(effectLog),
    })
  }

  return {
    matchId: match.id,
    roomId: room.id,
    summary: result.summary,
  }
}

export async function updateCustomTableControl(params: {
  roomId: string
  action: CustomControlAction
  value?: number
}): Promise<CustomMutationResult> {
  const room = await getCustomRoomRecord(params.roomId)
  const match = await ensureCustomTableMatchForRoom(room.id)
  let state = parseState(match.statePayload)
  let settings = parseSettings(match.settingsPayload)
  let status = match.status
  let trickNumber = match.trickNumber
  let turnSeat = match.turnSeat
  let summary = match.lastActionSummary ?? 'Mesa custom actualizada.'

  if (params.action === 'toggle-voice') {
    settings = { ...settings, voiceEnabled: !settings.voiceEnabled }
    summary = settings.voiceEnabled ? 'Voz activada.' : 'Voz silenciada.'
  } else if (params.action === 'toggle-sound') {
    settings = { ...settings, soundEnabled: !settings.soundEnabled }
    summary = settings.soundEnabled ? 'Efectos activados.' : 'Efectos silenciados.'
  } else if (params.action === 'toggle-chat') {
    settings = { ...settings, tableChatEnabled: !settings.tableChatEnabled }
    summary = settings.tableChatEnabled ? 'Chat de mesa activado.' : 'Chat de mesa pausado.'
  } else if (params.action === 'toggle-dark-mode') {
    settings = { ...settings, darkMode: !settings.darkMode }
    summary = settings.darkMode ? 'Modo oscuro activado.' : 'Modo claro activado.'
  } else if (params.action === 'set-table-zoom') {
    settings = { ...settings, tableZoom: clampNumber(params.value ?? settings.tableZoom, 60, 120) }
    summary = `Escala de mesa custom ajustada a ${settings.tableZoom}%.`
  } else if (params.action === 'set-card-scale') {
    settings = { ...settings, cardScale: clampNumber(params.value ?? settings.cardScale, 50, 120) }
    summary = `Escala de cartas custom ajustada a ${settings.cardScale}%.`
  } else if (params.action === 'reset-round') {
    const round = buildRoundState(room, match.roundNumber + 1, state.seats)
    state = round.state
    status = GameMatchStatus.ACTIVE
    trickNumber = round.trickNumber
    turnSeat = round.turnSeat
    summary = `Nueva ronda custom lista con ${round.state.deck.totalCards} cartas.`
  }

  await persistMatchState({
    matchId: match.id,
    roomId: room.id,
    status,
    roundNumber: params.action === 'reset-round' ? match.roundNumber + 1 : match.roundNumber,
    trickNumber,
    turnSeat,
    lastWinnerSeat: null,
    lastActionSummary: summary,
    state,
    settings,
  })

  await appendMatchEvent(match.id, {
    actorUserId: null,
    eventType: params.action === 'reset-round' ? 'CUSTOM_ROUND_READY' : 'CUSTOM_CONTROL',
    summary,
    payload: stringifyState({
      action: params.action,
      value: params.value,
    }),
  })

  return {
    matchId: match.id,
    roomId: room.id,
    summary,
  }
}
