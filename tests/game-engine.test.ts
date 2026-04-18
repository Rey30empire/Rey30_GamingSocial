import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildDeckForTable,
  createClassicHeartsTableConfig,
  createCustomTableConfig,
  createSeatsForPlayers,
  customTableMode,
  deckModules,
  dealCards,
  getNextSeatIndex,
  resolveCardEffects,
  applyEffectTrigger,
} from '../src/lib/game-engine/index.ts'

function playerIds(count: number) {
  return Array.from({ length: count }, (_, index) => `player-${index + 1}`)
}

test('classic-hearts conserva mesa fija de 4 jugadores y mazo clasico de 52 cartas', () => {
  const tableConfig = createClassicHeartsTableConfig()
  const deck = buildDeckForTable({
    tableConfig,
    playerCount: 4,
  })
  const seats = createSeatsForPlayers({
    playerIds: playerIds(4),
    minSeats: tableConfig.minPlayers,
    maxSeats: tableConfig.maxPlayers,
  })
  const deal = dealCards({
    players: seats,
    deck: deck.cards,
    strategy: tableConfig.dealStrategy,
    seedSource: 'classic-hearts-test',
  })

  assert.equal(tableConfig.modeId, 'classic-hearts')
  assert.equal(tableConfig.minPlayers, 4)
  assert.equal(tableConfig.maxPlayers, 4)
  assert.equal(deck.totalCards, 52)
  assert.deepEqual(deck.source.automaticModuleIds, [])
  assert.equal(deal.cardsPerPlayer, 13)
  assert.equal(deal.leftoverCount, 0)
  assert.equal(deal.totalDealt, 52)
  assert.deepEqual(Object.values(deal.handSizes), [13, 13, 13, 13])
})

test('custom-table ensambla mazos elementales automaticos de 5 a 10 jugadores', () => {
  const expectedModulesByPlayers: Record<number, string[]> = {
    5: ['element-fire'],
    6: ['element-fire', 'element-water'],
    7: ['element-fire', 'element-water', 'element-earth'],
    8: ['element-fire', 'element-water', 'element-earth', 'element-air'],
    9: ['element-fire', 'element-water', 'element-earth', 'element-air', 'element-lightning'],
    10: ['element-fire', 'element-water', 'element-earth', 'element-air', 'element-lightning', 'element-shadow'],
  }

  for (let count = 5; count <= 10; count += 1) {
    const tableConfig = createCustomTableConfig({
      targetPlayers: count,
    })
    const deck = buildDeckForTable({
      tableConfig,
      playerCount: count,
    })
    const seats = createSeatsForPlayers({
      playerIds: playerIds(count),
      minSeats: tableConfig.minPlayers,
      maxSeats: tableConfig.maxPlayers,
    })
    const deal = dealCards({
      players: seats,
      deck: deck.cards,
      strategy: tableConfig.dealStrategy,
      seedSource: `custom-table-${count}`,
    })

    assert.equal(tableConfig.modeId, 'custom-table')
    assert.equal(deck.totalCards, count * 13)
    assert.deepEqual(deck.source.automaticModuleIds, expectedModulesByPlayers[count])
    assert.equal(deal.cardsPerPlayer, 13)
    assert.equal(deal.leftoverCount, 0)
    assert.equal(deal.totalDealt, count * 13)
    assert.deepEqual(Object.values(deal.handSizes), Array.from({ length: count }, () => 13))
  }
})

test('custom-table permite modulo manual adicional y envia sobrantes al pozo', () => {
  const tableConfig = createCustomTableConfig({
    targetPlayers: 5,
    deckConfig: {
      ...customTableMode.defaultDeckConfig,
      manualModuleIds: ['element-light'],
    },
  })
  const deck = buildDeckForTable({
    tableConfig,
    playerCount: 5,
  })
  const seats = createSeatsForPlayers({
    playerIds: playerIds(5),
    minSeats: tableConfig.minPlayers,
    maxSeats: tableConfig.maxPlayers,
  })
  const deal = dealCards({
    players: seats,
    deck: deck.cards,
    strategy: tableConfig.dealStrategy,
    seedSource: 'custom-table-manual-light',
  })

  assert.equal(deck.totalCards, 78)
  assert.deepEqual(deck.source.automaticModuleIds, ['element-fire'])
  assert.deepEqual(deck.source.manualModuleIds, ['element-light'])
  assert.equal(deal.cardsPerPlayer, 13)
  assert.equal(deal.totalDealt, 65)
  assert.equal(deal.leftoverCount, 13)
  assert.equal(deal.pot.length, 13)
})

test('custom-table define scoring formal de presion y proteccion de puntos', () => {
  assert.equal(customTableMode.scoringStrategy?.id, 'custom-table-pressure-scoring')
  assert.equal(customTableMode.scoringStrategy?.pointPolarity, 'low-score-wins')
  assert.equal(customTableMode.scoringStrategy?.pointsLabel, 'presion')
  assert.equal(customTableMode.scoringStrategy?.winnerRule, 'highest-card')
  assert.equal(customTableMode.scoringStrategy?.pointSource, 'resolved-card-effects-sum')
  assert.equal(customTableMode.scoringStrategy?.protectionRule?.appliesTo, 'incoming-trick-points')
})

