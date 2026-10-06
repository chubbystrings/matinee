import { describe, expect, it } from 'vitest'
import {
  SHAPES,
  callShape,
  canPlay,
  cpuMove,
  createDeck,
  dealGame,
  drawFromMarket,
  handTotal,
  newGame,
  pickCpuCard,
  pickCpuShape,
  playCard,
  shuffle,
  sortHand,
} from './engine'
import type { Card, CardShape, Rng, WhotState } from './engine'

let nextId = 1000
const c = (s: CardShape, n: number): Card => ({ id: nextId++, s, n })
const seq =
  (...values: Array<number>): Rng =>
  () =>
    values.shift() ?? 0.5

function state(over: Partial<WhotState> = {}): WhotState {
  return {
    deck: [
      c('star', 1),
      c('star', 2),
      c('star', 3),
      c('star', 4),
      c('star', 5),
      c('star', 7),
    ],
    pile: [c('circle', 3)],
    hand: [c('circle', 7), c('square', 3), c('cross', 10)],
    cpu: [c('triangle', 4), c('star', 8)],
    turn: 'you',
    req: null,
    picking: false,
    over: null,
    msg: '',
    ...over,
  }
}

describe('deck', () => {
  const deck = createDeck()
  it('has 54 cards with the agreed composition', () => {
    expect(deck).toHaveLength(54)
    const count = (s: CardShape) => deck.filter((d) => d.s === s).length
    expect([
      count('circle'),
      count('triangle'),
      count('cross'),
      count('square'),
      count('star'),
      count('whot'),
    ]).toEqual([12, 12, 9, 9, 7, 5])
    expect(new Set(deck.map((d) => d.id)).size).toBe(54)
  })
  it('uses the right numbers per shape', () => {
    const nums = (s: CardShape) => deck.filter((d) => d.s === s).map((d) => d.n)
    expect(nums('circle')).toEqual([1, 2, 3, 4, 5, 7, 8, 10, 11, 12, 13, 14])
    expect(nums('cross')).toEqual([1, 2, 3, 5, 7, 10, 11, 13, 14])
    expect(nums('star')).toEqual([1, 2, 3, 4, 5, 7, 8])
    expect(nums('whot')).toEqual([20, 20, 20, 20, 20])
  })
  it('shuffle keeps every card and does not mutate the input', () => {
    const before = deck.map((d) => d.id)
    const out = shuffle(deck, Math.random)
    expect(out.map((d) => d.id).toSorted((a, b) => a - b)).toEqual(before)
    expect(deck.map((d) => d.id)).toEqual(before)
  })
})

