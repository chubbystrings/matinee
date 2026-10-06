import { describe, expect, it } from 'vitest'
import { formatBest, isBetter } from './best'
import { GAMES, isGameId } from './registry'

describe('best helpers', () => {
  it('compares by mode', () => {
    expect(isBetter('higher', 5, undefined)).toBe(true)
    expect(isBetter('higher', 5, 5)).toBe(false)
    expect(isBetter('lower', 4, 5)).toBe(true)
  })
  it('formats with unit', () => {
    expect(formatBest({ bestUnit: ' ms' }, 243)).toBe('243 ms')
    expect(formatBest({}, undefined)).toBe('—')
  })
  it('registry has seven unique games', () => {
    expect(new Set(GAMES.map((g) => g.id)).size).toBe(7)
    expect(isGameId('snake')).toBe(true)
    expect(isGameId('nope')).toBe(false)
  })
})
