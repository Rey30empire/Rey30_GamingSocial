import { expect, test, type APIRequestContext, type Locator } from '@playwright/test'
import { loadEnvConfig } from '@next/env'
import { GameMatchStatus, PrismaClient } from '@prisma/client'
import { classic52Module, deckModules, type CardDefinition } from '../../src/lib/game-engine'

loadEnvConfig(process.cwd())

const prisma = new PrismaClient()
const visualDeckPrefixBase = 'Visual Snapshot'

test.afterAll(async () => {
  await prisma.$disconnect()
})

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

async function cleanupVisualDecks(request: APIRequestContext, deckPrefix: string) {
  const stateResponse = await request.get('/api/customize/state')
  expect(stateResponse.ok()).toBeTruthy()
  const state = await stateResponse.json()
  const generatedDecks = (state.deckOptions as Array<{ key: string; name: string; isDefault?: boolean }>).filter(
    (deck) => !deck.isDefault && deck.name.startsWith(deckPrefix)
  )

  for (const deck of generatedDecks) {
    const deleteResponse = await request.delete('/api/customize/deck', {
      data: {
        deckKey: deck.key,
      },
    })
    expect(deleteResponse.ok()).toBeTruthy()
  }
}

async function clickCentered(locator: Locator) {
  await locator.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await locator.focus()
  await locator.press('Enter')
}

async function saveTemplate(
  request: APIRequestContext,
  params: {
    deckKey: string
    name: string
    styleId: string
    scope: 'deck' | 'card' | 'suit' | 'module' | 'element'
    targetCard?: string | null
    targetSuit?: string | null
    targetModule?: string | null
    targetElement?: string | null
    zoom?: number
    rotation?: number
    offsetX?: number
    offsetY?: number
  }
) {
  const response = await request.post('/api/customize/template', {
    data: {
      templateId: null,
      deckKey: params.deckKey,
      name: params.name,
      styleId: params.styleId,
      artworkId: null,
      scope: params.scope,
      targetCard: params.targetCard ?? null,
      targetSuit: params.targetSuit ?? null,
      targetModule: params.targetModule ?? null,
      targetElement: params.targetElement ?? null,
      zoom: params.zoom ?? 100,
      rotation: params.rotation ?? 0,
      offsetX: params.offsetX ?? 0,
      offsetY: params.offsetY ?? 0,
      equip: true,
    },
  })
  expect(response.ok()).toBeTruthy()
}

async function createDeckWithOverrides(
  request: APIRequestContext,
  params: {
    name: string
    moduleId: string
    element: string
    suit: string
    card: string
    styleId: string
  }
) {
  const createDeckResponse = await request.post('/api/customize/deck', {
    data: {
      name: params.name,
    },
  })
  expect(createDeckResponse.ok()).toBeTruthy()
  const createDeckPayload = await createDeckResponse.json()
  const deckKey = createDeckPayload.deck.deckKey as string

  await saveTemplate(request, {
    deckKey,
    name: `${params.name} completo`,
    styleId: params.styleId,
    scope: 'deck',
    zoom: 99,
  })
  await saveTemplate(request, {
    deckKey,
    name: `${params.name} carta`,
    styleId: params.styleId,
    scope: 'card',
    targetCard: params.card,
    zoom: 104,
    offsetX: 1,
  })
  await saveTemplate(request, {
    deckKey,
    name: `${params.name} palo`,
    styleId: params.styleId,
    scope: 'suit',
    targetSuit: params.suit,
    zoom: 102,
    offsetY: -1,
  })
  await saveTemplate(request, {
    deckKey,
    name: `${params.name} modulo`,
    styleId: params.styleId,
    scope: 'module',
    targetModule: params.moduleId,
  })
  await saveTemplate(request, {
    deckKey,
    name: `${params.name} elemento`,
    styleId: params.styleId,
    scope: 'element',
    targetElement: params.element,
    zoom: 106,
    offsetX: 1,
    offsetY: -1,
  })

  return {
    deckKey,
    name: params.name,
  }
}

