import { expect, test, type APIRequestContext, type Page } from '@playwright/test'
import type { AppSnapshot, GameSnapshot } from '../../src/lib/app-types'

async function getBootstrapSnapshot(request: APIRequestContext) {
  const response = await request.get('/api/bootstrap')
  expect(response.ok()).toBeTruthy()
  return (await response.json()) as AppSnapshot
}

async function mockBootstrap(page: Page, snapshot: Partial<AppSnapshot>) {
  await page.route('**/api/bootstrap', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshot),
    })
  })
}

async function openCardLab(page: Page) {
  await page.goto('/')
  await expect(page.getByText('Cargando ecosistema')).toBeHidden({ timeout: 30_000 })
  await page.getByRole('button', { name: /Card Lab/i }).first().click()
}

async function createCustomRoom(request: APIRequestContext, roomName: string) {
  const response = await request.post('/api/rooms', {
    data: {
      name: roomName,
      mode: 'normal',
      isPublic: true,
      tableMode: 'custom-table',
      targetPlayers: 6,
      botCount: 5,
    },
  })
  expect(response.ok()).toBeTruthy()
  const payload = await response.json()
  return payload.room.id as string
}

async function openRoom(page: Page, roomName: string) {
  await page.goto('/')
  await expect(page.getByText('Cargando ecosistema')).toBeHidden({ timeout: 30_000 })
  await page.getByRole('button', { name: /Salas/i }).first().click()
  await expect(page.getByText(roomName).first()).toBeVisible()
  await page.getByText(roomName).first().click()
}

function makeEmptyCardLabSnapshot(snapshot: AppSnapshot): AppSnapshot {
  return {
    ...snapshot,
    customize: {
      ...snapshot.customize,
      deckComparisons: [],
      deckModules: [],
      templates: [],
      visualOverrides: [],
      artworks: [],
      inventoryDecks: [],
      creatorCard: {
        ...snapshot.customize.creatorCard,
        templatesCount: 0,
        artworksCount: 0,
        activeTemplateName: 'Sin templates guardados',
        focusLabel: 'Sin foco visual activo',
        activityLabel: 'Sin actividad reciente',
      },
      editor: {
        ...snapshot.customize.editor,
        activeTemplateId: null,
        templateName: 'Nuevo template',
        artworkId: null,
        scope: 'deck',
        targetCard: null,
        targetSuit: null,
        targetModule: null,
        targetElement: null,
      },
    },
  }
}

function makeEmptyGameSnapshot(snapshot: GameSnapshot): GameSnapshot {
  return {
    ...snapshot,
    status: 'waiting',
    currentTurnLabel: 'Mesa en espera',
    summary: 'Mesa vacia preparada para snapshot visual.',
    ruleHint: 'No hay cartas activas ni efectos resueltos en este estado.',
    hand: [],
    playableCardIds: [],
    tableCards: [],
    tableMessages: [],
    recentEvents: [],
    effectHistory: [],
    playerEffects: {
      blockedCardIds: [],
      blockedCards: 0,
      protectedPoints: 0,
    },
    seats: snapshot.seats.map((seat) => ({
      ...seat,
      cardsRemaining: 0,
      isTurn: false,
      blockedCards: 0,
      protectedPoints: 0,
      statusLabel: 'Esperando cartas',
    })),
    standings: snapshot.standings.map((entry) => ({
      ...entry,
      roundPoints: 0,
      tricksWon: 0,
    })),
  }
}

test('Card Lab mantiene snapshot de estado vacio', async ({ page, request }) => {
  const snapshot = makeEmptyCardLabSnapshot(await getBootstrapSnapshot(request))

  await mockBootstrap(page, snapshot)
  await page.route('**/api/customize/state**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(snapshot.customize),
    })
  })

  await openCardLab(page)
  const comparePanel = page.getByTestId('card-lab-deck-compare')
  await comparePanel.evaluate((element) => element.scrollIntoView({ block: 'center', inline: 'nearest' }))
  await expect(comparePanel.getByText('No hay overrides de módulo o elemento para comparar todavía.')).toBeVisible()
  await expect(comparePanel).toHaveScreenshot('card-lab-empty-compare.png', {
    maxDiffPixelRatio: 0.03,
  })
})

test('Card Lab mantiene snapshot de error de carga', async ({ page, request }) => {
  const snapshot = await getBootstrapSnapshot(request)
  const snapshotWithoutCardLab: Partial<AppSnapshot> = { ...snapshot }
  delete snapshotWithoutCardLab.customize

  await mockBootstrap(page, snapshotWithoutCardLab)
  await page.route('**/api/customize/state**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Card Lab visual test sin datos disponibles.',
      }),
    })
  })

  await openCardLab(page)
  await expect(page.getByText('Sincronizando estilos y templates')).toBeHidden()
  await expect(page.getByText('Card Lab no disponible')).toBeVisible()
  const statusPanel = page.getByTestId('card-lab-status-panel')
  await expect(statusPanel).toHaveScreenshot('card-lab-error-state.png', {
    maxDiffPixelRatio: 0.03,
  })
})

test('Mesa mantiene snapshot de estado vacio', async ({ page, request }, testInfo) => {
  const roomName = `Mesa empty snapshot ${testInfo.project.name}`
  const roomId = await createCustomRoom(request, roomName)
  const stateResponse = await request.get(`/api/game/state?roomId=${roomId}`)
  expect(stateResponse.ok()).toBeTruthy()
  const emptyGame = makeEmptyGameSnapshot((await stateResponse.json()) as GameSnapshot)

  await page.route('**/api/game/state**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(emptyGame),
    })
  })

  await openRoom(page, roomName)
  await expect(page.getByText('Esperando jugada')).toBeVisible()
  await expect(page.getByTestId('game-table-viewport')).toHaveScreenshot('game-table-empty-viewport.png', {
    maxDiffPixelRatio: 0.03,
  })
})

test('Mesa mantiene snapshot de error de carga', async ({ page, request }, testInfo) => {
  const roomName = `Mesa error snapshot ${testInfo.project.name}`
  await createCustomRoom(request, roomName)

  await page.route('**/api/game/state**', async (route) => {
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({
        error: 'Mesa visual test sin estado disponible.',
      }),
    })
  })

  await openRoom(page, roomName)
  const statusPanel = page.getByTestId('game-status-panel')
  await expect(statusPanel.getByText('Mesa no disponible')).toBeVisible()
  await expect(statusPanel).toHaveScreenshot('game-error-state.png', {
    maxDiffPixelRatio: 0.03,
  })
})