describe('newGame / dealGame', () => {
  it('deals 4 each, flips one, leaves 45 in the market', () => {
    const g = deal(c('circle', 3), 'you', () => 0.5, createDeck())
    expect(g.hand).toHaveLength(4)
    expect(g.cpu).toHaveLength(4)
    expect(g.pile).toHaveLength(1)
    expect(g.deck).toHaveLength(45)
    expect(
      new Set([...g.deck, ...g.pile, ...g.hand, ...g.cpu].map((x) => x.id))
        .size,
    ).toBe(54)
  })

  it('picks the first player at random', () => {
    expect(newGame(() => 0.1, 'Easy').msg.startsWith('You go first.')).toBe(
      true,
    )
    expect(newGame(() => 0.9, 'Easy').msg.startsWith('CPU goes first.')).toBe(
      true,
    )
  })

  // market top = last element; deal order is you, cpu ×4, then the starter
  const deal = (
    starter: Card,
    first: 'you' | 'cpu',
    rng: Rng = () => 0.5,
    full?: Array<Card>,
  ) => {
    if (full) return dealGame(full, first, 'Easy', rng)
    // 8 dealt cards are popped first, then the starter, then the rest
    const filler = Array.from({ length: 36 }, (_, i) => c('star', (i % 3) + 1))
    const dealt = Array.from({ length: 8 }, (_, i) => c('square', 10 + (i % 2)))
    return dealGame([...filler, starter, ...dealt], first, 'Easy', rng)
  }

  it('a plain starter changes nothing', () => {
    const g = deal(c('circle', 3), 'you')
    expect(g.turn).toBe('you')
    expect(g.hand).toHaveLength(4)
    expect(g.msg).toBe('You go first.')
  })
  it.each([1, 8])('starter %i skips the first player', (n) => {
    expect(deal(c('circle', n), 'you').turn).toBe('cpu')
    expect(deal(c('circle', n), 'cpu').turn).toBe('you')
    expect(deal(c('circle', n), 'you').msg).toContain('you are skipped')
    expect(deal(c('circle', n), 'cpu').msg).toContain('CPU is skipped')
  })
  it.each([
    [2, 2],
    [5, 3],
    [14, 1],
  ])(
    'starter %i makes the first player draw %i, then the other player starts',
    (n, k) => {
      const g = deal(c('circle', n), 'you')
      expect(g.hand).toHaveLength(4 + k)
      expect(g.turn).toBe('cpu')
      expect(g.msg).toContain(`You draw ${k}.`)
      const h = deal(c('circle', n), 'cpu')
      expect(h.cpu).toHaveLength(4 + k)
      expect(h.turn).toBe('you')
      expect(h.msg).toContain(`CPU draws ${k}.`)
    },
  )
  it('WHOT starter: you call a shape then play; the CPU calls its own', () => {
    const g = deal(c('whot', 20), 'you')
    expect(g.picking).toBe(true)
    expect(g.turn).toBe('you')
    expect(callShape(g, 'cross')).toMatchObject({
      req: 'cross',
      picking: false,
      turn: 'you',
      msg: 'You asked for Cross. Your move.',
    })
    const h = deal(c('whot', 20), 'cpu', () => 0)
    expect(h.picking).toBe(false)
    expect(h.req).toBe('circle')
    expect(h.turn).toBe('cpu')
  })
})

describe('canPlay', () => {
  it('matches shape or number, WHOT always', () => {
    const s = state()
    expect(canPlay(c('circle', 9), s)).toBe(true)
    expect(canPlay(c('square', 3), s)).toBe(true)
    expect(canPlay(c('square', 9), s)).toBe(false)
    expect(canPlay(c('whot', 20), s)).toBe(true)
  })
  it('an active request overrides number matching', () => {
    const s = state({ req: 'cross' })
    expect(canPlay(c('cross', 10), s)).toBe(true)
    expect(canPlay(c('circle', 3), s)).toBe(false)
    expect(canPlay(c('whot', 20), s)).toBe(true)
  })
})

