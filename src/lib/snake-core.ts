export type SnakeDirection = 'up' | 'down' | 'left' | 'right'
export type SnakeStatus = 'ready' | 'running' | 'paused' | 'game-over'
export type SnakeOutcome = 'wall' | 'self' | 'board-full' | null

export interface SnakeCell {
  x: number
  y: number
}

export interface SnakeGameState {
  columns: number
  rows: number
  snake: SnakeCell[]
  food: SnakeCell | null
  direction: SnakeDirection
  queuedDirection: SnakeDirection | null
  score: number
  status: SnakeStatus
  outcome: SnakeOutcome
  steps: number
  seed: number
  pointsPerFood: number
}

export interface SnakeGameConfig {
  columns?: number
  rows?: number
  initialSnake?: SnakeCell[]
  initialDirection?: SnakeDirection
  seed?: number
  pointsPerFood?: number
}

export const DEFAULT_SNAKE_COLUMNS = 14
export const DEFAULT_SNAKE_ROWS = 14
export const DEFAULT_SNAKE_TICK_MS = 140

const DEFAULT_POINTS_PER_FOOD = 10
const DEFAULT_DIRECTION: SnakeDirection = 'right'
const DEFAULT_SEED = 20260328

const directionVectors: Record<SnakeDirection, SnakeCell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

function createCellKey(cell: SnakeCell) {
  return `${cell.x}:${cell.y}`
}

function cloneCell(cell: SnakeCell): SnakeCell {
  return { x: cell.x, y: cell.y }
}

function createDefaultSnake(columns: number, rows: number): SnakeCell[] {
  const centerY = Math.floor(rows / 2)
  const centerX = Math.floor(columns / 2)

  return [
    { x: centerX, y: centerY },
    { x: centerX - 1, y: centerY },
    { x: centerX - 2, y: centerY },
  ]
}

function getNormalizedSeed(seed: number) {
  return (seed >>> 0) || 1
}

function nextSeed(seed: number) {
  return (getNormalizedSeed(seed) * 1664525 + 1013904223) >>> 0 || 1
}

export function cellsEqual(left: SnakeCell | null, right: SnakeCell | null) {
  if (!left || !right) {
    return false
  }

  return left.x === right.x && left.y === right.y
}

export function isOppositeDirection(current: SnakeDirection, next: SnakeDirection) {
  return (
    (current === 'up' && next === 'down') ||
    (current === 'down' && next === 'up') ||
    (current === 'left' && next === 'right') ||
    (current === 'right' && next === 'left')
  )
}

export function getFoodPlacement(
  columns: number,
  rows: number,
  snake: SnakeCell[],
  seed: number
) {
  const occupied = new Set(snake.map(createCellKey))
  const availableCells: SnakeCell[] = []

  for (let y = 0; y < rows; y += 1) {
    for (let x = 0; x < columns; x += 1) {
      const cell = { x, y }

      if (!occupied.has(createCellKey(cell))) {
        availableCells.push(cell)
      }
    }
  }

  if (!availableCells.length) {
    return {
      food: null,
      seed: getNormalizedSeed(seed),
    }
  }

  const next = nextSeed(seed)
  return {
    food: cloneCell(availableCells[next % availableCells.length]),
    seed: next,
  }
}

export function createSnakeGameState(config: SnakeGameConfig = {}): SnakeGameState {
  const columns = config.columns ?? DEFAULT_SNAKE_COLUMNS
  const rows = config.rows ?? DEFAULT_SNAKE_ROWS
  const initialSnake = (config.initialSnake ?? createDefaultSnake(columns, rows)).map(cloneCell)
  const direction = config.initialDirection ?? DEFAULT_DIRECTION
  const seed = getNormalizedSeed(config.seed ?? DEFAULT_SEED)
  const placement = getFoodPlacement(columns, rows, initialSnake, seed)

  return {
    columns,
    rows,
    snake: initialSnake,
    food: placement.food,
    direction,
    queuedDirection: null,
    score: 0,
    status: 'ready',
    outcome: null,
    steps: 0,
    seed: placement.seed,
    pointsPerFood: config.pointsPerFood ?? DEFAULT_POINTS_PER_FOOD,
  }
}

