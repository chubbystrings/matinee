import { useEffect, useRef, useState } from 'react'
import { GameOverlay } from '#/components/GameOverlay'
import { formatBest } from '#/games/best'
import type { GameProps, GameStats } from '#/games/types'
import { useScores } from '#/store/scores'
import { createDeck, flipCard, hideCards, PAIR_COUNT } from './logic'
import type { CardStatus } from './logic'

const MISMATCH_MS = 750
const BEST_META = { bestUnit: ' moves' }
const CARD_COUNT = PAIR_COUNT * 2
const TEXT_GLYPH = { fontVariantEmoji: 'text' } as const

function makeStats(moves: number, best: number | undefined): GameStats {
  return {
    primary: { label: 'Moves', value: moves },
    secondary: { label: 'Best', value: formatBest(BEST_META, best) },
  }
}

type BoardProps = Pick<GameProps, 'onStats' | 'onResult'> & { onAgain: () => void }

function RecallBoard({ onStats, onResult, onAgain }: BoardProps) {
  const best = useScores((s) => s.best.recall)
  const [deck] = useState(() => createDeck())
  const [status, setStatus] = useState<CardStatus[]>(() => Array<CardStatus>(CARD_COUNT).fill('down'))
  const [moves, setMoves] = useState(0)
  const [newBest, setNewBest] = useState(false)
  const cleared = status.every((s) => s === 'done')

  // Input lock while a mismatched pair is showing; no render depends on it.
  const lockRef = useRef(false)
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(hideTimer.current), [])

  const flip = (i: number) => {
    if (lockRef.current || cleared) return
    const r = flipCard(deck, status, i)
    if (r.outcome === 'ignored') return
    setStatus(r.status)
    if (r.moveDelta === 0) return

    const nextMoves = moves + r.moveDelta
    setMoves(nextMoves)
    if (r.cleared) {
      const isNewBest = onResult(nextMoves)
      setNewBest(isNewBest)
      onStats(makeStats(nextMoves, isNewBest ? nextMoves : best))
      return
    }
    onStats(makeStats(nextMoves, best))
    const pair = r.pair
    if (pair) {
      lockRef.current = true
      hideTimer.current = setTimeout(() => {
        setStatus((s) => hideCards(s, pair))
        lockRef.current = false
      }, MISMATCH_MS)
    }
  }

  return (
    <div className="relative grid aspect-square w-[min(92vw,62vh,480px)] grid-cols-4 grid-rows-4 gap-[2.6cqw] [container-type:inline-size]">
      {deck.map((card, i) => {
        const s = status[i]
        const faceUp = s !== 'down'
        return (
          <button
            key={i}
            type="button"
            aria-label={faceUp ? `Card ${i + 1}: ${card.sym}` : `Card ${i + 1}, face down`}
            data-state={s}
            data-sym={faceUp ? card.sym : undefined}
            onClick={() => flip(i)}
            className={`flex cursor-pointer items-center justify-center rounded-xl border p-0 text-[11cqw] leading-none text-on-accent transition-[background-color,opacity] duration-300 ${
              faceUp ? '' : 'border-ink-600 bg-ink-750'
            } ${s === 'done' ? 'opacity-45' : 'opacity-100'}`}
            style={faceUp ? { background: card.color, borderColor: card.color, ...TEXT_GLYPH } : undefined}
          >
            {faceUp ? <span>{card.sym}</span> : <span className="size-[2.4cqw] rounded-full bg-ink-500" />}
          </button>
        )
      })}
      {cleared ? (
        <div className="absolute -inset-2 rounded-[18px]">
          <GameOverlay
            kicker={newBest ? 'New best' : 'Board cleared'}
            headline={`${moves} moves`}
            action="Play again"
            onAction={() => {
              onStats(makeStats(0, newBest ? moves : best))
              onAgain()
            }}
          />
        </div>
      ) : null}
    </div>
  )
}

export default function Recall({ onStats, onResult }: GameProps) {
  // Play again = remount the board (fresh shuffle, fresh state).
  const [round, setRound] = useState(0)
  return (
    <RecallBoard key={round} onStats={onStats} onResult={onResult} onAgain={() => setRound((r) => r + 1)} />
  )
}
