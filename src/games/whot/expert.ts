/**
 * Expert CPU: determinized Monte Carlo search.
 *
 * Your hidden cards and the market are reshuffled into many possible worlds (respecting the cards you
 * revealed with wrong plays and the shapes you showed you lacked), every candidate move is played out
 * to the end, and the move with the best win rate is chosen.
 *
 * The CPU may only use what a player could see: its own hand, the pile, the called shape, the sizes of
 * the hands and market, `known` and `voids`. It never reads your hand or the market order: the pool of
 * unseen cards is derived from the full deck minus the cards it can see.
 */

import {
  SHAPES,
  canPlay,
  createDeck,
  drawFromMarket,
  handTotal,
  playCard,
  shuffle,
} from './engine'
import type { Card, CardShape, Rng, Shape, WhotState } from './engine'
import { specialEffect } from './rules'
import type { Rules } from './rules'

export type SearchOptions = {
  /** Time after the minimum per-move playouts. Default 380 ms. */
  budgetMs?: number
  /** Playouts every candidate gets before the clock is checked. Default 40. */
  minPerMove?: number
  /** Hard cap on playouts. Default 8000. */
  maxPlayouts?: number
  now?: () => number
}

const MAX_PLIES = 400
const MAX_RESHUFFLES = 12

/** Seats in a playout: 0 = you, 1 = the CPU. The score is from the CPU's side. */
type Seat = 0 | 1
type Sim = {
  /** market, top = last */
  deck: Array<Card>
  top: Card
  req: Shape | null
  hands: [Array<Card>, Array<Card>]
  turn: Seat
  rules: Rules
  rng: Rng
}

type Candidate = { index: number; shape?: Shape; wins: number; plays: number }

const SPECIAL_BONUS = 30

/** The shape held most of (WHOT excluded); a random one when the hand has none. */
function mostHeld(hand: ReadonlyArray<Card>, rng: Rng): Shape {
  const counts = new Map<Shape, number>()
  let best: Shape | null = null
  for (const c of hand) {
    if (c.s === 'whot') continue
    const n = (counts.get(c.s) ?? 0) + 1
    counts.set(c.s, n)
    if (best === null || n > (counts.get(best) ?? 0)) best = c.s
  }
  return best ?? SHAPES[Math.floor(rng() * SHAPES.length)]
}

/** Count at the end of the market: lowest total wins. From the CPU's side. */
function settle(s: Sim): number {
  const yours = handTotal(s.hands[0])
  const cpus = handTotal(s.hands[1])
  return cpus < yours ? 1 : cpus > yours ? 0 : 0.5
}

/** Draw `k`; if that empties the market the game ends on the count. */
function draw(s: Sim, seat: Seat, k: number): number | null {
  const hand = s.hands[seat]
  for (let i = 0; i < k && s.deck.length; i++) hand.push(s.deck.pop()!)
  return s.deck.length ? null : settle(s)
}

/** Plays hand[index] for `seat`. Returns the result when the playout ends, otherwise null. */
function play(s: Sim, seat: Seat, index: number, shape?: Shape): number | null {
  const hand = s.hands[seat]
  const card = hand.splice(index, 1)[0]
  s.top = card
  s.req = null
  if (!hand.length) return seat // seat 1 (the CPU) emptying its hand scores 1
  if (card.s === 'whot') {
    s.req = shape ?? mostHeld(hand, s.rng)
    s.turn = (1 - seat) as Seat
    return null
  }
  const fx = specialEffect(s.rules, card.n)
  if (!fx) {
    s.turn = (1 - seat) as Seat
    return null
  }
  if (fx.draw > 0) {
    const r = draw(s, (1 - seat) as Seat, fx.draw)
    if (r !== null) return r
  }
  s.turn = fx.playAgain ? seat : ((1 - seat) as Seat)
  return null
}

const legalIn = (s: Sim, c: Card) => canPlay(c, { req: s.req, pile: [s.top] })

/** The fast policy both sides use in a playout. -1 when nothing is legal. */
function pick(s: Sim, seat: Seat): number {
  const hand = s.hands[seat]
  const opp = s.hands[1 - seat].length
  const counts = new Map<CardShape, number>()
  for (const c of hand) counts.set(c.s, (counts.get(c.s) ?? 0) + 1)
  let best = -1
  let bestScore = -Infinity
  for (let i = 0; i < hand.length; i++) {
    const c = hand[i]
    if (!legalIn(s, c)) continue
    let score: number
    if (c.s === 'whot') score = -40
    else {
      score = 3 * (counts.get(c.s) ?? 0) + 0.4 * c.n
      const fx = specialEffect(s.rules, c.n)
      if (fx) {
        score += SPECIAL_BONUS
        if (opp <= 2 && fx.draw >= 2) score += 20
      }
    }
    score += s.rng() * 6
    if (score > bestScore) {
      bestScore = score
      best = i
    }
  }
  return best
}

