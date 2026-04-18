import { deckDefinitions, deckModules } from './deck-modules'
import { getGameModeDefinition } from './game-modes'
import type { BuiltDeck, DeckDefinition, DeckModule, GameModeDefinition, GameTableConfig } from './types'

export interface BuildDeckForTableInput {
  tableConfig: GameTableConfig
  playerCount: number
  gameMode?: GameModeDefinition
  deckDefinitions?: DeckDefinition[]
  modules?: DeckModule[]
}

function findDeck(deckId: string, definitions: DeckDefinition[]) {
  const deck = definitions.find((definition) => definition.id === deckId)

  if (!deck) {
    throw new Error(`Deck definition not found: ${deckId}`)
  }

  return deck
}

function findModules(moduleIds: string[], modules: DeckModule[]) {
  return moduleIds.map((moduleId) => {
    const deckModule = modules.find((entry) => entry.id === moduleId)

    if (!deckModule) {
      throw new Error(`Deck module not found: ${moduleId}`)
    }

    return deckModule
  })
}

function dedupeModules(modules: DeckModule[]) {
  const seen = new Set<string>()
  const result: DeckModule[] = []

  for (const deckModule of modules) {
    if (seen.has(deckModule.id)) {
      continue
    }

    seen.add(deckModule.id)
    result.push(deckModule)
  }

  return result
}

export function isModuleCompatible(module: DeckModule, mode: GameModeDefinition, tableConfig: GameTableConfig) {
  if (!module.compatibleGameModes.includes(mode.id)) {
    return false
  }

  if (!mode.supportedModuleTypes.includes(module.type)) {
    return false
  }

  const requiredModes = module.activation.requiredGameModes
  if (requiredModes?.length && !requiredModes.includes(mode.id)) {
    return false
  }

  const requiredTableTypes = module.activation.requiredTableTypes
  if (requiredTableTypes?.length && !requiredTableTypes.includes(tableConfig.tableType)) {
    return false
  }

  return true
}

export function shouldActivateModule(params: {
  module: DeckModule
  playerCount: number
  gameMode: GameModeDefinition
  tableConfig: GameTableConfig
}) {
  const { module, playerCount, gameMode, tableConfig } = params
  const activation = module.activation

  if (activation.mode === 'manual') {
    return Boolean(activation.manualDefault)
  }

  if (activation.mode === 'auto-by-player-count') {
    const minOk = activation.minPlayers == null || playerCount >= activation.minPlayers
    const maxOk = activation.maxPlayers == null || playerCount <= activation.maxPlayers
    return minOk && maxOk
  }

  if (activation.mode === 'auto-by-game-mode') {
    return activation.requiredGameModes?.includes(gameMode.id) ?? false
  }

  if (activation.mode === 'auto-by-table-type') {
    return activation.requiredTableTypes?.includes(tableConfig.tableType) ?? false
  }

  return false
}

export function buildDeckForTable(input: BuildDeckForTableInput): BuiltDeck {
  const definitions = input.deckDefinitions ?? deckDefinitions
  const modules = input.modules ?? deckModules
  const gameMode = input.gameMode ?? getGameModeDefinition(input.tableConfig.modeId)
  const baseDeck = findDeck(input.tableConfig.deckConfig.baseDeckId, definitions)

  if (!baseDeck.supportedGameModes.includes(gameMode.id)) {
    throw new Error(`${baseDeck.id} is not compatible with ${gameMode.id}.`)
  }

  const baseModules = findModules(baseDeck.baseModuleIds, modules)
  const manualModules = findModules(input.tableConfig.deckConfig.manualModuleIds, modules).filter((module) =>
    isModuleCompatible(module, gameMode, input.tableConfig)
  )

  const automaticModules =
    input.tableConfig.deckConfig.expansionMode === 'automatic-by-player-count'
      ? modules
          .filter((module) => module.type !== 'base')
          .filter((module) => isModuleCompatible(module, gameMode, input.tableConfig))
          .filter((module) =>
            shouldActivateModule({
              module,
              playerCount: input.playerCount,
              gameMode,
              tableConfig: input.tableConfig,
            })
          )
          .sort((left, right) => left.priority - right.priority)
      : []

  const limitedAutomaticModules =
    input.tableConfig.deckConfig.maxModules == null
      ? automaticModules
      : automaticModules.slice(0, input.tableConfig.deckConfig.maxModules)

  const selectedModules = dedupeModules([...baseModules, ...limitedAutomaticModules, ...manualModules])
  const automaticModuleIds = new Set(limitedAutomaticModules.map((module) => module.id))
  const manualModuleIds = new Set(manualModules.map((module) => module.id))

  return {
    cards: selectedModules.flatMap((module) => module.cards),
    modules: selectedModules,
    totalCards: selectedModules.reduce((sum, module) => sum + module.cards.length, 0),
    source: {
      baseDeckId: baseDeck.id,
      automaticModuleIds: selectedModules.filter((module) => automaticModuleIds.has(module.id)).map((module) => module.id),
      manualModuleIds: selectedModules.filter((module) => manualModuleIds.has(module.id)).map((module) => module.id),
    },
  }
}