test('Card Lab compara todos los scopes, duplica con toast y mantiene snapshot visual', async ({ page, request }, testInfo) => {
  const visualDeckPrefix = `${visualDeckPrefixBase} ${testInfo.project.name}`
  await cleanupVisualDecks(request, visualDeckPrefix)
  const stateResponse = await request.get('/api/customize/state')
  expect(stateResponse.ok()).toBeTruthy()
  const state = await stateResponse.json()
  const styleId = state.styles[0]?.id as string | undefined
  const defaultDeckName =
    (state.deckOptions as Array<{ name: string; isDefault?: boolean }>).find((deck) => deck.isDefault)?.name ?? 'Mazo principal'
  expect(styleId).toBeTruthy()

  const fireDeck = await createDeckWithOverrides(request, {
    name: `${visualDeckPrefix} Fuego`,
    moduleId: 'element-fire',
    element: 'fire',
    suit: 'spades',
    card: 'Q-spades',
    styleId: styleId!,
  })
  const waterDeck = await createDeckWithOverrides(request, {
    name: `${visualDeckPrefix} Agua`,
    moduleId: 'element-water',
    element: 'water',
    suit: 'crowns',
    card: 'A-crowns',
    styleId: styleId!,
  })

  await page.goto('/')
  await expect(page.getByText('Cargando ecosistema')).toBeHidden({ timeout: 30_000 })
  await page.getByRole('button', { name: /Card Lab/i }).first().click()
  await expect(page.getByText('Mazos guardados')).toBeVisible()
  await expect(page.getByText('Comparar mazos')).toBeVisible()

  const comparePanel = page.getByTestId('card-lab-deck-compare')
  await comparePanel.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await clickCentered(comparePanel.getByRole('button', { name: 'Limpiar' }))
  await clickCentered(comparePanel.getByRole('button', { name: new RegExp(escapeRegExp(defaultDeckName)) }))
  await clickCentered(comparePanel.getByRole('button', { name: new RegExp(escapeRegExp(fireDeck.name)) }))
  await clickCentered(comparePanel.getByRole('button', { name: new RegExp(escapeRegExp(waterDeck.name)) }))
  await clickCentered(comparePanel.getByRole('button', { name: 'Todo' }))
  await expect(page.getByText('Diferencias completas')).toBeVisible()
  await expect(page.getByText('Baraja: Mazo completo')).toBeVisible()
  await expect(page.getByText('Carta: Q spades')).toBeVisible()
  await expect(page.getByText('Palo: crowns')).toBeVisible()
  await expect(page.getByText('Modulo: element-fire')).toBeVisible()
  await expect(page.getByText('Elemento: water')).toBeVisible()

  await expect(page.getByTestId('card-lab-deck-compare-row').first()).toHaveScreenshot('card-lab-deck-compare-all-row.png', {
    maxDiffPixelRatio: 0.03,
  })

  await clickCentered(comparePanel.getByRole('button', { name: 'Solo diferencias' }))
  await expect(page.getByText('Diferencias completas')).toBeVisible()
  await expect(page.getByText('Baraja: Mazo completo')).toBeVisible()
  await expect(page.getByText('Carta: Q spades')).toBeVisible()
  await expect(page.getByText('Palo: crowns')).toBeVisible()
  await expect(page.getByText('Modulo: element-fire')).toBeVisible()
  await expect(page.getByText('Elemento: water')).toBeVisible()

  await expect(page.getByTestId('card-lab-deck-compare-row').first()).toHaveScreenshot('card-lab-deck-compare-differences-row.png', {
    maxDiffPixelRatio: 0.03,
  })

  await clickCentered(page.getByRole('button', { name: /Duplicar mazo completo/i }))
  await expect(page.getByText('Mazo duplicado', { exact: true })).toBeVisible()
  await expect(page.getByText(/5 overrides? activos?/i).first()).toBeVisible()
})

