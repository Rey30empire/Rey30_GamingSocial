'use client'

import { useEffect, useEffectEvent, useState } from 'react'
import { useIsMobile } from '@/hooks/use-mobile'
import {
  advanceSnakeGame,
  createSnakeGameState,
  DEFAULT_SNAKE_TICK_MS,
  queueSnakeDirection,
  restartSnakeGame,
  toggleSnakePause,
  type SnakeDirection,
  type SnakeGameState,
} from '@/lib/snake-core'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Gamepad2,
  Keyboard,
  Pause,
  Play,
  RotateCcw,
  Smartphone,
} from 'lucide-react'

declare global {
  interface Window {
    render_game_to_text?: () => string
    advanceTime?: (ms: number) => void
  }
}

function cellKey(x: number, y: number) {
  return `${x}:${y}`
}

function isTypingTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.isContentEditable
  )
}

function getStatusLabel(game: SnakeGameState) {
  if (game.status === 'ready') {
    return 'Listo'
  }

  if (game.status === 'paused') {
    return 'Pausado'
  }

  if (game.status !== 'game-over') {
    return 'En curso'
  }

  if (game.outcome === 'board-full') {
    return 'Tablero completo'
  }

  if (game.outcome === 'self') {
    return 'Choque con el cuerpo'
  }

  return 'Choque con pared'
}

function DirectionButton({
  label,
  onPress,
  children,
}: {
  label: string
  onPress: () => void
  children: React.ReactNode
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={onPress}
      className="h-12 rounded-2xl border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
      aria-label={label}
    >
      {children}
    </Button>
  )
}

