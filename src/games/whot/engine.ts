/**
 * Whot rules engine. Pure: state in, state out. No timers, no randomness except via the
 * injected `rng`, no React. House rules are defined in project_doc/README.md → "Whot".
 */

import { DEFAULT_RULES, specialEffect } from './rules'
import type { Rules } from './rules'

export const SHAPES = ['circle', 'triangle', 'cross', 'square', 'star'] as const
export type Shape = (typeof SHAPES)[number]
export type CardShape = Shape | 'whot'

export type Card = {
  readonly id: number
  readonly s: CardShape
  readonly n: number
}
export type Who = 'you' | 'cpu'
export type Level = 'Easy' | 'Hard' | 'Expert'
export type Result = 'win' | 'loss' | 'draw'
export type Rng = () => number

export type Outcome = {
  result: Result
  /** 'out' = a hand was emptied, 'count' = the market ran out and hands were totalled */
  reason: 'out' | 'count'
  yourTotal?: number
  cpuTotal?: number
  /** The game was played on Expert (set when it ends). */
  expert?: boolean
}

/**
 * One entry per action, never merged. The engine appends them so the UI never builds log text itself.
 * `drawn` is always recorded; hiding the CPU's drawn cards until game over is a display concern (see log.ts).
 */
export type LogEntry = {
  /** 1-based, in order */
  readonly n: number
  /** 'sys' = table events */
  readonly who: Who | 'sys'
  readonly text: string
  /** the card played (or the starter card) */
  readonly card?: Card
  /** cards drawn by this action */
  readonly drawn?: ReadonlyArray<Card>
}

export type WhotState = {
  /** top of the market is the last element */
  readonly deck: ReadonlyArray<Card>
  /** top of the played pile is the last element */
  readonly pile: ReadonlyArray<Card>
  readonly hand: ReadonlyArray<Card>
  readonly cpu: ReadonlyArray<Card>
  /** who acts next (once any shape call is resolved) */
  readonly turn: Who
  /** active WHOT request */
  readonly req: Shape | null
  /** the player must call a shape before anything else happens */
  readonly picking: boolean
  readonly over: Outcome | null
  readonly msg: string
  /** Every action so far, oldest first. */
  readonly log: ReadonlyArray<LogEntry>
  /** Fixed for the whole game, so changing settings never alters a game in progress. */
  readonly rules: Rules
  /**
   * What the Expert CPU may know about your hand: ids of cards you revealed by playing them wrongly
   * (dropped again when you play them) ...
   */
  readonly known: ReadonlyArray<number>
  /**
   * ... and, per shape, a soft allowance: how many cards of it you can still be holding. Drawing
   * voluntarily shows you had no match (allowance 0); every card you draw adds 1 to every entry.
   */
  readonly voids: Readonly<Partial<Record<CardShape, number>>>
  /** The card you just played wrongly on Expert (it shakes); cleared by the next transition. */
  readonly bad: number | null
}

const NUMBERS: Record<Shape, ReadonlyArray<number>> = {
  circle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  triangle: [1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14],
  cross: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  square: [1, 2, 3, 5, 7, 10, 11, 13, 14],
  star: [1, 2, 3, 4, 5, 7, 8],
}
const WHOT_COUNT = 5
const WHOT_NUMBER = 20
const HAND_SIZE = 4

export const SHAPE_NAME: Record<CardShape, string> = {
  circle: 'Circle',
  triangle: 'Triangle',
  cross: 'Cross',
  square: 'Square',
  star: 'Star',
  whot: 'WHOT',
}

const SHAPE_ORDER: Record<CardShape, number> = {
  circle: 0,
  triangle: 1,
  cross: 2,
  square: 3,
  star: 4,
  whot: 5,
}

export const other = (who: Who): Who => (who === 'you' ? 'cpu' : 'you')

export function createDeck(): Array<Card> {
  const deck: Array<Card> = []
  let id = 0
  for (const s of SHAPES)
    for (const n of NUMBERS[s]) deck.push({ id: id++, s, n })
  for (let k = 0; k < WHOT_COUNT; k++)
    deck.push({ id: id++, s: 'whot', n: WHOT_NUMBER })
  return deck
}

