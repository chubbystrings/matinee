/**
 * Whot rules engine. Pure: state in, state out. No timers, no randomness except via the
 * injected `rng`, no React. House rules are defined in project_doc/README.md → "Whot".
 */

export const SHAPES = ['circle', 'triangle', 'cross', 'square', 'star'] as const
export type Shape = (typeof SHAPES)[number]
export type CardShape = Shape | 'whot'

export type Card = {
  readonly id: number
  readonly s: CardShape
  readonly n: number
}
export type Who = 'you' | 'cpu'
export type Level = 'Easy' | 'Hard'
export type Result = 'win' | 'loss' | 'draw'
export type Rng = () => number

export type Outcome = {
  result: Result
  /** 'out' = a hand was emptied, 'count' = the market ran out and hands were totalled */
  reason: 'out' | 'count'
  yourTotal?: number
  cpuTotal?: number
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

export const SPECIAL_NAME: Readonly<Record<number, string>> = {
  1: 'Hold on',
  2: 'Pick two',
  5: 'Pick three',
  8: 'Suspension',
  14: 'General market',
  20: 'WHOT',
}

/** How many cards the opponent draws for each penalty card. */
const PENALTY: Readonly<Record<number, number>> = { 2: 2, 5: 3, 14: 1 }
/** Cards that give the same player another turn. */
const PLAY_AGAIN = new Set([1, 2, 5, 8, 14])
/** Cards the hard CPU treats as specials. */
const HARD_SPECIAL_BONUS: Readonly<Record<number, number>> = {
  1: 0,
  8: 0,
  14: 4,
  2: 6,
  5: 8,
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

/** The game ends the moment the market is empty: lowest hand total wins. */
function settleByCount(state: WhotState): WhotState {
  if (state.over) return state
  const yourTotal = handTotal(state.hand)
  const cpuTotal = handTotal(state.cpu)
  const result: Result =
    yourTotal < cpuTotal ? 'win' : yourTotal > cpuTotal ? 'loss' : 'draw'
  return { ...state, over: { result, reason: 'count', yourTotal, cpuTotal } }
}

function drawCards(state: WhotState, who: Who, k: number): WhotState {
  const take = Math.min(k, state.deck.length)
  const drawn = state.deck.slice(state.deck.length - take).toReversed()
  const next = setHand(
    { ...state, deck: state.deck.slice(0, state.deck.length - take) },
    who,
    [...handOf(state, who), ...drawn],
  )
  return next.deck.length === 0 ? settleByCount(next) : next
}

export function pickCpuShape(
  cpuHand: ReadonlyArray<Card>,
  level: Level,
  rng: Rng,
): Shape {
  const random = () => SHAPES[Math.floor(rng() * SHAPES.length)]
  if (level !== 'Hard') return random()
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

export function newGame(rng: Rng, level: Level): WhotState {
  const deck = shuffle(createDeck(), rng)
  const first: Who = rng() < 0.5 ? 'you' : 'cpu'
  return dealGame(deck, first, level, rng)
}

/** Deal from an already-ordered market (top = last): 4 each, flip one, apply a special starter. */
export function dealGame(
  market: ReadonlyArray<Card>,
  first: Who,
  level: Level,
  rng: Rng,
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
  }
  let msg = first === 'you' ? 'You go first.' : 'CPU goes first.'
  const n = top.n
  const special = SPECIAL_NAME[n] as string | undefined

  if (n === 1 || n === 8) {
    state = { ...state, turn: second }
    msg += ` Starter is ${special}, so ${first === 'you' ? 'you are' : 'CPU is'} skipped.`
  } else if (n in PENALTY) {
    const k = PENALTY[n]
    state = { ...drawCards(state, first, k), turn: second }
    msg += ` Starter is ${special}: ${drawText(first, k)}`
  } else if (n === WHOT_NUMBER) {
    if (first === 'you') {
      state = { ...state, picking: true }
      msg += ' Starter is WHOT. Call a shape, then play.'
    } else {
      const req = pickCpuShape(state.cpu, level, rng)
      state = { ...state, req }
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
): WhotState {
  if (state.over || state.picking || state.turn !== who) return state
  const from = handOf(state, who)
  const card = from.find((c) => c.id === cardId)
  if (!card || !canPlay(card, state)) return state

  const rest = from.filter((c) => c.id !== cardId)
  const opp = other(who)
  const name = who === 'you' ? 'You' : 'CPU'
  let next: WhotState = {
    ...setHand(state, who, rest),
    pile: [...state.pile, card],
    req: null,
  }
  const base = `${name} played ${cardName(card)}.`

  // Emptying your hand wins on the spot; the card's effect is not applied.
  if (rest.length === 0) {
    return {
      ...next,
      over: { result: who === 'you' ? 'win' : 'loss', reason: 'out' },
      msg: base,
    }
  }

  if (card.n === WHOT_NUMBER) {
    if (who === 'you')
      return {
        ...next,
        picking: true,
        turn: 'cpu',
        msg: 'You played WHOT. Call a shape.',
      }
    const req = pickCpuShape(rest, level, rng)
    return {
      ...next,
      req,
      turn: 'you',
      msg: `CPU played WHOT and asks for ${SHAPE_NAME[req]}.`,
    }
  }

  const again = who === 'you' ? 'play again.' : 'CPU plays again.'
  const special = SPECIAL_NAME[card.n]
  if (card.n in PENALTY) {
    const k = PENALTY[card.n]
    next = { ...drawCards(next, opp, k), turn: who }
    const tail = next.over
      ? ''
      : ` ${who === 'you' ? 'Play again.' : 'CPU plays again.'}`
    return { ...next, msg: `${base} ${special}: ${drawText(opp, k)}${tail}` }
  }
  if (PLAY_AGAIN.has(card.n))
    return { ...next, turn: who, msg: `${base} ${special}: ${again}` }
  return { ...next, turn: opp, msg: base }
}

export function drawFromMarket(state: WhotState, who: Who): WhotState {
  if (state.over || state.picking || state.turn !== who) return state
  const next = drawCards(state, who, 1)
  return {
    ...next,
    turn: other(who),
    msg: `${who === 'you' ? 'You drew' : 'CPU drew'} from the market.`,
  }
}

/** The player's shape call, after playing WHOT or when WHOT started the game. */
export function callShape(state: WhotState, shape: Shape): WhotState {
  if (!state.picking || state.over) return state
  const yourMove = state.turn === 'you'
  return {
    ...state,
    req: shape,
    picking: false,
    msg: `You asked for ${SHAPE_NAME[shape]}.${yourMove ? ' Your move.' : ''}`,
  }
}

function scoreHard(
  card: Card,
  cpuHand: ReadonlyArray<Card>,
  playerHandSize: number,
  legalCount: number,
): number {
  if (card.s === 'whot') return legalCount === 1 ? 0 : -40
  const sameShape = cpuHand.reduce((k, c) => k + (c.s === card.s ? 1 : 0), 0)
  let score = 3 * sameShape + 0.4 * card.n
  if (card.n in HARD_SPECIAL_BONUS) score += 30 + HARD_SPECIAL_BONUS[card.n]
  if (playerHandSize <= 2 && (card.n === 2 || card.n === 5)) score += 20
  return score
}

export function pickCpuCard(
  state: WhotState,
  legal: ReadonlyArray<Card>,
  level: Level,
  rng: Rng,
): Card {
  if (level !== 'Hard') return legal[Math.floor(rng() * legal.length)]
  let best = legal[0]
  let bestScore = -Infinity
  for (const card of legal) {
    const score = scoreHard(card, state.cpu, state.hand.length, legal.length)
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