export function SnakeRoom() {
  const isMobile = useIsMobile()
  const [game, setGame] = useState(() => createSnakeGameState())

  const queueDirection = (direction: SnakeDirection) => {
    setGame((current) => queueSnakeDirection(current, direction))
  }

  const togglePause = () => {
    setGame((current) => toggleSnakePause(current))
  }

  const restartGame = () => {
    setGame((current) => restartSnakeGame(current))
  }

  const advanceGame = useEffectEvent((steps: number) => {
    setGame((current) => advanceSnakeGame(current, steps))
  })

  useEffect(() => {
    if (game.status !== 'running') {
      return
    }

    const intervalId = window.setInterval(() => {
      advanceGame(1)
    }, DEFAULT_SNAKE_TICK_MS)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [advanceGame, game.status])

  const handleKeyboardInput = useEffectEvent((event: KeyboardEvent) => {
    if (isTypingTarget(event.target)) {
      return
    }

    const key = event.key.toLowerCase()

    if (key === 'arrowup' || key === 'w') {
      event.preventDefault()
      queueDirection('up')
      return
    }

    if (key === 'arrowdown' || key === 's') {
      event.preventDefault()
      queueDirection('down')
      return
    }

    if (key === 'arrowleft' || key === 'a') {
      event.preventDefault()
      queueDirection('left')
      return
    }

    if (key === 'arrowright' || key === 'd') {
      event.preventDefault()
      queueDirection('right')
      return
    }

    if (key === ' ' || key === 'p') {
      event.preventDefault()
      togglePause()
      return
    }

    if (key === 'r' || key === 'enter') {
      event.preventDefault()
      restartGame()
    }
  })

  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      handleKeyboardInput(event)
    }

    window.addEventListener('keydown', listener)

    return () => {
      window.removeEventListener('keydown', listener)
    }
  }, [handleKeyboardInput])

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify({
        coordinateSystem: 'origin top-left, x increases to the right, y increases downward',
        status: game.status,
        outcome: game.outcome,
        score: game.score,
        direction: game.queuedDirection ?? game.direction,
        board: {
          columns: game.columns,
          rows: game.rows,
        },
        snake: game.snake,
        food: game.food,
      })

    window.advanceTime = (ms: number) => {
      const steps = Math.max(1, Math.round(ms / DEFAULT_SNAKE_TICK_MS))

      setGame((current) => {
        if (current.status === 'game-over') {
          return current
        }

        const playable =
          current.status === 'paused' || current.status === 'ready'
            ? { ...current, status: 'running' as const }
            : current
        return advanceSnakeGame(playable, steps)
      })
    }

    return () => {
      delete window.render_game_to_text
      delete window.advanceTime
    }
  }, [game])

  const snakeLookup = new Map<string, 'head' | 'body'>()

  game.snake.forEach((segment, index) => {
    snakeLookup.set(cellKey(segment.x, segment.y), index === 0 ? 'head' : 'body')
  })

  const activeDirection = game.queuedDirection ?? game.direction
  const statusLabel = getStatusLabel(game)
  const pauseLabel =
    game.status === 'ready' ? 'Empezar' : game.status === 'paused' ? 'Continuar' : 'Pausar'
  const PauseIcon = game.status === 'running' ? Pause : Play

  return (
    <div className="space-y-5">
      <section className="rounded-[1.7rem] border border-violet-400/10 bg-[#0f0b1a] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="border-0 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white">
                <Gamepad2 className="mr-1 h-3.5 w-3.5" />
                Sala Arcade Snake
              </Badge>
              <Badge className="border border-violet-400/10 bg-white/[0.04] text-zinc-300">
                Grid {game.columns}x{game.rows}
              </Badge>
              <Badge className="border border-violet-400/10 bg-white/[0.04] text-zinc-300">
                Direccion {activeDirection}
              </Badge>
            </div>
            <h3 className="mt-3 text-3xl font-semibold text-white">Snake clasico</h3>
            <p className="mt-1 max-w-2xl text-zinc-400">
              Come comida, crece una celda por punto y evita paredes o tu propio rastro.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => togglePause()}
              disabled={game.status === 'game-over'}
              className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
            >
              <PauseIcon className="mr-2 h-4 w-4" />
              {pauseLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => restartGame()}
              className="rounded-full border-violet-400/20 bg-violet-500/10 text-violet-100 hover:bg-violet-500/20"
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Reiniciar
            </Button>
          </div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="rounded-[1.9rem] border border-violet-400/10 bg-[#0f0b1a] p-4 lg:p-5">
          <div className="mx-auto aspect-square w-full max-w-[32rem] rounded-[1.8rem] border border-violet-400/12 bg-black/25 p-3 sm:p-4">
            <div
              className="grid h-full w-full gap-1"
              style={{
                gridTemplateColumns: `repeat(${game.columns}, minmax(0, 1fr))`,
                gridTemplateRows: `repeat(${game.rows}, minmax(0, 1fr))`,
              }}
            >
              {Array.from({ length: game.columns * game.rows }, (_, index) => {
                const x = index % game.columns
                const y = Math.floor(index / game.columns)
                const key = cellKey(x, y)
                const tone = snakeLookup.get(key)
                const isFood = Boolean(game.food && game.food.x === x && game.food.y === y)

                return (
                  <div
                    key={key}
                    className={cn(
                      'rounded-[0.45rem] border border-white/[0.04] bg-white/[0.03]',
                      tone === 'head' && 'border-violet-300/60 bg-violet-400 shadow-[0_0_16px_rgba(167,139,250,0.42)]',
                      tone === 'body' && 'border-cyan-300/40 bg-cyan-400/90',
                      isFood && 'border-fuchsia-300/60 bg-fuchsia-400 shadow-[0_0_16px_rgba(232,121,249,0.4)]'
                    )}
                  />
                )
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-[1.75rem] border border-violet-400/10 bg-[#0f0b1a] p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Marcador</p>
                <h4 className="mt-2 text-2xl font-semibold text-white">Estado actual</h4>
              </div>
              <Badge className="border-0 bg-cyan-500/20 text-cyan-100">{statusLabel}</Badge>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              {[
                ['Score', String(game.score)],
                ['Largo', String(game.snake.length)],
                ['Ticks', String(game.steps)],
              ].map(([label, value]) => (
                <div key={label} className="rounded-[1.1rem] border border-white/[0.08] bg-white/[0.04] p-4 text-center">
                  <p className="text-[0.72rem] uppercase tracking-[0.24em] text-zinc-500">{label}</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-[1.2rem] border border-white/[0.08] bg-white/[0.04] p-4 text-sm text-zinc-300">
              {game.status === 'game-over'
                ? 'La ronda termino. Reinicia para generar una nueva comida y volver al loop clasico.'
                : game.status === 'ready'
                  ? 'El tablero esta listo. Pulsa una direccion o usa Empezar para lanzar la primera corrida.'
                : game.status === 'paused'
                  ? 'El loop esta detenido. Retoma cuando quieras para seguir desde el mismo estado.'
                  : 'El loop corre a una velocidad fija y totalmente determinista para mantener la logica estable.'}
            </div>
          </section>

          <section className="rounded-[1.75rem] border border-violet-400/10 bg-[#0f0b1a] p-5">
            <div className="flex items-center gap-2">
              {isMobile ? (
                <Smartphone className="h-4 w-4 text-cyan-300" />
              ) : (
                <Keyboard className="h-4 w-4 text-cyan-300" />
              )}
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-zinc-500">Controles</p>
                <h4 className="mt-1 text-2xl font-semibold text-white">{isMobile ? 'Touch pad' : 'Teclado rapido'}</h4>
              </div>
            </div>

            <div className="mt-4 space-y-3 text-sm text-zinc-300">
              <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3">
                Flechas o WASD para iniciar y cambiar direccion.
              </div>
              <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3">`P` o espacio para pausar y reanudar.</div>
              <div className="rounded-[1rem] bg-white/[0.04] px-4 py-3">`R` o `Enter` para reiniciar de inmediato.</div>
            </div>

            {isMobile ? (
              <div className="mx-auto mt-5 grid max-w-[12rem] grid-cols-3 gap-2">
                <div />
                <DirectionButton label="Mover arriba" onPress={() => queueDirection('up')}>
                  <ChevronUp className="h-5 w-5" />
                </DirectionButton>
                <div />
                <DirectionButton label="Mover izquierda" onPress={() => queueDirection('left')}>
                  <ChevronLeft className="h-5 w-5" />
                </DirectionButton>
                <DirectionButton label={pauseLabel} onPress={() => togglePause()}>
                  <PauseIcon className="h-5 w-5" />
                </DirectionButton>
                <DirectionButton label="Mover derecha" onPress={() => queueDirection('right')}>
                  <ChevronRight className="h-5 w-5" />
                </DirectionButton>
                <div />
                <DirectionButton label="Mover abajo" onPress={() => queueDirection('down')}>
                  <ChevronDown className="h-5 w-5" />
                </DirectionButton>
                <div />
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  )
}
