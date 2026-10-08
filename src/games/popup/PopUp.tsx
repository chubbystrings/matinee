import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { GameOverlay } from '#/components/GameOverlay'
import type { GameProps, GameStats } from '#/games/types'
import { usePaused, usePauseNote } from '#/store/help'
import { FIRST_SPAWN_MS, HIT_DELAY_MS, RESUME_SPAWN_MS, HOLES, nextHole, ROUND_SECONDS, spawnInterval } from './logic'

const now = () => performance.now()

type Phase = 'ready' | 'running' | 'over'

const HOLE_INDEXES = Array.from({ length: HOLES }, (_, i) => i)

function makeStats(hits: number, seconds: number): GameStats {
  return { primary: { label: 'Hits', value: hits }, secondary: { label: 'Time', value: `${seconds}s` } }
}

type BoardProps = Pick<GameProps, 'onStats' | 'onResult'> & { onAgain: () => void }

function PopUpBoard({ onStats, onResult, onAgain }: BoardProps) {
  const [phase, setPhase] = useState<Phase>('ready')
  const [score, setScore] = useState(0)
  const [active, setActive] = useState(-1)
  const [newBest, setNewBest] = useState(false)

  // Fast-changing values live in refs so timer callbacks never read stale state.
  const scoreRef = useRef(0)
  const activeRef = useRef(-1)
  const endAt = useRef(0)
  const secondsRef = useRef(ROUND_SECONDS)
  const spawnTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(spawnTimer.current), [])

  const setTarget = (hole: number) => {
    activeRef.current = hole
    setActive(hole)
  }

  const spawn = () => {
    setTarget(nextHole(activeRef.current))
    spawnTimer.current = setTimeout(spawn, spawnInterval(scoreRef.current))
  }

  const start = () => {
    clearTimeout(spawnTimer.current)
    scoreRef.current = 0
    secondsRef.current = ROUND_SECONDS
    endAt.current = now() + ROUND_SECONDS * 1000
    setScore(0)
    setTarget(-1)
    setNewBest(false)
    setPhase('running')
    onStats(makeStats(0, ROUND_SECONDS))
    spawnTimer.current = setTimeout(spawn, FIRST_SPAWN_MS)
  }

  const finish = () => {
    clearTimeout(spawnTimer.current)
    setTarget(-1)
    setNewBest(onResult(scoreRef.current))
    setPhase('over')
    onStats(makeStats(scoreRef.current, 0))
  }

  // Tab hidden: the round is voided (back to the Start overlay, no result recorded).
  const voidRound = () => {
    if (phase !== 'running') return
    clearTimeout(spawnTimer.current)
    setTarget(-1)
    setScore(0)
    scoreRef.current = 0
    setPhase('ready')
    onStats(makeStats(0, ROUND_SECONDS))
  }
  const onHidden = useEffectEvent(voidRound)
  useEffect(() => {
    const onChange = () => {
      if (document.visibilityState === 'hidden') onHidden()
    }
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  // Countdown clock: external timer, ticks only while running.
  const tick = useEffectEvent(() => {
    const left = (endAt.current - now()) / 1000
    if (left <= 0) {
      finish()
      return
    }
    const seconds = Math.ceil(left)
    if (seconds !== secondsRef.current) {
      secondsRef.current = seconds
      onStats(makeStats(scoreRef.current, seconds))
    }
  })
  const paused = usePaused()
  usePauseNote(phase === 'running' ? 'Paused · the timer resumes when you close this' : null)
  useEffect(() => {
    if (phase !== 'running' || paused) return
    const id = setInterval(tick, 200)
    return () => clearInterval(id)
  }, [phase, paused])

  // How to play: freeze the clock and the spawns, remember what was left, and carry on afterwards.
  const resume = useEffectEvent((remainingMs: number) => {
    endAt.current = now() + remainingMs
    spawnTimer.current = setTimeout(spawn, RESUME_SPAWN_MS)
  })
  useEffect(() => {
    if (!paused || phase !== 'running') return
    const remaining = Math.max(0, endAt.current - now())
    clearTimeout(spawnTimer.current)
    return () => resume(remaining)
  }, [paused, phase])

  const hit = (i: number) => {
    if (phase !== 'running' || i !== activeRef.current) return
    clearTimeout(spawnTimer.current)
    scoreRef.current += 1
    setScore(scoreRef.current)
    setTarget(-1)
    onStats(makeStats(scoreRef.current, secondsRef.current))
    spawnTimer.current = setTimeout(spawn, HIT_DELAY_MS)
  }

  return (
    <div className="relative grid aspect-square w-[min(92vw,60vh,460px)] grid-cols-3 grid-rows-3 gap-[5cqw] p-[3cqw] [container-type:inline-size]">
      {HOLE_INDEXES.map((i) => (
        <button
          key={i}
          type="button"
          aria-label={`Hole ${i + 1}`}
          onPointerDown={() => hit(i)}
          onClick={(e) => {
            // keyboard activation only (mouse/touch is handled on pointerdown)
            if (e.detail === 0) hit(i)
          }}
          className="flex cursor-pointer items-center justify-center rounded-full border border-ink-600 bg-ink-800 p-0 shadow-hole"
        >
          {active === i ? (
            <span
              data-testid="target"
              className="size-[72%] animate-pop rounded-full bg-pink shadow-[0_0_30px_rgba(255,111,181,.55)]"
            />
          ) : null}
        </button>
      ))}
      {phase === 'running' ? null : (
        <GameOverlay
          kicker={phase === 'over' ? (newBest ? 'New best' : 'Time') : `${ROUND_SECONDS} seconds`}
          headline={phase === 'over' ? `${score} hits` : 'Hit the pink'}
          action={phase === 'over' ? 'Play again' : 'Start'}
          onAction={phase === 'over' ? onAgain : start}
        />
      )}
    </div>
  )
}

export default function PopUp({ onStats, onResult }: GameProps) {
  // Play again = remount the board.
  const [round, setRound] = useState(0)
  const handleAgain = () => {
    onStats(makeStats(0, ROUND_SECONDS))
    setRound((r) => r + 1)
  }
  return <PopUpBoard key={round} onStats={onStats} onResult={onResult} onAgain={handleAgain} />
}