export function queueSnakeDirection(state: SnakeGameState, nextDirection: SnakeDirection): SnakeGameState {
  if (state.status === 'game-over') {
    return state
  }

  if (isOppositeDirection(state.direction, nextDirection)) {
    return state
  }

  if (state.status === 'ready') {
    return {
      ...state,
      status: 'running',
      queuedDirection: nextDirection === state.direction ? null : nextDirection,
    }
  }

  if (nextDirection === state.direction || nextDirection === state.queuedDirection) {
    return state
  }

  return {
    ...state,
    queuedDirection: nextDirection,
  }
}

export function toggleSnakePause(state: SnakeGameState): SnakeGameState {
  if (state.status === 'game-over') {
    return state
  }

  if (state.status === 'ready') {
    return {
      ...state,
      status: 'running',
    }
  }

  return {
    ...state,
    status: state.status === 'running' ? 'paused' : 'running',
  }
}

export function stepSnakeGame(state: SnakeGameState): SnakeGameState {
  if (state.status !== 'running' || !state.snake.length) {
    return state
  }

  const direction = state.queuedDirection ?? state.direction
  const head = state.snake[0]
  const vector = directionVectors[direction]
  const nextHead = {
    x: head.x + vector.x,
    y: head.y + vector.y,
  }
  const willEatFood = cellsEqual(nextHead, state.food)
  const collisionSegments = willEatFood ? state.snake : state.snake.slice(0, -1)
  const outOfBounds =
    nextHead.x < 0 || nextHead.x >= state.columns || nextHead.y < 0 || nextHead.y >= state.rows

  if (outOfBounds) {
    return {
      ...state,
      direction,
      queuedDirection: null,
      status: 'game-over',
      outcome: 'wall',
    }
  }

  if (collisionSegments.some((segment) => cellsEqual(segment, nextHead))) {
    return {
      ...state,
      direction,
      queuedDirection: null,
      status: 'game-over',
      outcome: 'self',
    }
  }

  const nextSnake = [nextHead, ...state.snake.map(cloneCell)]

  if (!willEatFood) {
    nextSnake.pop()
  }

  if (!willEatFood) {
    return {
      ...state,
      snake: nextSnake,
      direction,
      queuedDirection: null,
      steps: state.steps + 1,
    }
  }

  const placement = getFoodPlacement(state.columns, state.rows, nextSnake, state.seed)
  const boardFilled = placement.food === null

  return {
    ...state,
    snake: nextSnake,
    food: placement.food,
    direction,
    queuedDirection: null,
    score: state.score + state.pointsPerFood,
    status: boardFilled ? 'game-over' : 'running',
    outcome: boardFilled ? 'board-full' : null,
    steps: state.steps + 1,
    seed: placement.seed,
  }
}

export function advanceSnakeGame(state: SnakeGameState, totalSteps = 1): SnakeGameState {
  let nextState = state

  for (let step = 0; step < totalSteps; step += 1) {
    nextState = stepSnakeGame(nextState)

    if (nextState.status === 'game-over') {
      break
    }
  }

  return nextState
}

export function restartSnakeGame(state: SnakeGameState, overrides: SnakeGameConfig = {}): SnakeGameState {
  return createSnakeGameState({
    columns: overrides.columns ?? state.columns,
    rows: overrides.rows ?? state.rows,
    initialSnake: overrides.initialSnake,
    initialDirection: overrides.initialDirection ?? DEFAULT_DIRECTION,
    seed: overrides.seed ?? nextSeed(state.seed),
    pointsPerFood: overrides.pointsPerFood ?? state.pointsPerFood,
  })
}
