import { describe, expect, it } from 'vitest'
import { drawFromMarket, newGame } from './engine'
import type { Card, CardShape, WhotState } from './engine'
import { DEFAULT_RULES } from './rules'
import type { Rules } from './rules'
import { whotSounds } from './sounds'

let id = 5000
const c = (s: CardShape, n: number): Card => ({ id: id++, s, n })
const cards = (n: number): Array<Card> =>
  Array.from({ length: n }, () => c('star', 4))

function state(over: Partial<WhotState> = {}): WhotState {
  return {
    deck: cards(10),
    pile: [c('circle', 3)],
    hand: [c('circle', 7), c('square', 3), c('cross', 10)],
    cpu: cards(4),
    turn: 'you',
    req: null,
    picking: false,
    over: null,
    msg: '',
    log: [],
    rules: DEFAULT_RULES,
    known: [],
    voids: {},
    bad: null,
    ...over,
  }
}

const next = (a: WhotState, over: Partial<WhotState>) => ({ ...a, ...over })

describe('whotSounds', () => {
  it('is silent for a plain card', () => {
    const a = state()
    const b = next(a, {
      pile: [...a.pile, c('circle', 7)],
      hand: a.hand.slice(1),
    })
    expect(whotSounds(a, b)).toEqual([])
  })

  it.each([1, 2, 8, 14, 20])('plays special for a %i', (n) => {
    const a = state()
    const b = next(a, {
      pile: [...a.pile, c('circle', n)],
      hand: a.hand.slice(1),
    })
    expect(whotSounds(a, b)).toEqual(['special'])
  })

  it('follows the active rules: a 5 is special only when enabled', () => {
    const on: Rules = { specials: { ...DEFAULT_RULES.specials, 5: true } }
    const play5 = (rules: Rules) => {
      const a = state({ rules })
      return whotSounds(
        a,
        next(a, { pile: [...a.pile, c('circle', 5)], hand: a.hand.slice(1) }),
      )
    }
    expect(play5(DEFAULT_RULES)).toEqual([])
    expect(play5(on)).toEqual(['special'])
  })

  it('CPU 8 then 2 chain: special, special, then draw for your penalty', () => {
    const a = state({ turn: 'cpu' })
    const eight = next(a, {
      pile: [...a.pile, c('circle', 8)],
      cpu: a.cpu.slice(1),
    })
    const two = next(eight, {
      pile: [...eight.pile, c('circle', 2)],
      cpu: eight.cpu.slice(1),
      hand: [...eight.hand, c('star', 4), c('star', 4)],
      deck: eight.deck.slice(2),
    })
    expect(whotSounds(a, eight)).toEqual(['special'])
    expect(whotSounds(eight, two)).toEqual(['special', 'draw'])
  })

  it('plays draw when either hand grows from the market', () => {
    const a = state()
    expect(
      whotSounds(
        a,
        next(a, { hand: [...a.hand, c('star', 4)], deck: a.deck.slice(1) }),
      ),
    ).toEqual(['draw'])
    expect(
      whotSounds(
        a,
        next(a, { cpu: [...a.cpu, c('star', 4)], deck: a.deck.slice(1) }),
      ),
    ).toEqual(['draw'])
  })

  it('plays last when your hand or the CPU hand drops to exactly one card', () => {
    const a = state({ hand: [c('circle', 7), c('square', 3)] })
    expect(
      whotSounds(
        a,
        next(a, { pile: [...a.pile, c('circle', 7)], hand: a.hand.slice(1) }),
      ),
    ).toEqual(['last'])
    const b = state({ cpu: cards(2) })
    expect(
      whotSounds(
        b,
        next(b, { pile: [...b.pile, c('circle', 7)], cpu: b.cpu.slice(1) }),
      ),
    ).toEqual(['last'])
  })

  it('does not repeat last while a hand stays at one card', () => {
    const a = state({ hand: [c('circle', 7)] })
    expect(whotSounds(a, next(a, { cpu: cards(3) }))).toEqual([])
  })

  it('with 6 cards in the market the next draw plays draw then low', () => {
    const a = state({ deck: cards(6) })
    const b = next(a, {
      hand: [...a.hand, c('star', 4)],
      deck: a.deck.slice(1),
    })
    expect(whotSounds(a, b)).toEqual(['draw', 'low'])
  })

  it('low fires on each draw at 5 or fewer, not when the market is unchanged', () => {
    const a = state({ deck: cards(5) })
    expect(
      whotSounds(
        a,
        next(a, { hand: [...a.hand, c('star', 4)], deck: a.deck.slice(1) }),
      ),
    ).toEqual(['draw', 'low'])
    expect(whotSounds(a, next(a, { turn: 'cpu' }))).toEqual([])
  })

  it('orders special, draw, low', () => {
    const a = state({ deck: cards(6), hand: [c('circle', 7)], turn: 'cpu' })
    const b = next(a, {
      pile: [...a.pile, c('circle', 2)],
      cpu: a.cpu.slice(1),
      hand: [...a.hand, c('star', 4)],
      deck: a.deck.slice(1),
    })
    expect(whotSounds(a, b)).toEqual(['special', 'draw', 'low'])
  })

  it.each([
    ['win', 'win'],
    ['loss', 'lose'],
    ['draw', 'tie'],
  ] as const)('game over (%s) plays only the %s sound', (result, sound) => {
    const a = state({ deck: cards(6) })
    const b = next(a, {
      pile: [...a.pile, c('circle', 2)],
      hand: [],
      deck: a.deck.slice(1),
      over: { result, reason: 'out', yourTotal: 0, cpuTotal: 5 },
    })
    expect(whotSounds(a, b)).toEqual([sound])
  })

  it('after game over, later changes use the normal rules (no result sound again)', () => {
    const over = state({
      over: { result: 'win', reason: 'out', yourTotal: 0, cpuTotal: 5 },
    })
    expect(
      whotSounds(over, next(over, { cpu: [...over.cpu, c('star', 4)] })),
    ).toEqual(['draw'])
  })

  it('works on real engine transitions', () => {
    const g = newGame(() => 0.7, 'Easy', DEFAULT_RULES)
    const drawn = drawFromMarket(
      { ...g, turn: 'you', picking: false, over: null },
      'you',
    )
    expect(whotSounds(g, drawn)).toContain('draw')
  })

  describe('Expert wrong card', () => {
    it('plays buzz, then draw for the penalty card', () => {
      const a = state({ turn: 'you' })
      const b = next(a, {
        hand: [...a.hand, c('star', 4)],
        deck: a.deck.slice(1),
        bad: a.hand[0].id,
        turn: 'cpu',
      })
      expect(whotSounds(a, b)).toEqual(['buzz', 'draw'])
    })

    it('adds low when the penalty draw leaves the market at 5 or fewer', () => {
      const a = state({ turn: 'you', deck: cards(6) })
      const b = next(a, {
        hand: [...a.hand, c('star', 4)],
        deck: a.deck.slice(1),
        bad: a.hand[0].id,
      })
      expect(whotSounds(a, b)).toEqual(['buzz', 'draw', 'low'])
    })

    it('is silent once the flag has cleared (the CPU reply does not buzz)', () => {
      const a = state({ bad: 1 })
      expect(
        whotSounds(a, next(a, { bad: null, cpu: a.cpu.slice(1) })),
      ).toEqual([])
    })

    it('game over still plays only the result sound', () => {
      const a = state({ turn: 'you', deck: cards(1) })
      const b = next(a, {
        deck: [],
        hand: [...a.hand, c('star', 4)],
        bad: a.hand[0].id,
        over: { result: 'loss', reason: 'count', yourTotal: 30, cpuTotal: 8 },
      })
      expect(whotSounds(a, b)).toEqual(['lose'])
    })
  })
})
