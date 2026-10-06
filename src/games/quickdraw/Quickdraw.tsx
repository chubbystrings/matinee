import { useEffect, useEffectEvent, useRef, useState } from 'react'
import type { GameProps } from '#/games/types'
import { useScores } from '#/store/scores'
import {  phaseView, pushTry, waitDelay } from './logic'
import type {Phase} from './logic';

export default function Quickdraw({ onStats, onResult }: GameProps) {
  const [phase, setPhase] = useState<Phase>('idle')
  const [ms, setMs] = useState(0)
  const [tries, setTries] = useState<number[]>([])
  const [newBest, setNewBest] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const startedAt = useRef(0)

  const tap = () => {
    if (phase === 'wait') {
      clearTimeout(timer.current)
      setPhase('early')
      return
    }
    if (phase === 'go') {
      const elapsed = Math.round(performance.now() - startedAt.current)
      const isBest = onResult(elapsed)
      const best = useScores.getState().best.quickdraw ?? elapsed
      setMs(elapsed)
      setNewBest(isBest)
      setTries((t) => pushTry(t, elapsed))
      setPhase('result')
      onStats({ primary: { label: 'Last', value: `${elapsed} ms` }, secondary: { label: 'Best', value: `${best} ms` } })
      return
    }
    setPhase('wait')
    timer.current = setTimeout(() => {
      startedAt.current = performance.now()
      setPhase('go')
    }, waitDelay())
  }

  const onKey = useEffectEvent((e: KeyboardEvent) => {
    if (e.key !== ' ' && e.key !== 'Enter') return
    e.preventDefault()
    if (!e.repeat) tap()
  })

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => onKey(e)
    // Void an in-flight round when the tab is hidden so timing never spans a background gap.
    const onVisibility = () => {
      if (document.visibilityState !== 'hidden') return
      clearTimeout(timer.current)
      setPhase((p) => (p === 'wait' || p === 'go' ? 'idle' : p))
    }
    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
      clearTimeout(timer.current)
    }
  }, [])

  const view = phaseView(phase, ms, newBest)

  return (
    <>
      <div
        onPointerDown={tap}
        data-phase={phase}
        data-testid="qd-panel"
        className="flex h-[min(58vh,440px)] w-[min(92vw,680px)] cursor-pointer flex-col items-center justify-center gap-3.5 rounded-[22px] border border-ink-600 p-6 text-center transition-[background-color] duration-[80ms]"
        style={{ background: view.bg, color: view.fg }}
      >
        <div className="font-display text-[clamp(36px,8vw,76px)] leading-none font-extrabold uppercase">{view.big}</div>
        <div className="max-w-[36ch] text-base leading-normal opacity-85">{view.small}</div>
      </div>
      <ul className="flex min-h-[30px] flex-wrap justify-center gap-2" aria-label="Recent tries">
        {tries.map((t, i) => (
          <li
            key={`${tries.length - i}`}
            className="rounded-full border border-ink-600 px-3 py-1.5 font-mono text-[13px] text-text-2"
          >
            {t} ms
          </li>
        ))}
      </ul>
    </>
  )
}
