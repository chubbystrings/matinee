export type Mark = 'X' | 'O'
export type Cell = Mark | ''
export type Board = readonly Cell[]
export type Outcome = { winner: Mark | 'D'; line: readonly number[] }
export type CpuLevel = 'Casual' | 'Perfect'

export const LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export const CASUAL_RANDOM_CHANCE = 0.35

export const emptyBoard = (): Cell[] => Array<Cell>(9).fill('')

/** Winner + winning line, a draw when full, or null while the game is on. */
export function getOutcome(b: Board): Outcome | null {
  for (const [x, y, z] of LINES) {
    const m = b[x]
    if (m && m === b[y] && m === b[z]) return { winner: m, line: [x, y, z] }
  }
  return b.every(Boolean) ? { winner: 'D', line: [] } : null
}

/** CPU is O (maximiser, +10), player is X (-10). */
function minimax(b: Cell[], turn: Mark): number {
  const out = getOutcome(b)
  if (out) return out.winner === 'O' ? 10 : out.winner === 'X' ? -10 : 0
  const maximising = turn === 'O'
  let best = maximising ? -99 : 99
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = turn
    const score = minimax(b, turn === 'O' ? 'X' : 'O')
    b[i] = ''
    best = maximising ? Math.max(best, score) : Math.min(best, score)
  }
  return best
}

export function bestMove(board: Board): number {
  const b = [...board]
  let bestScore = -99
  let move = -1
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = 'O'
    const score = minimax(b, 'X')
    b[i] = ''
    if (score > bestScore) {
      bestScore = score
      move = i
    }
  }
  return move
}

/** Picks the CPU's cell. `rng` is injectable (defaults to Math.random). */
export function cpuMove(board: Board, level: CpuLevel, rng: () => number = Math.random): number {
  const free: number[] = []
  board.forEach((v, i) => {
    if (!v) free.push(i)
  })
  if (free.length === 0) return -1
  if (level === 'Casual' && rng() < CASUAL_RANDOM_CHANCE) {
    return free[Math.floor(rng() * free.length)]
  }
  return bestMove(board)
}

export type Tally = { w: number; l: number; d: number }

export const addResult = (t: Tally, winner: Mark | 'D'): Tally =>
  winner === 'X' ? { ...t, w: t.w + 1 } : winner === 'O' ? { ...t, l: t.l + 1 } : { ...t, d: t.d + 1 }

export const tallyLabel = (t: Tally) => `${t.w}–${t.l}–${t.d}`

export function statusText(turn: Mark, result: Mark | 'D' | null): string {
  if (result === 'X') return 'You win'
  if (result === 'O') return 'CPU wins'
  if (result === 'D') return 'Draw'
  return turn === 'X' ? 'Your move' : 'CPU is thinking…'
}
