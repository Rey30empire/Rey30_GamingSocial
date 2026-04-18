import type {
  CardVisualOverrideSnapshot,
  DeckStyleSnapshot,
  DeckTemplateSnapshot,
  GameCardSnapshot,
} from '@/lib/app-types'

const scopePriority: Record<DeckTemplateSnapshot['scope'], number> = {
  deck: 10,
  suit: 20,
  element: 30,
  module: 40,
  card: 50,
}

export function resolveCardVisualOverride(params: {
  card: GameCardSnapshot
  templates: DeckTemplateSnapshot[]
  styles: DeckStyleSnapshot[]
  defaultStyleId?: string | null
}): CardVisualOverrideSnapshot {
  const defaultStyle = params.styles.find((style) => style.id === params.defaultStyleId) ?? params.styles[0] ?? null
  const matchingTemplates = params.templates
    .filter((template) => doesTemplateApplyToCard(template, params.card))
    .sort((left, right) => scopePriority[left.scope] - scopePriority[right.scope])

  return matchingTemplates.reduce<CardVisualOverrideSnapshot>(
    (visual, template) => {
      const style = params.styles.find((entry) => entry.id === template.styleId) ?? null

      return {
        templateId: template.id,
        templateName: template.name,
        sourceScope: template.scope,
        sourceTarget: getTemplateTarget(template),
        appliedTemplateIds: [...visual.appliedTemplateIds, template.id],
        styleId: template.styleId ?? visual.styleId,
        styleName: style?.name ?? template.styleName ?? visual.styleName,
        colors: style?.colors ?? visual.colors,
        artwork: template.artwork ?? visual.artwork,
        zoom: template.zoom,
        rotation: template.rotation,
        offsetX: template.offsetX,
        offsetY: template.offsetY,
      }
    },
    {
      templateId: null,
      templateName: null,
      sourceScope: 'base',
      sourceTarget: null,
      appliedTemplateIds: [],
      styleId: defaultStyle?.id ?? null,
      styleName: defaultStyle?.name ?? 'Base',
      colors: defaultStyle?.colors ?? null,
      artwork: null,
      zoom: 100,
      rotation: 0,
      offsetX: 0,
      offsetY: 0,
    }
  )
}

export function doesTemplateApplyToCard(template: DeckTemplateSnapshot, card: GameCardSnapshot) {
  if (template.scope === 'deck') {
    return true
  }

  if (template.scope === 'suit') {
    return Boolean(card.suit && template.targetSuit === card.suit)
  }

  if (template.scope === 'element') {
    return Boolean(card.element && template.targetElement === card.element)
  }

  if (template.scope === 'module') {
    return Boolean(card.moduleId && template.targetModule === card.moduleId)
  }

  if (template.scope === 'card') {
    return template.targetCard === card.id || template.targetCard === `${card.label}-${card.suit}`
  }

  return false
}

function getTemplateTarget(template: DeckTemplateSnapshot) {
  if (template.scope === 'card') {
    return template.targetCard
  }

  if (template.scope === 'suit') {
    return template.targetSuit
  }

  if (template.scope === 'module') {
    return template.targetModule
  }

  if (template.scope === 'element') {
    return template.targetElement
  }

  return null
}
