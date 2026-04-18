import { createClassic52Cards, createElementalCards, elementVisuals } from './cards'
import type { CardElement, DeckDefinition, DeckModule } from './types'

export const classic52Module: DeckModule = {
  id: 'classic-52',
  name: 'Mazo clasico 52',
  type: 'base',
  priority: 0,
  cardsPerModule: 52,
  themeColor: '#f8fafc',
  compatibleGameModes: ['classic-hearts', 'custom-table'],
  activation: {
    mode: 'manual',
    manualDefault: true,
  },
  effects: [],
  cards: createClassic52Cards('classic-52'),
}

const elementalModulePlan: Array<{
  id: string
  element: CardElement
  priority: number
  minPlayers: number
  effect: DeckModule['effects'][number]
}> = [
  {
    id: 'element-fire',
    element: 'fire',
    priority: 10,
    minPlayers: 5,
    effect: {
      id: 'fire-scorch',
      name: 'Scorch',
      description: 'Las cartas de fuego suman +2 pts al choque.',
      trigger: 'on-score',
      scoreModifier: 2,
      priority: 10,
    },
  },
  {
    id: 'element-water',
    element: 'water',
    priority: 20,
    minPlayers: 6,
    effect: {
      id: 'water-flow',
      name: 'Flow',
      description: 'Las cartas de agua suavizan el choque con -1 pt y protegen 3 pts del siguiente choque recibido.',
      trigger: 'on-score',
      scoreModifier: -1,
      actions: [
        {
          type: 'protect-points',
          target: 'self',
          value: 3,
          label: 'Escudo de agua',
        },
      ],
      priority: 20,
    },
  },
  {
    id: 'element-earth',
    element: 'earth',
    priority: 30,
    minPlayers: 7,
    effect: {
      id: 'earth-weight',
      name: 'Weight',
      description: 'Las cartas de tierra suman +1 pt estable y bloquean una carta fuerte del siguiente jugador.',
      trigger: 'on-score',
      scoreModifier: 1,
      actions: [
        {
          type: 'block-card',
          target: 'next-player',
          value: 1,
          label: 'Bloqueo de tierra',
        },
      ],
      priority: 30,
    },
  },
  {
    id: 'element-air',
    element: 'air',
    priority: 40,
    minPlayers: 8,
    effect: {
      id: 'air-drift',
      name: 'Drift',
      description: 'Las cartas de aire alteran el orden y saltan un asiento en el siguiente turno.',
      trigger: 'on-score',
      scoreModifier: 0,
      actions: [
        {
          type: 'shift-turn',
          target: 'table',
          value: 1,
          label: 'Deriva de aire',
        },
      ],
      priority: 40,
    },
  },
  {
    id: 'element-lightning',
    element: 'lightning',
    priority: 50,
    minPlayers: 9,
    effect: {
      id: 'lightning-surge',
      name: 'Surge',
      description: 'Las cartas de rayo suman +3 pts al choque y roban 1 carta del pozo si existe.',
      trigger: 'on-score',
      scoreModifier: 3,
      actions: [
        {
          type: 'draw-card',
          target: 'self',
          value: 1,
          label: 'Robo de rayo',
        },
      ],
      priority: 50,
    },
  },
  {
    id: 'element-shadow',
    element: 'shadow',
    priority: 60,
    minPlayers: 10,
    effect: {
      id: 'shadow-tax',
      name: 'Tax',
      description: 'Las cartas de sombra suman +2 pts y bloquean una carta del siguiente jugador.',
      trigger: 'on-score',
      scoreModifier: 2,
      actions: [
        {
          type: 'block-card',
          target: 'next-player',
          value: 1,
          label: 'Marca de sombra',
        },
      ],
      priority: 60,
    },
  },
  {
    id: 'element-light',
    element: 'light',
    priority: 70,
    minPlayers: 11,
    effect: {
      id: 'light-echo',
      name: 'Echo Chain',
      description: 'Las cartas de luz encadenan proteccion, bloqueo y cambio de turno para expansiones manuales.',
      trigger: 'on-score',
      scoreModifier: 1,
      actions: [
        {
          type: 'protect-points',
          target: 'self',
          value: 2,
          label: 'Aegis de luz',
        },
        {
          type: 'block-card',
          target: 'next-player',
          value: 1,
          label: 'Sello de luz',
        },
        {
          type: 'shift-turn',
          target: 'table',
          value: 1,
          label: 'Eco de turno',
        },
      ],
      priority: 70,
    },
  },
]

export const elementalDeckModules: DeckModule[] = elementalModulePlan.map((plan) => {
  const visual = elementVisuals[plan.element]

  return {
    id: plan.id,
    name: visual.name,
    type: 'elemental',
    priority: plan.priority,
    cardsPerModule: 13,
    themeColor: visual.themeColor,
    compatibleGameModes: ['custom-table'],
    activation: {
      mode: 'auto-by-player-count',
      minPlayers: plan.minPlayers,
    },
    effects: [plan.effect],
    cards: createElementalCards(plan.id, plan.element, 13),
  } satisfies DeckModule
})

export const deckModules: DeckModule[] = [classic52Module, ...elementalDeckModules]

export const deckDefinitions: DeckDefinition[] = [
  {
    id: 'classic-52',
    name: 'Mazo clasico',
    type: 'classic',
    baseModuleIds: ['classic-52'],
    defaultModuleIds: [],
    supportedGameModes: ['classic-hearts', 'custom-table'],
  },
  {
    id: 'modular-elemental',
    name: 'Mazo modular elemental',
    type: 'modular',
    baseModuleIds: ['classic-52'],
    defaultModuleIds: [],
    supportedGameModes: ['custom-table'],
  },
]
