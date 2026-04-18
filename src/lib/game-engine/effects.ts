import type {
  CardDefinition,
  CardElement,
  DeckModule,
  DeckModuleEffect,
  DeckModuleEffectAction,
  DeckModuleType,
  GameModeId,
} from './types'

export type EffectSourceCard = Pick<CardDefinition, 'id' | 'moduleId' | 'element' | 'value' | 'rank'>

export interface EffectSourceModule {
  id: string
  name?: string
  type?: DeckModuleType | string
  themeColor?: string
  compatibleGameModes?: Array<GameModeId | string>
  effects: DeckModuleEffect[]
}

export interface EffectTriggerContext {
  gameMode?: GameModeId | string
  player?: {
    id?: string
    seatIndex?: number
    displayName?: string
  }
  trick?: {
    index?: number
    leadSuit?: string | null
    tableCardCount?: number
    playedCardIds?: string[]
  }
  table?: {
    id?: string
    modeId?: GameModeId | string
    playerCount?: number
    turnSeatIndex?: number
  }
  activeModule?: {
    id: string
    name?: string
    type?: DeckModuleType | string
    element?: CardElement | string
  }
}

export interface ResolvedCardEffect {
  cardId: string
  moduleId: string
  moduleName?: string
  context: EffectTriggerContext
  effect: DeckModuleEffect
}

export interface AppliedEffectTrigger {
  baseScore: number
  modifier: number
  score: number
  context: EffectTriggerContext
  actions: DeckModuleEffectAction[]
  effects: ResolvedCardEffect[]
}

export function resolveCardEffects(params: {
  card: EffectSourceCard
  modules: EffectSourceModule[]
  trigger?: DeckModuleEffect['trigger']
  context?: EffectTriggerContext
}): ResolvedCardEffect[] {
  const deckModule = params.modules.find((entry) => entry.id === params.card.moduleId)
  const context = normalizeEffectContext(params.context, deckModule)

  if (!deckModule?.effects.length) {
    return []
  }

  if (context.gameMode && deckModule.compatibleGameModes?.length && !deckModule.compatibleGameModes.includes(context.gameMode)) {
    return []
  }

  return deckModule.effects
    .filter((effect) => !params.trigger || effect.trigger === params.trigger)
    .sort((left, right) => left.priority - right.priority)
    .map((effect) => ({
      cardId: params.card.id,
      moduleId: deckModule.id,
      moduleName: deckModule.name,
      context,
      effect,
    }))
}

export function applyEffectTrigger(params: {
  card: EffectSourceCard
  modules: EffectSourceModule[]
  trigger: DeckModuleEffect['trigger']
  baseScore: number
  minScore?: number
  context?: EffectTriggerContext
}): AppliedEffectTrigger {
  const context = normalizeEffectContext(params.context)
  const effects = resolveCardEffects({
    card: params.card,
    modules: params.modules,
    trigger: params.trigger,
    context,
  })
  const modifier = effects.reduce((total, entry) => total + (entry.effect.scoreModifier ?? 0), 0)
  const actions = effects.flatMap((entry) => entry.effect.actions ?? [])
  const minScore = params.minScore ?? 0
  const score = Math.max(minScore, params.baseScore + modifier)
  const appliedContext = effects[0]?.context ?? context

  return {
    baseScore: params.baseScore,
    modifier,
    score,
    context: appliedContext,
    actions,
    effects,
  }
}

function normalizeEffectContext(context: EffectTriggerContext = {}, module?: EffectSourceModule): EffectTriggerContext {
  return {
    ...context,
    gameMode: context.gameMode ?? context.table?.modeId,
    activeModule:
      context.activeModule ??
      (module
        ? {
            id: module.id,
            name: module.name,
            type: module.type,
          }
        : undefined),
  }
}