test('modulos elementales resuelven y aplican efectos configurables de puntuacion', () => {
  const fire = deckModules.find((module) => module.id === 'element-fire')
  const water = deckModules.find((module) => module.id === 'element-water')
  const lightning = deckModules.find((module) => module.id === 'element-lightning')

  assert.ok(fire)
  assert.ok(water)
  assert.ok(lightning)
  assert.equal(fire.effects[0]?.trigger, 'on-score')
  assert.equal(fire.effects[0]?.scoreModifier, 2)
  assert.equal(water.effects[0]?.scoreModifier, -1)
  assert.equal(water.effects[0]?.actions?.[0]?.type, 'protect-points')
  assert.equal(deckModules.find((module) => module.id === 'element-earth')?.effects[0]?.actions?.[0]?.type, 'block-card')
  assert.equal(deckModules.find((module) => module.id === 'element-air')?.effects[0]?.actions?.[0]?.type, 'shift-turn')
  assert.equal(lightning.effects[0]?.scoreModifier, 3)
  assert.equal(lightning.effects[0]?.actions?.[0]?.type, 'draw-card')

  const fireCard = fire.cards[0]
  assert.ok(fireCard)
  const resolvedFireEffects = resolveCardEffects({
    card: fireCard,
    modules: deckModules,
    trigger: 'on-score',
  })
  const fireScore = applyEffectTrigger({
    card: fireCard,
    modules: deckModules,
    trigger: 'on-score',
    baseScore: fireCard.value ?? 0,
    minScore: 0,
    context: {
      gameMode: 'custom-table',
      player: {
        id: 'player-1',
        seatIndex: 0,
        displayName: 'Alex',
      },
      trick: {
        index: 1,
        tableCardCount: 5,
        playedCardIds: [fireCard.id],
      },
      table: {
        id: 'table-test',
        modeId: 'custom-table',
        playerCount: 5,
      },
      activeModule: {
        id: fire.id,
        name: fire.name,
        type: fire.type,
        element: fireCard.element,
      },
    },
  })

  assert.equal(resolvedFireEffects.length, 1)
  assert.equal(resolvedFireEffects[0]?.effect.id, 'fire-scorch')
  assert.equal(fireScore.modifier, 2)
  assert.equal(fireScore.score, (fireCard.value ?? 0) + 2)
  assert.equal(fireScore.context.gameMode, 'custom-table')
  assert.equal(fireScore.context.player?.seatIndex, 0)
  assert.equal(fireScore.context.activeModule?.id, 'element-fire')

  const waterCard = water.cards[4]
  assert.ok(waterCard)
  const waterScore = applyEffectTrigger({
    card: waterCard,
    modules: deckModules,
    trigger: 'on-score',
    baseScore: waterCard.value ?? 0,
    minScore: 0,
  })

  assert.equal(waterScore.modifier, -1)
  assert.equal(waterScore.score, (waterCard.value ?? 0) - 1)
  assert.equal(waterScore.actions[0]?.type, 'protect-points')

  const incompatibleScore = applyEffectTrigger({
    card: fireCard,
    modules: deckModules,
    trigger: 'on-score',
    baseScore: fireCard.value ?? 0,
    context: {
      gameMode: 'classic-hearts',
    },
  })

  assert.equal(incompatibleScore.effects.length, 0)
  assert.equal(incompatibleScore.modifier, 0)
  assert.equal(incompatibleScore.score, fireCard.value ?? 0)
})

test('orden de turnos dinamico recorre la cantidad real de jugadores', () => {
  const tableConfig = createCustomTableConfig({
    targetPlayers: 10,
  })
  const seats = createSeatsForPlayers({
    playerIds: playerIds(10),
    minSeats: tableConfig.minPlayers,
    maxSeats: tableConfig.maxPlayers,
  })

  assert.equal(
    getNextSeatIndex({
      seats,
      currentSeatIndex: 0,
      strategy: tableConfig.turnOrderStrategy,
    }),
    1
  )
  assert.equal(
    getNextSeatIndex({
      seats,
      currentSeatIndex: 9,
      strategy: tableConfig.turnOrderStrategy,
    }),
    0
  )
  assert.equal(
    getNextSeatIndex({
      seats,
      currentSeatIndex: 0,
      strategy: {
        ...tableConfig.turnOrderStrategy,
        mode: 'counter-clockwise',
      },
    }),
    9
  )
})

test('custom-table rechaza configuraciones fuera del rango 5 a 10', () => {
  assert.throws(
    () =>
      createCustomTableConfig({
        targetPlayers: 4,
      }),
    /5 to 10/
  )
  assert.throws(
    () =>
      createCustomTableConfig({
        targetPlayers: 11,
      }),
    /5 to 10/
  )
})
