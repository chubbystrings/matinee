import { createDeck } from './engine'
import type { Card, CardShape, Rng, WhotState } from './engine'
import { DEFAULT_RULES } from './rules'

/** Deterministic Rng (mulberry32). Test helper: not imported by app code. */
export function seeded(seed: number): Rng {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** The real card with this shape and number (ids match createDeck, as in a real game). */
export function real(
  s: CardShape,
  n: number,
  skip: ReadonlyArray<Card> = [],
): Card {
  const taken = new Set(skip.map((c) => c.id))
  const found = createDeck().find(
    (c) => c.s === s && c.n === n && !taken.has(c.id),
  )
  if (!found) throw new Error(`no ${s} ${n}`)
  return found
}

/**
 * A consistent mid-game state built from real cards: `hand`, `cpu` and `pile` as given and everything
 * else in the market, so all 54 cards are accounted for.
 */
export function table(
  parts: {
    hand: Array<Card>
    cpu: Array<Card>
    pile: Array<Card>
  } & Partial<WhotState>,
): WhotState {
  const used = new Set(
    [...parts.hand, ...parts.cpu, ...parts.pile].map((c) => c.id),
  )
  return {
    deck: createDeck().filter((c) => !used.has(c.id)),
    turn: 'cpu',
    req: null,
    picking: false,
    over: null,
    msg: '',
    log: [],
    rules: DEFAULT_RULES,
    known: [],
    voids: {},
    bad: null,
    ...parts,
  }
}