describe('playCard', () => {
  const rng = () => 0.5

  it('ignores illegal plays and the wrong turn', () => {
    const s = state()
    const bad = s.hand.find((x) => x.s === 'cross')!
    expect(playCard(s, 'you', bad.id, 'Easy', rng)).toBe(s)
    expect(
      playCard({ ...s, turn: 'cpu' }, 'you', s.hand[0].id, 'Easy', rng),
    ).toEqual({ ...s, turn: 'cpu' })
    expect(playCard(s, 'you', 99999, 'Easy', rng)).toBe(s)
  })

  it('a plain card passes the turn', () => {
    const s = state()
    const card = s.hand[0] // circle 7
    const n = playCard(s, 'you', card.id, 'Easy', rng)
    expect(n.turn).toBe('cpu')
    expect(n.pile.at(-1)).toBe(card)
    expect(n.hand).toHaveLength(2)
    expect(n.msg).toBe('You played Circle 7.')
  })

  it('1 Hold on: same player plays again', () => {
    const one = c('circle', 1)
    const n = playCard(
      state({ hand: [one, c('square', 9)] }),
      'you',
      one.id,
      'Easy',
      rng,
    )
    expect(n.turn).toBe('you')
    expect(n.msg).toContain('Hold on: play again.')
  })

  it('8 Suspension: same player plays again', () => {
    const eight = c('circle', 8)
    const n = playCard(
      state({ hand: [eight, c('square', 9)] }),
      'you',
      eight.id,
      'Easy',
      rng,
    )
    expect(n.turn).toBe('you')
    expect(n.msg).toContain('Suspension')
  })

  it.each([
    [2, 2],
    [5, 3],
    [14, 1],
  ])(
    '%i makes the opponent draw %i and the same player plays again',
    (num, k) => {
      const card = c('circle', num)
      const s = state({ hand: [card, c('square', 9)] })
      const n = playCard(s, 'you', card.id, 'Easy', rng)
      expect(n.cpu).toHaveLength(s.cpu.length + k)
      expect(n.deck).toHaveLength(s.deck.length - k)
      expect(n.turn).toBe('you')
      expect(n.msg).toContain(`You played Circle ${num}.`)
      expect(n.msg).toContain(`CPU draws ${k}.`)
      expect(n.msg.endsWith('Play again.')).toBe(true)
    },
  )

  it('CPU specials phrase the message for the CPU', () => {
    const card = c('circle', 2)
    const n = playCard(
      state({ turn: 'cpu', cpu: [card, c('star', 8)] }),
      'cpu',
      card.id,
      'Easy',
      rng,
    )
    expect(n.turn).toBe('cpu')
    expect(n.msg).toBe(
      'CPU played Circle 2. Pick two: You draw 2. CPU plays again.',
    )
    expect(n.hand).toHaveLength(5)
  })

  it('penalties cannot be defended: they apply even if the opponent holds a 2', () => {
    const card = c('circle', 2)
    const s = state({
      hand: [card, c('square', 9)],
      cpu: [c('triangle', 2), c('star', 8)],
    })
    const n = playCard(s, 'you', card.id, 'Easy', rng)
    expect(n.cpu).toHaveLength(4)
    expect(n.turn).toBe('you')
  })

  it('WHOT played by you asks for a call, then the CPU moves', () => {
    const whot = c('whot', 20)
    const n = playCard(
      state({ hand: [whot, c('square', 9)] }),
      'you',
      whot.id,
      'Easy',
      rng,
    )
    expect(n.picking).toBe(true)
    expect(n.turn).toBe('cpu')
    expect(n.req).toBeNull()
    expect(n.msg).toBe('You played WHOT. Call a shape.')
    const called = callShape(n, 'star')
    expect(called.req).toBe('star')
    expect(called.picking).toBe(false)
    expect(called.turn).toBe('cpu')
    expect(called.msg).toBe('You asked for Star.')
  })

  it('WHOT can be played on another WHOT and on an active request', () => {
    const whot = c('whot', 20)
    const s = state({
      pile: [c('whot', 20)],
      req: 'cross',
      hand: [whot, c('square', 9)],
    })
    expect(playCard(s, 'you', whot.id, 'Easy', rng).picking).toBe(true)
  })

  it('WHOT played by the CPU sets a request immediately and passes to you', () => {
    const whot = c('whot', 20)
    const n = playCard(
      state({ turn: 'cpu', cpu: [whot, c('triangle', 4), c('triangle', 9)] }),
      'cpu',
      whot.id,
      'Hard',
      rng,
    )
    expect(n.req).toBe('triangle')
    expect(n.turn).toBe('you')
    expect(n.msg).toBe('CPU played WHOT and asks for Triangle.')
  })

  it('a request stays until someone plays on it, then clears', () => {
    const s = state({ req: 'cross' })
    const n = playCard(
      s,
      'you',
      s.hand.find((x) => x.s === 'cross')!.id,
      'Easy',
      rng,
    )
    expect(n.req).toBeNull()
  })

  it('after a special, normal matching applies to the next card', () => {
    const two = c('circle', 2)
    const n = playCard(
      state({ hand: [two, c('square', 9)] }),
      'you',
      two.id,
      'Easy',
      rng,
    )
    expect(canPlay(c('square', 2), n)).toBe(true)
    expect(canPlay(c('circle', 9), n)).toBe(true)
    expect(canPlay(c('square', 9), n)).toBe(false)
  })

  it('emptying your hand wins immediately and the effect is not applied', () => {
    const two = c('circle', 2)
    const s = state({ hand: [two] })
    const n = playCard(s, 'you', two.id, 'Easy', rng)
    expect(n.over).toEqual({ result: 'win', reason: 'out' })
    expect(n.cpu).toHaveLength(s.cpu.length)
    expect(n.deck).toHaveLength(s.deck.length)
  })

  it('finishing on WHOT is allowed and needs no call', () => {
    const whot = c('whot', 20)
    const n = playCard(state({ hand: [whot] }), 'you', whot.id, 'Easy', rng)
    expect(n.over?.result).toBe('win')
    expect(n.picking).toBe(false)
  })

  it('the CPU emptying its hand is a loss', () => {
    const card = c('triangle', 3)
    const n = playCard(
      state({ turn: 'cpu', cpu: [card] }),
      'cpu',
      card.id,
      'Easy',
      rng,
    )
    expect(n.over).toEqual({ result: 'loss', reason: 'out' })
  })
})

