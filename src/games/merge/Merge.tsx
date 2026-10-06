import { useState } from 'react'
import { GameOverlay } from '#/components/GameOverlay'
import type { Dir } from '#/hooks/useKeyDirection'
import { useKeyDirection } from '#/hooks/useKeyDirection'
import { useSwipe } from '#/hooks/useSwipe'
import type { GameProps } from '#/games/types'
import { useScores } from '#/store/scores'
import { addTile, canMove, freshGrid, move, tileStyle } from './logic'

type BoardState = { grid: number[]; score: number; won: boolean; keep: boolean }

const initBoard = (): BoardState => ({ grid: freshGrid(), score: 0, won: false, keep: false })

function MergeBoard({ onStats, onResult, onAgain }: Omit<GameProps, 'settings'> & { onAgain: () => void }) {
  const [board, setBoard] = useState(initBoard)
  const storedBest = useScores((s) => s.best.merge ?? 0)
  const { grid, score, won, keep } = board
  const over = !canMove(grid)
  const showWin = won && !keep && !over

  const onDir = (dir: Dir) => {
    if (over || showWin) return
    const res = move(grid, dir)
    if (!res.moved) return
    const nextGrid = addTile(res.grid)
    const nextScore = score + res.gained
    const nextWon = won || res.reached2048
    setBoard((b) => ({ ...b, grid: nextGrid, score: nextScore, won: nextWon }))
    onStats({
      primary: { label: 'Score', value: nextScore },
      secondary: { label: 'Best', value: Math.max(storedBest, nextScore) },
    })
    if (!canMove(nextGrid) || (nextWon && !won)) onResult(nextScore)
  }

  useKeyDirection(onDir)
  const swipe = useSwipe(onDir)

  return (
    <div
      {...swipe}
      className="relative grid aspect-square w-[min(92vw,62vh,500px)] grid-cols-4 grid-rows-4 gap-[2.4cqw] rounded-[18px] border border-ink-600 bg-ink-800 p-[2.4cqw] [container-type:inline-size]"
    >
      {grid.map((v, i) => {
        const t = tileStyle(v)
        return (
          <div
            key={i}
            data-testid="merge-cell"
            data-value={v}
            className="flex items-center justify-center rounded-[10px] font-display font-extrabold transition-[background-color] duration-[120ms]"
            style={{ background: t.bg, color: t.fg, fontSize: t.fs, boxShadow: t.glow }}
          >
            {v || ''}
          </div>
        )
      })}
      {over ? (
        <GameOverlay kicker={`Score ${score}`} headline="No moves left" action="Play again" onAction={onAgain} />
      ) : showWin ? (
        <GameOverlay headline="2048!" action="Keep going" onAction={() => setBoard((b) => ({ ...b, keep: true }))} />
      ) : null}
    </div>
  )
}

export default function Merge({ onStats, onResult }: GameProps) {
  const [round, setRound] = useState(0)
  return (
    <MergeBoard
      key={round}
      onStats={onStats}
      onResult={onResult}
      onAgain={() => {
        setRound((r) => r + 1)
        onStats({ primary: { label: 'Score', value: 0 }, secondary: { label: 'Best', value: useScores.getState().best.merge ?? 0 } })
      }}
    />
  )
}
