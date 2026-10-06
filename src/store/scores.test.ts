import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, useScores } from './scores'

beforeEach(() => {
  useScores.setState({ best: {}, settings: DEFAULT_SETTINGS })
})

describe('recordBest', () => {
  it('keeps the highest value for higher-is-better games', () => {
    const { recordBest } = useScores.getState()
    expect(recordBest('merge', 100)).toBe(true)
    expect(recordBest('merge', 50)).toBe(false)
    expect(recordBest('merge', 200)).toBe(true)
    expect(useScores.getState().best.merge).toBe(200)
  })

  it('keeps the lowest value for lower-is-better games', () => {
    const { recordBest } = useScores.getState()
    expect(recordBest('quickdraw', 300)).toBe(true)
    expect(recordBest('quickdraw', 350)).toBe(false)
    expect(recordBest('quickdraw', 243)).toBe(true)
    expect(useScores.getState().best.quickdraw).toBe(243)
  })

  it('persists under the versioned key', () => {
    useScores.getState().recordBest('popup', 12)
    const raw = JSON.parse(localStorage.getItem('matinee.best.v1') ?? '{}')
    expect(raw.version).toBe(1)
    expect(raw.state.best.popup).toBe(12)
  })
})
