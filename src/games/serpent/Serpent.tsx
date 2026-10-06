import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { GameOverlay } from '#/components/GameOverlay'
import type { GameProps } from '#/games/types'
import { useKeyDirection } from '#/hooks/useKeyDirection'
import type { Dir } from '#/hooks/useKeyDirection'
import { useInterval } from '#/hooks/useInterval'
import { usePageVisible } from '#/hooks/usePageVisible'
import { useSwipe } from '#/hooks/useSwipe'
import { useScores } from '#/store/scores'
import { useTheme } from '#/store/theme'
import { DPad } from './DPad'
import { GRID, START_BODY, START_DIR, isReverse, placeFood, step, tickSpeed } from './logic'
import type { Point } from './logic'

type Phase = 'ready' | 'running' | 'over'

const DIRS: Record<Dir, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
const CORAL = '#FF7A5C'

type Game = { body: Point[]; dir: Point; next: Point; food: Point | null; alive: boolean }

function newGame(): Game {
  return { body: [...START_BODY], dir: START_DIR, next: START_DIR, food: placeFood(START_BODY), alive: true }
}

function draw(cv: HTMLCanvasElement, g: Game) {
  const dpr = window.devicePixelRatio || 1
  const W = Math.round(cv.clientWidth * dpr)
  if (!W) return
  if (cv.width !== W) {
    cv.width = W
    cv.height = W
  }
  const ctx = cv.getContext('2d')
  if (!ctx) return
  const c = W / GRID
  const cs = getComputedStyle(document.documentElement)
  const tv = (k: string, d: string) => cs.getPropertyValue(`--mt-${k}`).trim() || d
  ctx.fillStyle = tv('canvas', '#15141B')
  ctx.fillRect(0, 0, W, W)
  ctx.fillStyle = tv('sn-dot', '#2A2934')
  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.beginPath()
      ctx.arc((x + 0.5) * c, (y + 0.5) * c, Math.max(1, c * 0.06), 0, 7)
      ctx.fill()
    }
  }
  if (g.food) {
    ctx.fillStyle = CORAL
    ctx.shadowColor = CORAL
    ctx.shadowBlur = c * 0.9
    ctx.beginPath()
    ctx.arc((g.food.x + 0.5) * c, (g.food.y + 0.5) * c, c * 0.32, 0, 7)
    ctx.fill()
    ctx.shadowBlur = 0
  }
  const n = g.body.length
  const head = g.alive ? tv('sn-head', '#E2FF84') : CORAL
  const body = tv('sn-body', '#C8F031')
  g.body.forEach((b, i) => {
    ctx.globalAlpha = 1 - (i / n) * 0.55
    ctx.fillStyle = i === 0 ? head : body
    const w = c * 0.84
    ctx.beginPath()
    ctx.roundRect(b.x * c + c * 0.08, b.y * c + c * 0.08, w, w, c * 0.26)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}

export default function Serpent(props: GameProps) {
  const [round, setRound] = useState(0)
  const again = () => {
    props.onStats({
      primary: { label: 'Score', value: 0 },
      secondary: { label: 'Best', value: useScores.getState().best.snake ?? 0 },
    })
    setRound((r) => r + 1)
  }
  return <SerpentBoard key={round} {...props} onAgain={again} />
}

function SerpentBoard({
  onStats,
  onResult,
  settings,
  onAgain,
}: GameProps & { onAgain: () => void }) {
  const theme = useTheme()
  const visible = usePageVisible()
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const gameRef = useRef<Game | null>(null)
  gameRef.current ??= newGame()
  const bestRef = useRef(useScores.getState().best.snake ?? 0)
  const scoreRef = useRef(0)

  const report = (value: number) =>
    onStats({
      primary: { label: 'Score', value },
      secondary: { label: 'Best', value: Math.max(bestRef.current, value) },
    })

  const redraw = () => {
    const cv = canvasRef.current
    const g = gameRef.current
    if (cv && g) draw(cv, g)
  }

  const turn = (dir: Dir) => {
    const g = gameRef.current
    if (!g || !g.alive) return
    if (phase === 'ready') setPhase('running')
    const next = DIRS[dir]
    if (isReverse(g.dir, next)) return
    g.next = next
  }

  const tick = () => {
    const g = gameRef.current
    if (!g || !g.alive) return
    g.dir = g.next
    const r = step(g.body, g.dir, g.food)
    if (r.dead) {
      g.alive = false
      const nb = onResult(scoreRef.current)
      bestRef.current = Math.max(bestRef.current, scoreRef.current)
      setNewBest(nb && scoreRef.current > 0)
      setPhase('over')
      redraw()
      return
    }
    g.body = r.body
    if (r.ate) {
      g.food = placeFood(g.body)
      scoreRef.current += 1
      setScore(scoreRef.current)
      report(scoreRef.current)
    }
    redraw()
  }

  useKeyDirection(turn)
  const swipe = useSwipe(turn)
  useInterval(tick, phase === 'running' && visible ? tickSpeed(settings.snakeSpeed, score) : null)

  // Canvas is an external system: redraw on theme change and on resize.
  const drawNow = useEffectEvent(redraw)
  useEffect(() => {
    drawNow()
    const cv = canvasRef.current
    if (!cv) return
    const ro = new ResizeObserver(() => drawNow())
    ro.observe(cv)
    return () => ro.disconnect()
  }, [theme])

  return (
    <>
      <div
        {...swipe}
        className="relative aspect-square w-[min(92vw,58vh,560px)] overflow-hidden rounded-2xl border border-ink-600"
      >
        <canvas ref={canvasRef} className="block size-full" />
        {phase === 'ready' ? (
          <GameOverlay
            kicker="Arrows, swipe or D-pad"
            headline="Ready"
            action="Start"
            onAction={() => setPhase('running')}
          />
        ) : phase === 'over' ? (
          <GameOverlay
            kicker={newBest ? 'New best' : 'Game over'}
            headline={`${score} eaten`}
            action="Play again"
            onAction={onAgain}
          />
        ) : null}
      </div>
      <DPad onDir={turn} />
    </>
  )
}
