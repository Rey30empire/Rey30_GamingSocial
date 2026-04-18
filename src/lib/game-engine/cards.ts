import type { CardDefinition, CardElement } from './types'

export const CLASSIC_SUITS = ['clubs', 'diamonds', 'spades', 'crowns'] as const

const suitVisuals: Record<(typeof CLASSIC_SUITS)[number], { themeColor: string; accentColor: string; icon: string }> = {
  clubs: {
    themeColor: '#22c55e',
    accentColor: '#bbf7d0',
    icon: 'club',
  },
  diamonds: {
    themeColor: '#38bdf8',
    accentColor: '#bae6fd',
    icon: 'diamond',
  },
  spades: {
    themeColor: '#a855f7',
    accentColor: '#e9d5ff',
    icon: 'spade',
  },
  crowns: {
    themeColor: '#f43f5e',
    accentColor: '#fecdd3',
    icon: 'heart',
  },
}

export const elementVisuals: Record<CardElement, { name: string; themeColor: string; accentColor: string; icon: string }> = {
  fire: {
    name: 'Fuego',
    themeColor: '#ff4a1c',
    accentColor: '#fed7aa',
    icon: 'flame',
  },
  water: {
    name: 'Agua',
    themeColor: '#0ea5e9',
    accentColor: '#bae6fd',
    icon: 'waves',
  },
  earth: {
    name: 'Tierra',
    themeColor: '#84cc16',
    accentColor: '#d9f99d',
    icon: 'mountain',
  },
  air: {
    name: 'Aire',
    themeColor: '#67e8f9',
    accentColor: '#cffafe',
    icon: 'wind',
  },
  lightning: {
    name: 'Rayo',
    themeColor: '#facc15',
    accentColor: '#fef08a',
    icon: 'zap',
  },
  shadow: {
    name: 'Sombra',
    themeColor: '#7c3aed',
    accentColor: '#ddd6fe',
    icon: 'moon',
  },
  light: {
    name: 'Luz',
    themeColor: '#f8fafc',
    accentColor: '#fde68a',
    icon: 'sun',
  },
}

export function cardLabel(rank: number) {
  if (rank === 14) return 'A'
  if (rank === 13) return 'K'
  if (rank === 12) return 'Q'
  if (rank === 11) return 'J'
  return String(rank)
}

export function createClassic52Cards(moduleId = 'classic-52'): CardDefinition[] {
  const cards: CardDefinition[] = []

  for (const suit of CLASSIC_SUITS) {
    for (let rank = 2; rank <= 14; rank += 1) {
      const visual = suitVisuals[suit]
      cards.push({
        id: `${suit}-${rank}`,
        moduleId,
        name: `${cardLabel(rank)} ${suit}`,
        label: cardLabel(rank),
        rank,
        value: rank,
        suit,
        type: 'standard',
        tags: ['classic', suit],
        visual: {
          themeColor: visual.themeColor,
          accentColor: visual.accentColor,
          icon: visual.icon,
        },
      })
    }
  }

  return cards
}

export function createElementalCards(moduleId: string, element: CardElement, count = 13): CardDefinition[] {
  const visual = elementVisuals[element]

  return Array.from({ length: count }, (_, index) => {
    const rank = index + 1

    return {
      id: `${moduleId}-${rank}`,
      moduleId,
      name: `${visual.name} ${rank}`,
      label: String(rank),
      rank,
      value: rank,
      element,
      type: 'elemental',
      tags: ['elemental', element],
      visual: {
        themeColor: visual.themeColor,
        accentColor: visual.accentColor,
        icon: visual.icon,
      },
    } satisfies CardDefinition
  })
}