describe('drawing', () => {
  it('draws one card and ends the turn, even with a legal card in hand', () => {
    const s = state()
    expect(s.hand.some((x) => canPlay(x, s))).toBe(true)
    const n = drawFromMarket(s, 'you')
    expect(n.hand).toHaveLength(4)
    expect(n.deck).toHaveLength(5)
    expect(n.turn).toBe('cpu')
    expect(n.msg).toBe('You drew from the market.')
  })
  it('is not allowed out of turn or while picking', () => {
    const s = state({ turn: 'cpu' })
    expect(drawFromMarket(s, 'you')).toBe(s)
    const p = state({ picking: true })
    expect(drawFromMarket(p, 'you')).toBe(p)
  })
})

describe('market runs out', () => {
  it('ends right after a normal draw; lowest total wins', () => {
    const s = state({
      deck: [c('star', 2)],
      hand: [c('circle', 7)],
      cpu: [c('triangle', 4), c('star', 8)],
    })
    const n = drawFromMarket(s, 'you')
    expect(n.over).toEqual({
      result: 'win',
      reason: 'count',
      yourTotal: 9,
      cpuTotal: 12,
    })
  })
  it('ends after a penalty draw too, even if fewer cards remained than the penalty', () => {
    const five = c('circle', 5)
    const s = state({
      deck: [c('star', 1)],
      hand: [five, c('square', 9)],
      cpu: [c('triangle', 1)],
    })
    const n = playCard(s, 'you', five.id, 'Easy', () => 0.5)
    expect(n.cpu).toHaveLength(2)
    expect(n.deck).toHaveLength(0)
    expect(n.over?.reason).toBe('count')
    expect(n.msg).not.toMatch(/Play again\.$/)
  })
  it('higher total loses, equal totals draw; WHOT counts 20 and Star is not doubled', () => {
    const lose = drawFromMarket(
      state({
        deck: [c('star', 7)],
        hand: [c('whot', 20)],
        cpu: [c('circle', 1)],
      }),
      'you',
    )
    expect(lose.over).toMatchObject({
      result: 'loss',
      yourTotal: 27,
      cpuTotal: 1,
    })
    const tie = drawFromMarket(
      state({
        deck: [c('star', 3)],
        hand: [c('circle', 1)],
        cpu: [c('circle', 4)],
      }),
      'you',
    )
    expect(tie.over).toMatchObject({
      result: 'draw',
      yourTotal: 4,
      cpuTotal: 4,
    })
  })
  it('handTotal sums card numbers', () => {
    expect(handTotal([c('whot', 20), c('star', 5)])).toBe(25)
  })
})

