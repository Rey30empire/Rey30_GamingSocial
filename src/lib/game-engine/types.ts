export type GameModeId = 'classic-hearts' | 'custom-table'

export type TableType = 'classic' | 'custom' | 'private' | 'ranked'

export type SeatStatus = 'empty' | 'occupied' | 'bot' | 'disconnected'

export type DeckModuleType = 'base' | 'elemental' | 'special' | 'event' | 'premium' | 'cosmetic'

export type DeckActivationMode = 'manual' | 'auto-by-player-count' | 'auto-by-game-mode' | 'auto-by-table-type'

export type DeckExpansionMode = 'none' | 'automatic-by-player-count' | 'manual' | 'by-game-mode' | 'by-table-type'

export type DealMode = 'equal' | 'equal-with-pot' | 'equal-discard-leftovers' | 'partial' | 'custom'

export type LeftoverStrategy = 'none' | 'pot' | 'discard' | 'partial' | 'mode-specific'

export type DealOrder = 'clockwise' | 'counter-clockwise' | 'seat-index'

export type TurnOrderMode = 'clockwise' | 'counter-clockwise' | 'winner-starts' | 'custom'

export type TurnStartRule = 'host' | 'first-seat' | 'random' | 'lowest-card' | 'mode-specific'

export type ScoringMode = 'hearts-classic' | 'points' | 'trick-based' | 'custom'
export type ScorePolarity = 'high-score-wins' | 'low-score-wins'

export type CardElement = 'fire' | 'water' | 'earth' | 'air' | 'lightning' | 'shadow' | 'light'

export type CardType = 'standard' | 'elemental' | 'special' | 'event' | 'unique'

export interface GameTableConfig {
  id: string
  modeId: GameModeId
  name: string
  minPlayers: number
  maxPlayers: number
  targetPlayers: number
  tableType: TableType
  allowBots: boolean
  deckConfig: DeckBuildConfig
  dealStrategy: DealStrategyConfig
  turnOrderStrategy: TurnOrderStrategyConfig
}

export interface PlayerSeat {
  seatIndex: number
  playerId: string | null
  displayName: string
  status: SeatStatus
  isHost: boolean
  isBot: boolean
  teamId?: string
}

export interface CardVisualDefinition {
  themeColor: string
  accentColor?: string
  icon?: string
  frame?: string
  background?: string
}

export interface CardRuleDefinition {
  canLead?: boolean
  canFollow?: boolean
  scoreValue?: number
  effectId?: string
}

export interface CardDefinition {
  id: string
  moduleId: string
  name: string
  label: string
  rank?: number
  value?: number
  suit?: string
  element?: CardElement
  type: CardType
  tags: string[]
  visual: CardVisualDefinition
  rules?: CardRuleDefinition
}

export interface DeckDefinition {
  id: string
  name: string
  type: 'classic' | 'custom' | 'modular'
  baseModuleIds: string[]
  defaultModuleIds: string[]
  supportedGameModes: GameModeId[]
}

export interface DeckModuleActivation {
  mode: DeckActivationMode
  manualDefault?: boolean
  minPlayers?: number
  maxPlayers?: number
  requiredGameModes?: GameModeId[]
  requiredTableTypes?: TableType[]
}

export interface DeckModule {
  id: string
  name: string
  type: DeckModuleType
  priority: number
  cardsPerModule: number
  themeColor: string
  compatibleGameModes: GameModeId[]
  activation: DeckModuleActivation
  effects: DeckModuleEffect[]
  cards: CardDefinition[]
}

export interface DeckModuleEffect {
  id: string
  name: string
  description: string
  trigger: 'on-score' | 'on-win-trick' | 'on-lead' | 'passive'
  scoreModifier?: number
  actions?: DeckModuleEffectAction[]
  priority: number
}

export type DeckModuleEffectActionType = 'draw-card' | 'block-card' | 'shift-turn' | 'protect-points'
export type DeckModuleEffectTarget = 'self' | 'next-player' | 'winner' | 'table'

export interface DeckModuleEffectAction {
  type: DeckModuleEffectActionType
  target: DeckModuleEffectTarget
  value?: number
  label: string
}

export interface DeckBuildConfig {
  baseDeckId: string
  manualModuleIds: string[]
  expansionMode: DeckExpansionMode
  maxModules?: number
}

export interface BuiltDeck {
  cards: CardDefinition[]
  modules: DeckModule[]
  totalCards: number
  source: {
    baseDeckId: string
    automaticModuleIds: string[]
    manualModuleIds: string[]
  }
}

export interface DealStrategyConfig {
  id: string
  mode: DealMode
  leftoverStrategy: LeftoverStrategy
  cardsPerPlayer?: number
  dealOrder: DealOrder
}

export interface DealResult {
  hands: Record<string, CardDefinition[]>
  pot: CardDefinition[]
  discarded: CardDefinition[]
  undealt: CardDefinition[]
  cardsPerPlayer: number
  handSizes: Record<string, number>
  leftoverCount: number
  totalDealt: number
  dealOrder: string[]
  leftoverAction: LeftoverStrategy
}

export interface TurnOrderStrategyConfig {
  id: string
  mode: TurnOrderMode
  startRule: TurnStartRule
}

export interface ScoringStrategy {
  id: string
  mode: ScoringMode
  pointPolarity?: ScorePolarity
  pointsLabel?: string
  winnerRule?: 'highest-card' | 'lowest-card' | 'mode-specific'
  pointSource?: 'resolved-card-effects-sum' | 'mode-specific'
  protectionRule?: {
    appliesTo: 'incoming-trick-points'
    consumes: 'up-to-protected-points'
    timing: 'on-trick-resolution'
  }
  summary?: string
}

export interface GameModeDefinition {
  id: GameModeId
  name: string
  minPlayers: number
  maxPlayers: number
  deckPolicy: 'fixed-classic' | 'modular'
  rulesetId: string
  scoringId: string
  scoringStrategy?: ScoringStrategy
  defaultDeckConfig: DeckBuildConfig
  defaultDealStrategy: DealStrategyConfig
  defaultTurnOrderStrategy: TurnOrderStrategyConfig
  supportedModuleTypes: DeckModuleType[]
}
