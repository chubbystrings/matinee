import { describe, expect, it } from 'vitest'
import { nextHole, spawnInterval } from './logic'

describe('spawnInterval', () => {
  it('starts at 950 and shrinks 18ms per hit', () => {
    expect(spawnInterval(0)).toBe(950)
    expect(spawnInterval(10)).toBe(770)
  })
  it('floors at 420', () => {
    expect(spawnInterval(30)).toBe(420)
    expect(spawnInterval(500)).toBe(420)
  })
})

describe('nextHole', () => {
  it('picks any hole when there is no previous', () => {
    expect(nextHole(-1, () => 0)).toBe(0)
    expect(nextHole(-1, () => 0.999)).toBe(8)
  })
  it('never repeats the previous hole', () => {
    for (let prev = 0; prev < 9; prev++) {
      for (let k = 0; k < 100; k++) {
        const h = nextHole(prev, () => k / 100)
        expect(h).not.toBe(prev)
        expect(h).toBeGreaterThanOrEqual(0)
        expect(h).toBeLessThan(9)
      }
    }
  })
  it('can reach every other hole', () => {
    const seen = new Set<number>()
    for (let k = 0; k < 8; k++) seen.add(nextHole(4, () => (k + 0.5) / 8))
    expect([...seen].sort()).toEqual([0, 1, 2, 3, 5, 6, 7, 8])
  })
})
