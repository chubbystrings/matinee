import { useEffect, useRef, useState } from 'react'
import { Button } from '#/components/Button'
import type { GameProps } from '#/games/types'
import { useScores } from '#/store/scores'
import {
  addResult,
  
  
  cpuMove,
  emptyBoard,
  getOutcome,
  
  statusText,
  
  tallyLabel
} from './logic'
import type {Board, Cell, Mark, Tally} from './logic';

type Round = { board: Board; turn: Mark; result: Mark | 'D' | null; line: readonly number[] }

const FRESH: Round = { board: emptyBoard(), turn: 'X', result: null, line: [] }
const CPU_DELAY_MS = 420

const STATUS_COLOR: Record<string, string> = { X: 'var(--mt-x)', O: 'var(--mt-o)' }
const TINT: Record<string, string> = {
  X: 'color-mix(in srgb, var(--mt-x) 16%, transparent)',
  O: 'color-mix(in srgb, var(--mt-o) 18%, transparent)',
}
const X_STYLE = { color: 'var(--mt-x)' }
const O_STYLE = { color: 'var(--mt-o)' }

export default function Noughts({ onStats, onResult, settings }: GameProps) {
  const [round, setRound] = useState<Round>(FRESH)
  const [tally, setTally] = useState<Tally>({ w: 0, l: 0, d: 0 })
  // Mirrors of state for timer callbacks (never read during render).
  const tallyRef = useRef(tally)
  const winsRef = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const finish = (board: Board, winner: Mark | 'D', line: readonly number[]) => {
    const next = addResult(tallyRef.current, winner)
    tallyRef.current = next
    setTally(next)
    setRound({ board, turn: 'X', result: winner, line })
    if (winner === 'X') {
      winsRef.current += 1
      onResult(winsRef.current)
    }
    const best = useScores.getState().best.noughts
    onStats({
      primary: { label: 'W–L–D', value: tallyLabel(next) },
      secondary: { label: 'Best', value: best === undefined ? '—' : `${best} wins` },
    })
  }

  const cpuTurn = (board: Board) => {
    const mv = cpuMove(board, settings.cpuLevel)
    const next = board.map<Cell>((v, i) => (i === mv ? 'O' : v))
    const out = getOutcome(next)
    if (out) finish(next, out.winner, out.line)
    else setRound({ board: next, turn: 'X', result: null, line: [] })
  }

  const play = (i: number) => {
    if (round.result || round.turn !== 'X' || round.board[i]) return
    const next = round.board.map<Cell>((v, j) => (j === i ? 'X' : v))
    const out = getOutcome(next)
    if (out) {
      finish(next, out.winner, out.line)
      return
    }
    setRound({ board: next, turn: 'O', result: null, line: [] })
    timer.current = setTimeout(() => cpuTurn(next), CPU_DELAY_MS)
  }

  const nextRound = () => {
    clearTimeout(timer.current)
    setRound(FRESH)
  }

  return (
    <>
      <div
        className="font-display text-[clamp(18px,3vw,24px)] font-semibold tracking-[.02em] uppercase"
        style={{ color: round.result ? STATUS_COLOR[round.result] : undefined }}
        role="status"
      >
        {statusText(round.turn, round.result)}
      </div>
      <div className="grid aspect-square w-[min(88vw,56vh,420px)] [container-type:inline-size] grid-cols-3 grid-rows-3 gap-[2.4cqw]">
        {round.board.map((v, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Cell ${i + 1}${v ? `, ${v}` : ''}`}
            onClick={() => play(i)}
            className="cursor-pointer rounded-2xl border border-ink-600 bg-ink-800 p-0 font-display text-[18cqw] leading-none font-extrabold transition-[background-color] duration-200 hover:border-ink-450"
            style={{
              ...(v === 'X' ? X_STYLE : O_STYLE),
              ...(round.line.includes(i) && round.result ? { background: TINT[round.result] } : null),
            }}
          >
            {v}
          </button>
        ))}
      </div>
      {round.result ? <Button compact onClick={nextRound}>Next round</Button> : null}
    </>
  )
}