test('Mesa custom muestra Cadena elemental x3 con block-card shift-turn protect-points reales', async ({ page, request }, testInfo) => {
  const roomName = `Mesa cadena elemental snapshot ${testInfo.project.name}`
  const roomResponse = await request.post('/api/rooms', {
    data: {
      name: roomName,
      mode: 'normal',
      isPublic: true,
      tableMode: 'custom-table',
      targetPlayers: 6,
      botCount: 5,
    },
  })
  expect(roomResponse.ok()).toBeTruthy()
  const roomPayload = await roomResponse.json()
  const roomId = roomPayload.room.id as string

  const match = await prisma.gameMatch.findUnique({
    where: {
      roomId,
    },
  })
  expect(match).toBeTruthy()

  const lightCard = deckModules.find((module) => module.id === 'element-light')?.cards.find((card) => card.value === 13)
  const targetCards = classic52Module.cards
    .filter((card) => card.suit === 'spades' && (card.value ?? 0) >= 12)
    .slice(0, 2)

  expect(lightCard).toBeTruthy()
  expect(targetCards.length).toBe(2)

  const state = JSON.parse(match!.statePayload) as {
    seats: Array<{
      seatIndex: number
      cards: CardDefinition[]
      blockedCardIds: string[]
      protectedPoints: number
    }>
    tableCards: unknown[]
    effectLog: unknown[]
  }

  state.seats = state.seats.map((seat) => ({
    ...seat,
    cards: seat.seatIndex === 0 ? [lightCard!] : seat.seatIndex === 1 ? targetCards : [],
    blockedCardIds: [],
    protectedPoints: 0,
  }))
  state.tableCards = []
  state.effectLog = []

  await prisma.gameMatch.update({
    where: {
      id: match!.id,
    },
    data: {
      status: GameMatchStatus.ACTIVE,
      turnSeat: 0,
      trickNumber: 1,
      statePayload: JSON.stringify(state),
      lastActionSummary: 'Test preparado con carta de luz encadenada.',
    },
  })

  const playResponse = await request.post('/api/game/play', {
    data: {
      roomId,
      cardId: lightCard!.id,
    },
  })
  expect(playResponse.ok()).toBeTruthy()

  const gameStateResponse = await request.get(`/api/game/state?roomId=${roomId}`)
  expect(gameStateResponse.ok()).toBeTruthy()
  const gameStatePayload = await gameStateResponse.json()
  const animatedChainEntries = gameStatePayload.effectHistory.filter(
    (entry: { cardId: string; type: string }) =>
      entry.cardId === lightCard!.id && ['protect-points', 'block-card', 'shift-turn'].includes(entry.type)
  )
  expect(animatedChainEntries).toHaveLength(3)
  expect(
    gameStatePayload.effectHistory.some(
      (entry: { type: string; effectName: string }) => entry.type === 'protect-points' && entry.effectName === 'Aegis de luz'
    )
  ).toBeTruthy()
  expect(
    gameStatePayload.effectHistory.some(
      (entry: { type: string; effectName: string }) => entry.type === 'block-card' && entry.effectName === 'Sello de luz'
    )
  ).toBeTruthy()
  expect(
    gameStatePayload.effectHistory.some(
      (entry: { type: string; effectName: string }) => entry.type === 'shift-turn' && entry.effectName === 'Eco de turno'
    )
  ).toBeTruthy()

  await page.goto('/')
  await expect(page.getByText('Cargando ecosistema')).toBeHidden({ timeout: 30_000 })
  await page.getByRole('button', { name: /Salas/i }).first().click()
  await expect(page.getByText(roomName).first()).toBeVisible()
  await page.getByText(roomName).first().click()
  await expect(page.getByText('Cadena elemental x3')).toBeVisible()
  await expect(page.getByText('Aegis de luz').first()).toBeVisible()
  await expect(page.getByText('Sello de luz').first()).toBeVisible()
  await expect(page.getByText('Eco de turno').first()).toBeVisible()

  const effectHistoryPanel = page.getByTestId('game-effect-history-panel')
  await effectHistoryPanel.scrollIntoViewIfNeeded()
  await expect(effectHistoryPanel).toBeVisible()

  for (const filter of [
    { label: 'Daño', snapshot: 'game-effect-history-score.png' },
    { label: 'Proteccion', snapshot: 'game-effect-history-protect-points.png' },
    { label: 'Bloqueo', snapshot: 'game-effect-history-block-card.png' },
    { label: 'Turno', snapshot: 'game-effect-history-shift-turn.png' },
    { label: 'Robo', snapshot: 'game-effect-history-draw-card.png' },
  ]) {
    await effectHistoryPanel.getByRole('button', { name: filter.label }).click()
    await expect(effectHistoryPanel).toHaveScreenshot(filter.snapshot, {
      maxDiffPixelRatio: 0.03,
    })
  }
})

test('Mesa de partida mantiene snapshot visual del layout de mesa', async ({ page, request }, testInfo) => {
  const roomName = `Mesa visual snapshot ${testInfo.project.name}`
  const roomResponse = await request.post('/api/rooms', {
    data: {
      name: roomName,
      mode: 'normal',
      isPublic: true,
      tableMode: 'custom-table',
      targetPlayers: 6,
      botCount: 5,
    },
  })
  expect(roomResponse.ok()).toBeTruthy()

  await page.goto('/')
  await expect(page.getByText('Cargando ecosistema')).toBeHidden({ timeout: 30_000 })
  await page.getByRole('button', { name: /Salas/i }).first().click()
  await expect(page.getByText(roomName).first()).toBeVisible()
  await page.getByText(roomName).first().click()
  await expect(page.getByText(/Tu mano/i)).toBeVisible()
  await expect(page.getByText(/Mesa custom/i).first()).toBeVisible()
  await expect(page.getByText(/Historial de efectos|Esperando jugada|Choque\/Baza/i).first()).toBeVisible()

  await expect(page.getByTestId('game-table-viewport')).toHaveScreenshot('game-table-viewport.png', {
    maxDiffPixelRatio: 0.03,
  })
})
