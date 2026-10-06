import { describe, expect, it } from 'vitest'
import { createDeck, flipCard, hideCards, shuffle } from './logic'
import type { CardStatus } from './logic'

const seq = (...v: number[]) => {
  let i = 0
  return () => v[i++ % v.length]
}

describe('shuffle', () => {
  it('keeps all items', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })
  it('is deterministic for an rng and does not mutate', () => {
    const src = [1, 2, 3, 4]
    expect(shuffle(src, () => 0)).toEqual([2, 3, 4, 1])
    expect(src).toEqual([1, 2, 3, 4])
  })
})

describe('createDeck', () => {
  it('has 16 cards, two of each of 8 symbols', () => {
    const deck = createDeck(seq(0.3, 0.9, 0.1, 0.6))
    expect(deck).toHaveLength(16)
    const counts = new Map<string, number>()
    for (const c of deck) counts.set(c.sym, (counts.get(c.sym) ?? 0) + 1)
    expect(counts.size).toBe(8)
    expect([...counts.values()].every((n) => n === 2)).toBe(true)
  })
})

describe('flipCard', () => {
  const deck = [{ sym: 'A', color: '' }, { sym: 'B', color: '' }, { sym: 'A', color: '' }, { sym: 'B', color: '' }]
  const fresh = (): CardStatus[] => ['down', 'down', 'down', 'down']

  it('first flip costs no move', () => {
    const r = flipCard(deck, fresh(), 0)
    expect(r.outcome).toBe('first')
    expect(r.moveDelta).toBe(0)
    expect(r.status).toEqual(['up', 'down', 'down', 'down'])
  })
  it('match marks both done', () => {
    const r = flipCard(deck, flipCard(deck, fresh(), 0).status, 2)
    expect(r.outcome).toBe('match')
    expect(r.moveDelta).toBe(1)
    expect(r.status).toEqual(['done', 'down', 'done', 'down'])
    expect(r.cleared).toBe(false)
  })
  it('mismatch reports the pair and can be hidden', () => {
    const r = flipCard(deck, flipCard(deck, fresh(), 0).status, 1)
    expect(r.outcome).toBe('mismatch')
    expect(r.pair).toEqual([0, 1])
    expect(hideCards(r.status, r.pair!)).toEqual(fresh())
  })
  it('ignores already flipped cards', () => {
    expect(flipCard(deck, ['up', 'down', 'down', 'down'], 0).outcome).toBe('ignored')
    expect(flipCard(deck, ['done', 'down', 'done', 'down'], 2).outcome).toBe('ignored')
  })
  it('detects a cleared board', () => {
    const r = flipCard(deck, ['done', 'up', 'done', 'down'], 3)
    expect(r.cleared).toBe(true)
  })
})