export function shuffle<T>(items: ReadonlyArray<T>, rng: Rng): Array<T> {
  const a = items.slice()
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export const cardName = (c: Card) =>
  c.s === 'whot' ? 'WHOT' : `${SHAPE_NAME[c.s]} ${c.n}`

export const handTotal = (cards: ReadonlyArray<Card>) =>
  cards.reduce((sum, c) => sum + c.n, 0)

/** Circle → Triangle → Cross → Square → Star → WHOT, then by number. */
export function sortHand(cards: ReadonlyArray<Card>): Array<Card> {
  return cards.toSorted(
    (a, b) => SHAPE_ORDER[a.s] - SHAPE_ORDER[b.s] || a.n - b.n,
  )
}

export function canPlay(
  card: Card,
  state: Pick<WhotState, 'req' | 'pile'>,
): boolean {
  if (card.s === 'whot') return true
  if (state.req) return card.s === state.req
  const top = state.pile[state.pile.length - 1]
  return card.s === top.s || card.n === top.n
}

const drawText = (who: Who, k: number) =>
  `${who === 'you' ? 'You draw' : 'CPU draws'} ${k}.`

function setHand(
  state: WhotState,
  who: Who,
  cards: ReadonlyArray<Card>,
): WhotState {
  return who === 'you' ? { ...state, hand: cards } : { ...state, cpu: cards }
}

const handOf = (state: WhotState, who: Who) =>
  who === 'you' ? state.hand : state.cpu

function addLog(
  state: WhotState,
  who: LogEntry['who'],
  text: string,
  card?: Card,
  drawn?: ReadonlyArray<Card>,
): WhotState {
  const entry: LogEntry = { n: state.log.length + 1, who, text, card, drawn }
  return { ...state, log: [...state.log, entry] }
}

/** The game ends the moment the market is empty: lowest hand total wins. */
function settleByCount(state: WhotState): WhotState {
  if (state.over) return state
  const yourTotal = handTotal(state.hand)
  const cpuTotal = handTotal(state.cpu)
  const result: Result =
    yourTotal < cpuTotal ? 'win' : yourTotal > cpuTotal ? 'loss' : 'draw'
  const verdict =
    result === 'win' ? 'You win.' : result === 'loss' ? 'CPU wins.' : 'Draw.'
  return addLog(
    { ...state, over: { result, reason: 'count', yourTotal, cpuTotal } },
    'sys',
    `Market empty. Totals: You ${yourTotal}, CPU ${cpuTotal}. ${verdict}`,
  )
}

const mapVoids = (
  voids: WhotState['voids'],
  fn: (allowance: number) => number,
): WhotState['voids'] =>
  Object.fromEntries(Object.entries(voids).map(([s, v]) => [s, fn(v)]))

/**
 * `reason` names why the cards were drawn, for the log: 'Pick two', 'starter Pick two'.
 * Without one it is an ordinary market draw.
 */
function drawCards(
  state: WhotState,
  who: Who,
  k: number,
  reason?: string,
): WhotState {
  const take = Math.min(k, state.deck.length)
  const drawn = state.deck.slice(state.deck.length - take).toReversed()
  let next = setHand(
    { ...state, deck: state.deck.slice(0, state.deck.length - take) },
    who,
    [...handOf(state, who), ...drawn],
  )
  if (who === 'you' && drawn.length > 0)
    next = { ...next, voids: mapVoids(next.voids, (v) => v + drawn.length) }
  if (drawn.length > 0) {
    const why = reason ? ` (${reason})` : ' from the market'
    next = addLog(next, who, `Drew ${drawn.length}${why}.`, undefined, drawn)
  }
  return next.deck.length === 0 ? settleByCount(next) : next
}

export function pickCpuShape(
  cpuHand: ReadonlyArray<Card>,
  level: Level,
  rng: Rng,
): Shape {
  const random = () => SHAPES[Math.floor(rng() * SHAPES.length)]
  if (level === 'Easy') return random()
  const counts = new Map<Shape, number>()
  for (const c of cpuHand)
    if (c.s !== 'whot') counts.set(c.s, (counts.get(c.s) ?? 0) + 1)
  let best: Shape | null = null
  let bestCount = 0
  for (const s of SHAPES) {
    const count = counts.get(s) ?? 0
    if (count > bestCount) {
      best = s
      bestCount = count
    }
  }
  return best ?? random()
}

export function newGame(
  rng: Rng,
  level: Level,
  rules: Rules = DEFAULT_RULES,
): WhotState {
  const deck = shuffle(createDeck(), rng)
  const first: Who = rng() < 0.5 ? 'you' : 'cpu'
  return dealGame(deck, first, level, rng, rules)
}

/** Deal from an already-ordered market (top = last): 4 each, flip one, apply a special starter. */
export function dealGame(
  market: ReadonlyArray<Card>,
  first: Who,
  level: Level,
  rng: Rng,
  rules: Rules = DEFAULT_RULES,
): WhotState {
  const deck = market.slice()
  const hand: Array<Card> = []
  const cpu: Array<Card> = []
  for (let i = 0; i < HAND_SIZE; i++) {
    hand.push(deck.pop()!)
    cpu.push(deck.pop()!)
  }
  const top = deck.pop()!
  const second = other(first)

  let state: WhotState = {
    deck,
    pile: [top],
    hand,
    cpu,
    turn: first,
    req: null,
    picking: false,
    over: null,
    msg: '',
    log: [],
    rules,
    known: [],
    voids: {},
    bad: null,
  }
  state = addLog(
    state,
    'sys',
    `Dealt ${HAND_SIZE} cards each. Starter card: ${cardName(top)}.`,
    top,
  )
  state = addLog(
    state,
    'sys',
    `${first === 'you' ? 'You go' : 'CPU goes'} first (random).`,
  )
  let msg = first === 'you' ? 'You go first.' : 'CPU goes first.'
  const n = top.n
  const fx = specialEffect(rules, n)

  if (fx && fx.draw > 0) {
    state = {
      ...drawCards(state, first, fx.draw, `starter ${fx.name}`),
      turn: second,
    }
    msg += ` Starter is ${fx.name}: ${drawText(first, fx.draw)}`
  } else if (fx) {
    // A starter with no draw effect skips the first player.
    state = addLog(
      { ...state, turn: second },
      first,
      `Skipped (starter ${fx.name}).`,
    )
    msg += ` Starter is ${fx.name}, so ${first === 'you' ? 'you are' : 'CPU is'} skipped.`
  } else if (n === WHOT_NUMBER) {
    if (first === 'you') {
      state = { ...state, picking: true }
      msg += ' Starter is WHOT. Call a shape, then play.'
    } else {
      const req = pickCpuShape(state.cpu, level, rng)
      state = addLog(
        { ...state, req },
        'cpu',
        `Asked for ${SHAPE_NAME[req]} (starter WHOT).`,
      )
      msg += ` Starter is WHOT. CPU asks for ${SHAPE_NAME[req]}.`
    }
  }
  return { ...state, msg }
}

export function playCard(
  state: WhotState,
  who: Who,
  cardId: number,
  level: Level,
  rng: Rng,
  /** The shape the CPU calls when this is a WHOT (the Expert search chooses it). */
  callAs?: Shape,
): WhotState {
  if (state.over || state.picking || state.turn !== who) return state
  const from = handOf(state, who)
  const card = from.find((c) => c.id === cardId)
  if (!card || !canPlay(card, state)) return state

  const rest = from.filter((c) => c.id !== cardId)
  const opp = other(who)
  const name = who === 'you' ? 'You' : 'CPU'
  const onTop = state.pile[state.pile.length - 1]
  // What the log says: the card, what it was played on, and any request it answered.
  const asked = state.req ? ` (asked ${SHAPE_NAME[state.req]})` : ''
  const played = `Played ${cardName(card)} on ${cardName(onTop)}${asked}.`
  let next: WhotState = {
    ...setHand(state, who, rest),
    pile: [...state.pile, card],
    req: null,
    bad: null,
  }
  if (who === 'you') {
    // Playing a card shows it is no longer a secret, and uses up one of that shape's allowance.
    const allowance = next.voids[card.s]
    next = {
      ...next,
      known: next.known.filter((id) => id !== card.id),
      voids:
        allowance === undefined
          ? next.voids
          : { ...next.voids, [card.s]: Math.max(0, allowance - 1) },
    }
  }
  const base = `${name} played ${cardName(card)}.`

  // Emptying your hand wins on the spot; the card's effect is not applied.
  if (rest.length === 0) {
    next = addLog(next, who, `${played} Last card.`, card)
    next = addLog(
      next,
      'sys',
      `${who === 'you' ? 'You win' : 'CPU wins'}: hand empty.`,
    )
    return {
      ...next,
      over: { result: who === 'you' ? 'win' : 'loss', reason: 'out' },
      msg: base,
    }
  }

  if (card.n === WHOT_NUMBER) {
    if (who === 'you')
      return {
        ...addLog(next, who, `${played} Calling a shape…`, card),
        picking: true,
        turn: 'cpu',
        msg: 'You played WHOT. Call a shape.',
      }
    const req = callAs ?? pickCpuShape(rest, level, rng)
    return {
      ...addLog(next, who, `${played} Asks for ${SHAPE_NAME[req]}.`, card),
      req,
      turn: 'you',
      msg: `CPU played WHOT and asks for ${SHAPE_NAME[req]}.`,
    }
  }

  const fx = specialEffect(state.rules, card.n)
  if (!fx) return { ...addLog(next, who, played, card), turn: opp, msg: base }

  // The play entry comes first, then the opponent's penalty draw as its own entry.
  next = addLog(
    next,
    who,
    fx.playAgain ? `${played} Plays again (${fx.name}).` : played,
    card,
  )
  if (fx.draw > 0) next = drawCards(next, opp, fx.draw, fx.name)
  const again = who === 'you' ? 'Play again.' : 'CPU plays again.'
  const detail =
    fx.draw > 0
      ? `${drawText(opp, fx.draw)}${fx.playAgain && !next.over ? ` ${again}` : ''}`
      : fx.playAgain
        ? who === 'you'
          ? 'play again.'
          : again
        : ''
  return {
    ...next,
    turn: fx.playAgain ? who : opp,
    msg: detail ? `${base} ${fx.name}: ${detail}` : `${base} ${fx.name}.`,
  }
}

export function drawFromMarket(state: WhotState, who: Who): WhotState {
  if (state.over || state.picking || state.turn !== who) return state
  let from: WhotState = { ...state, bad: null }
  if (who === 'you') {
    // Drawing by choice shows you had no match for the top card (or the called shape).
    const asked = state.req ?? state.pile[state.pile.length - 1].s
    from = { ...from, voids: { ...from.voids, [asked]: 0, whot: 0 } }
  }
  const next = drawCards(from, who, 1)
  return {
    ...next,
    turn: other(who),
    msg: `${who === 'you' ? 'You drew' : 'CPU drew'} from the market.`,
  }
}

/**
 * Expert only (the caller decides): you tried a card that doesn't match. It stays in your hand, is
 * revealed to the CPU, you draw 1 and the turn passes. The usual empty-market count still applies.
 */
export function playWrongCard(state: WhotState, cardId: number): WhotState {
  if (state.over || state.picking || state.turn !== 'you') return state
  const card = state.hand.find((c) => c.id === cardId)
  if (!card || canPlay(card, state)) return state
  const top = state.pile[state.pile.length - 1]
  const asked = state.req ? ` (asked ${SHAPE_NAME[state.req]})` : ''
  let next = addLog(
    {
      ...state,
      bad: card.id,
      known: state.known.includes(card.id)
        ? state.known
        : [...state.known, card.id],
    },
    'you',
    `Tried ${cardName(card)} on ${cardName(top)}${asked}. Not a match: card returned.`,
    card,
  )
  next = drawCards(next, 'you', 1, 'wrong card')
  return {
    ...next,
    turn: next.over ? next.turn : 'cpu',
    msg: `${cardName(card)} doesn't match. It goes back to your hand, you draw 1 and the CPU plays.`,
  }
}

/** The player's shape call, after playing WHOT or when WHOT started the game. */
export function callShape(state: WhotState, shape: Shape): WhotState {
  if (!state.picking || state.over) return state
  const yourMove = state.turn === 'you'
  return {
    ...addLog(state, 'you', `Asked for ${SHAPE_NAME[shape]}.`),
    req: shape,
    bad: null,
    picking: false,
    msg: `You asked for ${SHAPE_NAME[shape]}.${yourMove ? ' Your move.' : ''}`,
  }
}

function scoreHard(card: Card, state: WhotState, legalCount: number): number {
  if (card.s === 'whot') return legalCount === 1 ? 0 : -40
  const sameShape = state.cpu.reduce((k, c) => k + (c.s === card.s ? 1 : 0), 0)
  let score = 3 * sameShape + 0.4 * card.n
  const fx = specialEffect(state.rules, card.n)
  if (fx) {
    score += 30 + fx.cpuBonus
    // A draw penalty of 2+ is worth saving for when the player is close to winning.
    if (state.hand.length <= 2 && fx.draw >= 2) score += 20
  }
  return score
}

export function pickCpuCard(
  state: WhotState,
  legal: ReadonlyArray<Card>,
  level: Level,
  rng: Rng,
): Card {
  if (level === 'Easy') return legal[Math.floor(rng() * legal.length)]
  let best = legal[0]
  let bestScore = -Infinity
  for (const card of legal) {
    const score = scoreHard(card, state, legal.length)
    if (score > bestScore) {
      best = card
      bestScore = score
    }
  }
  return best
}

/** One CPU action: play a legal card, or draw when none is legal. */
export function cpuMove(state: WhotState, level: Level, rng: Rng): WhotState {
  if (state.over || state.picking || state.turn !== 'cpu') return state
  const legal = state.cpu.filter((c) => canPlay(c, state))
  if (legal.length === 0) return drawFromMarket(state, 'cpu')
  return playCard(
    state,
    'cpu',
    pickCpuCard(state, legal, level, rng).id,
    level,
    rng,
  )
}
