export type Rng = () => number

export const SYMBOLS: ReadonlyArray<{ sym: string; color: string }> = [
  { sym: '◆', color: '#C8F031' },
  { sym: '●', color: '#FF7A5C' },
  { sym: '▲', color: '#3FD0E0' },
  { sym: '■', color: '#A98BFF' },
  { sym: '★', color: '#FFC23D' },
  { sym: '✚', color: '#FF6FB5' },
  { sym: '◐', color: '#A98BFF' },
  { sym: '✦', color: '#C8F031' },
]

export const PAIR_COUNT = SYMBOLS.length

export type CardStatus = 'down' | 'up' | 'done'
export type Card = { sym: string; color: string }

/** Fisher-Yates; returns a new array. */
export function shuffle<T>(items: ReadonlyArray<T>, rng: Rng = Math.random): T[] {
  const out = items.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function createDeck(rng: Rng = Math.random): Card[] {
  return shuffle(
    SYMBOLS.flatMap((s) => [s, s]),
    rng,
  )
}

export type FlipOutcome = 'ignored' | 'first' | 'match' | 'mismatch'

export type FlipResult = {
  outcome: FlipOutcome
  status: CardStatus[]
  /** moves added by this flip (1 when a second card is flipped) */
  moveDelta: 0 | 1
  /** indexes of the two cards of a mismatch (to flip back later) */
  pair: [number, number] | null
  cleared: boolean
}

/** Pure flip: flips card `i` and resolves the pair when it is the second one. */
export function flipCard(deck: ReadonlyArray<Card>, status: ReadonlyArray<CardStatus>, i: number): FlipResult {
  if (status[i] !== 'down') {
    return { outcome: 'ignored', status: status.slice(), moveDelta: 0, pair: null, cleared: false }
  }
  const next = status.slice()
  next[i] = 'up'
  const first = status.indexOf('up')
  if (first === -1) return { outcome: 'first', status: next, moveDelta: 0, pair: null, cleared: false }
  if (deck[first].sym === deck[i].sym) {
    next[first] = 'done'
    next[i] = 'done'
    return { outcome: 'match', status: next, moveDelta: 1, pair: null, cleared: next.every((s) => s === 'done') }
  }
  return { outcome: 'mismatch', status: next, moveDelta: 1, pair: [first, i], cleared: false }
}

export function hideCards(status: ReadonlyArray<CardStatus>, pair: readonly [number, number]): CardStatus[] {
  return status.map((s, i) => (i === pair[0] || i === pair[1] ? 'down' : s))
}
