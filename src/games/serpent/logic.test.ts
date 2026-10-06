import { describe, expect, it } from 'vitest'
import { isReverse, placeFood, START_BODY, START_DIR, step, tickSpeed } from './logic'

const R = { x: 1, y: 0 }

describe('step', () => {
  it('moves forward keeping length', () => {
    const r = step(START_BODY, START_DIR, { x: 0, y: 0 })
    expect(r).toEqual({ dead: false, ate: false, body: [{ x: 9, y: 10 }, { x: 8, y: 10 }, { x: 7, y: 10 }] })
  })
  it('dies on every wall', () => {
    expect(step([{ x: 19, y: 5 }], R, null).dead).toBe(true)
    expect(step([{ x: 0, y: 5 }], { x: -1, y: 0 }, null).dead).toBe(true)
    expect(step([{ x: 5, y: 0 }], { x: 0, y: -1 }, null).dead).toBe(true)
    expect(step([{ x: 5, y: 19 }], { x: 0, y: 1 }, null).dead).toBe(true)
  })
  it('dies on self collision but not into the vacating tail', () => {
    const loop = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }, { x: 4, y: 4 }, { x: 5, y: 4 }]
    expect(step(loop, { x: -1, y: 0 }, null).dead).toBe(true)
    expect(step(loop, { x: 0, y: -1 }, null).dead).toBe(false)
    const square = [{ x: 5, y: 5 }, { x: 5, y: 6 }, { x: 4, y: 6 }, { x: 4, y: 5 }]
    expect(step(square, { x: -1, y: 0 }, null).dead).toBe(false)
  })
  it('grows when eating food', () => {
    const r = step(START_BODY, START_DIR, { x: 9, y: 10 })
    expect(r.dead).toBe(false)
    if (!r.dead) {
      expect(r.ate).toBe(true)
      expect(r.body).toHaveLength(4)
      expect(r.body[0]).toEqual({ x: 9, y: 10 })
    }
  })
})

describe('isReverse', () => {
  it('detects opposite directions only', () => {
    expect(isReverse(R, { x: -1, y: 0 })).toBe(true)
    expect(isReverse(R, { x: 0, y: 1 })).toBe(false)
    expect(isReverse(R, R)).toBe(false)
  })
})

describe('tickSpeed', () => {
  it('starts at the setting speed', () => {
    expect(tickSpeed('Chill', 0)).toBe(150)
    expect(tickSpeed('Normal', 0)).toBe(115)
    expect(tickSpeed('Fast', 0)).toBe(80)
  })
  it('subtracts 3ms per food and floors at 55', () => {
    expect(tickSpeed('Normal', 10)).toBe(85)
    expect(tickSpeed('Fast', 8)).toBe(56)
    expect(tickSpeed('Fast', 9)).toBe(55)
    expect(tickSpeed('Fast', 100)).toBe(55)
  })
})

describe('placeFood', () => {
  it('never lands on the snake', () => {
    for (const v of [0, 0.3, 0.99]) {
      const f = placeFood(START_BODY, () => v)!
      expect(START_BODY.some((p) => p.x === f.x && p.y === f.y)).toBe(false)
    }
  })
  it('is deterministic with an injected rng and handles a full board', () => {
    expect(placeFood([], () => 0)).toEqual({ x: 0, y: 0 })
    expect(placeFood([], () => 0.999)).toEqual({ x: 19, y: 19 })
    const full = Array.from({ length: 4 }, (_, i) => ({ x: i % 2, y: Math.floor(i / 2) }))
    expect(placeFood(full, Math.random, 2)).toBeNull()
  })
})