function rollout(s: Sim): number {
  for (let ply = 0; ply < MAX_PLIES; ply++) {
    const seat = s.turn
    const i = pick(s, seat)
    let r: number | null
    if (i < 0) {
      r = draw(s, seat, 1)
      s.turn = (1 - seat) as Seat
    } else r = play(s, seat, i)
    if (r !== null) return r
  }
  const a = s.hands[0].length
  const b = s.hands[1].length
  return b < a ? 1 : b > a ? 0 : 0.5
}

/**
 * Splits the unseen cards into your hand (`need` cards) and the market. Re-shuffles up to 12 times
 * until every void shape with allowance < need has at most that many cards in your sampled hand.
 */
export function deal(
  pool: ReadonlyArray<Card>,
  need: number,
  voids: WhotState['voids'],
  rng: Rng,
): { hand: Array<Card>; deck: Array<Card> } {
  const strict = (Object.keys(voids) as Array<CardShape>).filter(
    (s) => (voids[s] ?? 0) < need,
  )
  let a: Array<Card> = []
  for (let t = 0; t < MAX_RESHUFFLES; t++) {
    a = shuffle(pool, rng)
    if (!strict.length) break
    const counts = new Map<CardShape, number>()
    for (let i = 0; i < need; i++)
      counts.set(a[i].s, (counts.get(a[i].s) ?? 0) + 1)
    if (strict.every((s) => (counts.get(s) ?? 0) <= (voids[s] ?? 0))) break
  }
  return { hand: a.slice(0, need), deck: a.slice(need) }
}

/** Distinct legal cards; a WHOT expands into one move per shape to call. */
function candidates(state: WhotState): Array<Candidate> {
  const moves: Array<Candidate> = []
  const seen = new Set<string>()
  state.cpu.forEach((c, index) => {
    if (!canPlay(c, state)) return
    const key = `${c.s}${c.n}`
    if (seen.has(key)) return
    seen.add(key)
    if (c.s === 'whot')
      for (const shape of SHAPES)
        moves.push({ index, shape, wins: 0, plays: 0 })
    else moves.push({ index, wins: 0, plays: 0 })
  })
  return moves
}

/** The cards the CPU cannot see: everything except its hand, the pile and what you revealed. */
export function unseen(state: WhotState): Array<Card> {
  const seen = new Set<number>(state.known)
  for (const c of state.cpu) seen.add(c.id)
  for (const c of state.pile) seen.add(c.id)
  return createDeck().filter((c) => !seen.has(c.id))
}

/** Picks the CPU's card (and the shape to call, for WHOT). Null when it has nothing legal. */
export function searchMove(
  state: WhotState,
  rng: Rng,
  options: SearchOptions = {},
): { cardId: number; shape?: Shape } | null {
  const moves = candidates(state)
  if (!moves.length) return null
  const only = (m: Candidate) => ({
    cardId: state.cpu[m.index].id,
    shape: m.shape,
  })
  if (moves.length === 1) return only(moves[0])

  const {
    budgetMs = 380,
    minPerMove = 40,
    maxPlayouts = 8000,
    now = () => performance.now(),
  } = options
  const pool = unseen(state)
  const revealed = createDeck().filter((c) => state.known.includes(c.id))
  const need = Math.max(0, state.hand.length - revealed.length)
  const top = state.pile[state.pile.length - 1]
  const t0 = now()

  let n = 0
  while (
    n < maxPlayouts &&
    (n < moves.length * minPerMove || now() - t0 < budgetMs)
  ) {
    const m = moves[n % moves.length]
    n++
    const dealt = deal(pool, need, state.voids, rng)
    const sim: Sim = {
      deck: dealt.deck,
      top,
      req: state.req,
      hands: [[...revealed, ...dealt.hand], state.cpu.slice()],
      turn: 1,
      rules: state.rules,
      rng,
    }
    let r = play(sim, 1, m.index, m.shape)
    if (r === null) r = rollout(sim)
    m.wins += r
    m.plays++
  }
  return only(
    moves.reduce((a, b) => (b.wins / b.plays > a.wins / a.plays ? b : a)),
  )
}

/** One Expert CPU action: search for the best card, or draw when none is legal. */
export function expertMove(
  state: WhotState,
  rng: Rng,
  options?: SearchOptions,
): WhotState {
  if (state.over || state.picking || state.turn !== 'cpu') return state
  const move = searchMove(state, rng, options)
  if (!move) return drawFromMarket(state, 'cpu')
  return playCard(state, 'cpu', move.cardId, 'Expert', rng, move.shape)
}
