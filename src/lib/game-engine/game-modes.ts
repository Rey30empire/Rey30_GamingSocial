import type { GameModeDefinition, GameTableConfig, ScoringStrategy } from './types'

export const classicHeartsScoringStrategy: ScoringStrategy = {
  id: 'classic-hearts-scoring',
  mode: 'hearts-classic',
  pointPolarity: 'low-score-wins',
  pointsLabel: 'pts',
  winnerRule: 'mode-specific',
  pointSource: 'mode-specific',
  summary: 'Hearts clasico conserva puntuacion penal: menor puntaje lidera.',
}

export const customTableScoringStrategy: ScoringStrategy = {
  id: 'custom-table-pressure-scoring',
  mode: 'trick-based',
  pointPolarity: 'low-score-wins',
  pointsLabel: 'presion',
  winnerRule: 'highest-card',
  pointSource: 'resolved-card-effects-sum',
  protectionRule: {
    appliesTo: 'incoming-trick-points',
    consumes: 'up-to-protected-points',
    timing: 'on-trick-resolution',
  },
  summary:
    'En custom-table la carta mas alta controla el choque y recibe presion igual a la suma resuelta de cartas. Menor presion lidera; protect-points absorbe esa presion al cerrar el choque.',
}

export const classicHeartsMode: GameModeDefinition = {
  id: 'classic-hearts',
  name: 'Classic Hearts',
  minPlayers: 4,
  maxPlayers: 4,
  deckPolicy: 'fixed-classic',
  rulesetId: 'classic-hearts-rules',
  scoringId: 'classic-hearts-scoring',
  scoringStrategy: classicHeartsScoringStrategy,
  defaultDeckConfig: {
    baseDeckId: 'classic-52',
    manualModuleIds: [],
    expansionMode: 'none',
    maxModules: 0,
  },
  defaultDealStrategy: {
    id: 'classic-hearts-even-deal',
    mode: 'equal',
    leftoverStrategy: 'none',
    cardsPerPlayer: 13,
    dealOrder: 'clockwise',
  },
  defaultTurnOrderStrategy: {
    id: 'classic-clockwise',
    mode: 'clockwise',
    startRule: 'mode-specific',
  },
  supportedModuleTypes: ['base'],
}

export const customTableMode: GameModeDefinition = {
  id: 'custom-table',
  name: 'Custom Table',
  minPlayers: 5,
  maxPlayers: 10,
  deckPolicy: 'modular',
  rulesetId: 'custom-table-rules',
  scoringId: 'custom-table-scoring',
  scoringStrategy: customTableScoringStrategy,
  defaultDeckConfig: {
    baseDeckId: 'modular-elemental',
    manualModuleIds: [],
    expansionMode: 'automatic-by-player-count',
  },
  defaultDealStrategy: {
    id: 'custom-table-fixed-hand-with-pot',
    mode: 'equal-with-pot',
    leftoverStrategy: 'pot',
    cardsPerPlayer: 13,
    dealOrder: 'clockwise',
  },
  defaultTurnOrderStrategy: {
    id: 'custom-dynamic-clockwise',
    mode: 'clockwise',
    startRule: 'first-seat',
  },
  supportedModuleTypes: ['base', 'elemental', 'special', 'event', 'premium'],
}

export const gameModes: Record<GameModeDefinition['id'], GameModeDefinition> = {
  'classic-hearts': classicHeartsMode,
  'custom-table': customTableMode,
}

export function getGameModeDefinition(modeId: GameModeDefinition['id']) {
  return gameModes[modeId]
}

export function createClassicHeartsTableConfig(overrides: Partial<GameTableConfig> = {}): GameTableConfig {
  return {
    id: overrides.id ?? 'classic-hearts-table',
    modeId: 'classic-hearts',
    name: overrides.name ?? 'Mesa clasica',
    minPlayers: 4,
    maxPlayers: 4,
    targetPlayers: 4,
    tableType: 'classic',
    allowBots: overrides.allowBots ?? true,
    deckConfig: classicHeartsMode.defaultDeckConfig,
    dealStrategy: classicHeartsMode.defaultDealStrategy,
    turnOrderStrategy: classicHeartsMode.defaultTurnOrderStrategy,
    ...overrides,
  }
}

export function createCustomTableConfig(overrides: Partial<GameTableConfig> = {}): GameTableConfig {
  const targetPlayers = overrides.targetPlayers ?? 5

  if (targetPlayers < customTableMode.minPlayers || targetPlayers > customTableMode.maxPlayers) {
    throw new Error('custom-table supports 5 to 10 players in this stage.')
  }

  return {
    id: overrides.id ?? 'custom-table',
    modeId: 'custom-table',
    name: overrides.name ?? 'Mesa custom',
    minPlayers: customTableMode.minPlayers,
    maxPlayers: customTableMode.maxPlayers,
    targetPlayers,
    tableType: 'custom',
    allowBots: overrides.allowBots ?? true,
    deckConfig: customTableMode.defaultDeckConfig,
    dealStrategy: customTableMode.defaultDealStrategy,
    turnOrderStrategy: customTableMode.defaultTurnOrderStrategy,
    ...overrides,
  }
}
