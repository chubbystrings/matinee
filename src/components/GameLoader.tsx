import { useEffect, useEffectEvent, useState } from 'react'
import { preloadGame } from '#/games/registry'
import type { GameMeta } from '#/games/types'
import { useBestLabel } from '#/games/useBestLabel'
import { useInterval } from '#/hooks/useInterval'
import { loop, play } from '#/lib/sound'

const LOAD_MS = 3500
const SEGMENTS = 20
const BLINK_MS = 520
const DIM = '#6F6C7A'

const LABEL = 'font-mono text-[11px] uppercase tracking-[.14em]'

/** Arcade boot screen between pressing Play and the game starting. Always dark. */
export function GameLoader({
  game,
  onStart,
  onCancel,
}: {
  game: GameMeta
  onStart: () => void
  onCancel: () => void
}) {
  const best = useBestLabel(game)
  const [t0] = useState(() => performance.now())
  const [pct, setPct] = useState(0)
  const [dim, setDim] = useState(false)
  const ready = pct === 100
  const { color } = game

  // 5% steps: the bar moves in whole segments.
  useInterval(
    () => {
      const k = Math.min(1, (performance.now() - t0) / LOAD_MS)
      setPct(k < 1 ? Math.floor(k * SEGMENTS) * 5 : 100)
    },
    ready ? null : 50,
  )
  useInterval(() => setDim((d) => !d), ready ? BLINK_MS : null)

  const begin = () => {
    if (!ready) return
    play('coin')
    onStart()
  }
  const start = useEffectEvent(begin)
  const cancel = useEffectEvent(onCancel)

  // Music and the keyboard are external systems. The loader owns every key while it is open.
  useEffect(() => {
    preloadGame(game.id)
    const stopMusic = loop('boot')
    const onKey = (e: KeyboardEvent) => {
      e.stopImmediatePropagation()
      if (e.key === 'Escape') cancel()
      else if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        start()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      stopMusic()
    }
  }, [game.id])

  const lines = [
    'MATINEE OS v7.0',
    `Cartridge ${game.title.toUpperCase()}.${game.no}`,
    'Loading sprites',
    'Sound chip',
    'High scores',
  ]

  return (
    <div
      data-testid="game-loader"
      className="fixed inset-0 z-[80] flex flex-col overflow-auto bg-[#0B0A0F] text-[#F4F2F7]"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(60% 70% at 70% 35%, ${color}2E 0%, transparent 70%)`,
        }}
      />
      <div className="relative flex items-center justify-between gap-3 px-[clamp(16px,4vw,40px)] py-3.5">
        <div className="flex items-center gap-2.5">
          <span className="size-2.5 rounded-full bg-lime shadow-[0_0_12px_#C8F031]" />
          <span className="font-display text-sm font-extrabold tracking-[.06em]">
            MATINEE
          </span>
          <span className={LABEL} style={{ color: DIM }}>
            Arcade boot
          </span>
        </div>
        <button
          type="button"
          aria-label="Back to lobby"
          title="Back to lobby (Esc)"
          onClick={onCancel}
          className="grid size-10 cursor-pointer place-items-center rounded-full border border-[#3A3846] text-xl leading-none hover:border-[#F4F2F7]"
        >
          ×
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-[clamp(16px,4vw,40px)] pt-4 pb-12">
        <div className="flex w-full max-w-[620px] flex-col gap-7">
          <div className="flex flex-col gap-2.5">
            <div
              className="font-mono text-xs uppercase tracking-[.16em]"
              style={{ color }}
            >
              No. {game.no} · {game.genre}
            </div>
            <h2
              className="font-display text-[clamp(52px,11vw,120px)] leading-[.92] font-extrabold tracking-[-.02em] [overflow-wrap:anywhere]"
              style={{ color, textShadow: `0 0 48px ${color}59` }}
            >
              {game.title}
            </h2>
          </div>

          <div
            data-testid="boot-log"
            className="flex min-h-[140px] flex-col rounded-[14px] border border-[#2E2C38] bg-[rgba(14,13,18,.6)] px-[18px] py-3.5 font-mono text-[13px] leading-[22px] text-[#A8A5B3]"
          >
            {lines.map((text, i) => {
              if (!ready && pct < i * 20) return null
              const ok = ready || pct >= i * 20 + 15
              return (
                <div key={text} className="flex justify-between gap-3">
                  <span className="min-w-0 truncate">&gt; {text}</span>
                  <span
                    className="flex-none"
                    style={{ color: ok ? color : DIM }}
                  >
                    {ok ? 'OK' : '…'}
                  </span>
                </div>
              )
            })}
          </div>

          <div className="flex min-h-[92px] flex-col justify-center">
            {ready ? (
              <div className="flex flex-wrap items-center gap-x-[18px] gap-y-3">
                <button
                  type="button"
                  autoFocus
                  onClick={begin}
                  className="h-[60px] cursor-pointer rounded-full px-[34px] font-display text-lg font-extrabold tracking-[.12em] text-[#121117] transition-opacity duration-[120ms]"
                  style={{
                    backgroundColor: color,
                    opacity: dim ? 0.55 : 1,
                    boxShadow: `0 0 0 6px ${color}26, 0 0 36px ${color}66`,
                  }}
                >
                  PRESS START
                </button>
                <span className={LABEL} style={{ color: DIM }}>
                  or Enter · Space
                </span>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                <div className="flex justify-between font-mono text-xs uppercase tracking-[.16em] text-[#C9C6D2]">
                  <span>Loading</span>
                  <span data-testid="boot-pct">{pct}%</span>
                </div>
                <div className="grid h-[18px] grid-cols-[repeat(20,minmax(0,1fr))] gap-1">
                  {Array.from({ length: SEGMENTS }, (_, i) => {
                    const on = i < pct / 5
                    return (
                      <div
                        key={i}
                        className="rounded-[2px]"
                        style={{
                          background: on ? color : 'rgba(255,255,255,.07)',
                          boxShadow: on ? `0 0 10px ${color}66` : 'none',
                        }}
                      />
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-x-7 gap-y-[18px] border-t border-[#22212A] pt-5">
            <div className="flex flex-col gap-1.5">
              <div className={LABEL} style={{ color: DIM }}>
                Controls
              </div>
              <div className="text-[15px]">{game.controls}</div>
            </div>
            <div className="flex flex-col gap-1.5">
              <div className={LABEL} style={{ color: DIM }}>
                Your best
              </div>
              <div className="text-[15px]">{best}</div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className={LABEL} style={{ color }}>
              Tip
            </div>
            <div className="text-base leading-normal text-[#C9C6D2] [text-wrap:pretty]">
              {game.tip}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
