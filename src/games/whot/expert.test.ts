import { describe, expect, it } from 'vitest'
import { SHAPES, createDeck } from './engine'
import { deal, expertMove, searchMove, unseen } from './expert'
import { real, seeded, table } from './testUtil'

const FAST = { budgetMs: 0, minPerMove: 30, maxPlayouts: 600 }

describe('searchMove', () => {
  it('returns null when the CPU has no legal card', () => {
    const s = table({
      hand: [real('star', 1)],
      cpu: [real('square', 7)],
      pile: [real('circle', 3)],
    })
    expect(searchMove(s, seeded(1), FAST)).toBeNull()
  })

  it('plays a single candidate at once, without searching', () => {
    const s = table({
      hand: [real('star', 1), real('star', 2)],
      cpu: [real('circle', 7), real('square', 11)],
      pile: [real('circle', 3)],
    })
    const never = () => {
      throw new Error('searched')
    }
    expect(searchMove(s, never, { now: never })).toEqual({
      cardId: real('circle', 7).id,
      shape: undefined,
    })
  })

  it('prefers the card that wins on the spot (Hold on, then the last card)', () => {
    const eight = real('circle', 8)
    const seven = real('circle', 7)
    const s = table({
      hand: [
        real('star', 1),
        real('star', 2),
        real('star', 3),
        real('star', 4),
      ],
      cpu: [seven, eight],
      pile: [real('circle', 3)],
    })
    expect(searchMove(s, seeded(7), FAST)?.cardId).toBe(eight.id)
  })

  it('expands WHOT into one candidate per shape and returns a shape to call', () => {
    const w1 = real('whot', 20)
    const w2 = real('whot', 20, [w1])
    const s = table({
      hand: [real('star', 1), real('star', 2), real('star', 3)],
      cpu: [w1, w2],
      pile: [real('circle', 3)],
    })
    const move = searchMove(s, seeded(3), FAST)
    expect(move?.cardId).toBe(w1.id)
    expect(SHAPES).toContain(move?.shape)
  })

  it('stops on the time budget after the minimum playouts', () => {
    const s = table({
      hand: [real('star', 1), real('star', 2), real('star', 3)],
      cpu: [real('circle', 7), real('circle', 11), real('triangle', 3)],
      pile: [real('circle', 3)],
    })
    let calls = 0
    // every clock read is 100 ms later: the 380 ms budget is spent almost at once
    const now = () => ++calls * 100
    expect(searchMove(s, seeded(2), { now, minPerMove: 5 })).not.toBeNull()
    expect(calls).toBeLessThan(40)
  })

  it('never reads your hand or the market order: hidden cards swapped, same decision', () => {
    const base = table({
      hand: [
        real('star', 1),
        real('square', 2),
        real('cross', 3),
        real('circle', 13),
      ],
      cpu: [
        real('circle', 7),
        real('triangle', 3),
        real('circle', 8),
        real('whot', 20),
      ],
      pile: [real('circle', 3)],
    })
    // Swap two of your cards with two from the market: the same unseen set, different truth.
    const swapped = {
      ...base,
      hand: [base.deck[0], base.deck[5], base.hand[2], base.hand[3]],
      deck: base.deck.map((c, i) =>
        i === 0 ? base.hand[0] : i === 5 ? base.hand[1] : c,
      ),
    }
    const opts = { budgetMs: 0, minPerMove: 60, maxPlayouts: 2000 }
    expect(searchMove(swapped, seeded(11), opts)).toEqual(
      searchMove(base, seeded(11), opts),
    )
    expect(unseen(swapped).map((c) => c.id)).toEqual(
      unseen(base).map((c) => c.id),
    )
  })
})

describe('unseen and deal', () => {
  it('unseen is the full deck minus the CPU hand, the pile and revealed cards', () => {
    const shown = real('star', 4)
    const s = table({
      hand: [shown, real('star', 1)],
      cpu: [real('circle', 7)],
      pile: [real('circle', 3)],
      known: [shown.id],
    })
    const ids = unseen(s).map((c) => c.id)
    expect(ids).toHaveLength(54 - 3)
    expect(ids).not.toContain(shown.id)
    expect(createDeck()).toHaveLength(54)
  })

  it('keeps void shapes out of the sampled hand when it can', () => {
    const pool = createDeck()
    for (let seed = 1; seed <= 20; seed++) {
      const { hand, deck } = deal(pool, 4, { circle: 0, whot: 0 }, seeded(seed))
      expect(hand).toHaveLength(4)
      expect(deck).toHaveLength(pool.length - 4)
      expect(hand.some((c) => c.s === 'circle' || c.s === 'whot')).toBe(false)
    }
  })

  it('a soft allowance of 1 lets one card of the shape through', () => {
    const pool = createDeck()
    for (let seed = 1; seed <= 20; seed++) {
      const { hand } = deal(pool, 4, { star: 1 }, seeded(seed))
      expect(hand.filter((c) => c.s === 'star').length).toBeLessThanOrEqual(1)
    }
  })

  it('ignores voids that cannot bind (allowance >= hand size)', () => {
    const pool = createDeck()
    const a = deal(pool, 3, { star: 3 }, seeded(5))
    const b = deal(pool, 3, {}, seeded(5))
    expect(a.hand.map((c) => c.id)).toEqual(b.hand.map((c) => c.id))
  })
})

describe('expertMove', () => {
  it('plays through the engine: pile grows, turn passes, WHOT calls the searched shape', () => {
    const w = real('whot', 20)
    const s = table({
      hand: [real('star', 1), real('star', 2), real('star', 3)],
      cpu: [w, real('circle', 5)],
      pile: [real('square', 13)],
    })
    const after = expertMove(s, seeded(4), FAST)
    expect(after.pile.length).toBe(2)
    expect(after.cpu).toHaveLength(1)
    expect(after.log.length).toBe(s.log.length + 1)
    if (after.pile[1].s === 'whot') {
      expect(after.turn).toBe('you')
      expect(SHAPES).toContain(after.req)
    }
  })

  it('draws when it has no legal card', () => {
    const s = table({
      hand: [real('star', 1), real('star', 2)],
      cpu: [real('square', 7)],
      pile: [real('circle', 3)],
    })
    const after = expertMove(s, seeded(1), FAST)
    expect(after.cpu).toHaveLength(2)
    expect(after.turn).toBe('you')
  })

  it('does nothing when it is not the CPU turn', () => {
    const s = table({
      hand: [real('star', 1)],
      cpu: [real('circle', 7)],
      pile: [real('circle', 3)],
      turn: 'you',
    })
    expect(expertMove(s, seeded(1), FAST)).toBe(s)
  })

  it('finishes inside the time budget on a full-size game', () => {
    const s = table({
      hand: [
        real('star', 1),
        real('star', 2),
        real('star', 3),
        real('star', 4),
      ],
      cpu: [
        real('circle', 7),
        real('circle', 11),
        real('triangle', 3),
        real('whot', 20),
      ],
      pile: [real('circle', 3)],
    })
    const t = performance.now()
    expertMove(s, Math.random)
    expect(performance.now() - t).toBeLessThan(900)
  })
})