describe('CPU', () => {
  it('draws when it has no legal card', () => {
    const s = state({ turn: 'cpu', cpu: [c('cross', 9)] })
    const n = cpuMove(s, 'Easy', () => 0.5)
    expect(n.cpu).toHaveLength(2)
    expect(n.turn).toBe('you')
    expect(n.msg).toBe('CPU drew from the market.')
  })
  it('does nothing out of turn', () => {
    const s = state()
    expect(cpuMove(s, 'Easy', () => 0.5)).toBe(s)
  })
  it('Easy picks a random legal card', () => {
    const a = c('circle', 9)
    const b = c('triangle', 3)
    const s = state({ turn: 'cpu', cpu: [a, b, c('cross', 9)] })
    expect(pickCpuCard(s, [a, b], 'Easy', () => 0)).toBe(a)
    expect(pickCpuCard(s, [a, b], 'Easy', () => 0.99)).toBe(b)
  })
  it('Hard prefers specials over plain cards', () => {
    const plain = c('circle', 12)
    const pick2 = c('circle', 2)
    const s = state({ turn: 'cpu', cpu: [plain, pick2] })
    expect(pickCpuCard(s, [plain, pick2], 'Hard', () => 0)).toBe(pick2)
  })
  it('Hard ranks Pick three over Pick two over General market, and adds +20 when you hold ≤2', () => {
    const two = c('circle', 2)
    const five = c('circle', 5)
    const gm = c('circle', 14)
    const s = state({ turn: 'cpu', cpu: [two, five, gm] })
    expect(pickCpuCard(s, [two, five, gm], 'Hard', () => 0)).toBe(five)
    // 14 beats 2 normally? 14: 3*1+5.6+34 = 42.6; 2: 3+0.8+36 = 39.8
    expect(pickCpuCard(s, [two, gm], 'Hard', () => 0)).toBe(gm)
    // with the player at ≤2 cards the 2 gets +20 and overtakes
    const danger = state({ turn: 'cpu', cpu: [two, gm], hand: [c('star', 1)] })
    expect(pickCpuCard(danger, [two, gm], 'Hard', () => 0)).toBe(two)
  })
  it('Hard avoids WHOT unless it is the only legal card', () => {
    const whot = c('whot', 20)
    const plain = c('circle', 9)
    const s = state({ turn: 'cpu', cpu: [whot, plain] })
    expect(pickCpuCard(s, [whot, plain], 'Hard', () => 0)).toBe(plain)
    expect(pickCpuCard(s, [whot], 'Hard', () => 0)).toBe(whot)
  })
  it('Hard weights shapes it holds many of', () => {
    const a = c('circle', 9)
    const b = c('triangle', 9)
    const s = state({
      turn: 'cpu',
      cpu: [a, c('circle', 12), c('circle', 13), b],
    })
    expect(pickCpuCard(s, [a, b], 'Hard', () => 0)).toBe(a)
  })
  it('calls a random shape on Easy and its most-held shape on Hard', () => {
    const hand = [c('star', 1), c('star', 2), c('cross', 3), c('whot', 20)]
    expect(pickCpuShape(hand, 'Hard', () => 0)).toBe('star')
    expect(pickCpuShape(hand, 'Easy', seq(0))).toBe(SHAPES[0])
    expect(pickCpuShape([c('whot', 20)], 'Hard', seq(0.99))).toBe(SHAPES[4])
  })
})

describe('sortHand', () => {
  it('orders Circle → Triangle → Cross → Square → Star → WHOT, then by number', () => {
    const sorted = sortHand([
      c('whot', 20),
      c('star', 1),
      c('square', 3),
      c('circle', 9),
      c('circle', 2),
      c('cross', 1),
      c('triangle', 4),
    ])
    expect(sorted.map((x) => `${x.s}${x.n}`)).toEqual([
      'circle2',
      'circle9',
      'triangle4',
      'cross1',
      'square3',
      'star1',
      'whot20',
    ])
  })
})
