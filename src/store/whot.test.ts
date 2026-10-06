import { beforeEach, describe, expect, it } from 'vitest'
import {
  EMPTY_STATS,
  applyResult,
  formatWhotBest,
  useWhotLevel,
  useWhotStats,
} from './whot'

describe('applyResult', () => {
  it('a win adds a win and extends the streak, best follows the streak', () => {
    let s = applyResult(EMPTY_STATS, 'win')
    s = applyResult(s, 'win')
    expect(s).toMatchObject({ wins: 2, streak: 2, best: 2 })
  })
  it('a loss resets the streak but keeps best', () => {
    let s = applyResult(applyResult(EMPTY_STATS, 'win'), 'win')
    s = applyResult(s, 'loss')
    expect(s).toMatchObject({ wins: 2, losses: 1, streak: 0, best: 2 })
    expect(applyResult(s, 'win')).toMatchObject({ streak: 1, best: 2 })
  })
  it('a draw keeps the streak', () => {
    const s = applyResult(applyResult(EMPTY_STATS, 'win'), 'draw')
    expect(s).toMatchObject({ draws: 1, streak: 1, wins: 1 })
  })
})

describe('formatWhotBest', () => {
  it('shows a dash with no wins', () =>
    expect(formatWhotBest(EMPTY_STATS)).toBe('—'))
  it('shows wins and best streak', () =>
    expect(formatWhotBest({ wins: 5, best: 3 })).toBe('5 wins · best streak 3'))
})

describe('persistence', () => {
  beforeEach(() => {
    localStorage.clear()
    useWhotStats.setState(EMPTY_STATS)
    useWhotLevel.setState({ level: 'Easy' })
  })
  it('stores stats under matinee.whot.v1 and level under matinee.whot.level', () => {
    useWhotStats.getState().record('win')
    useWhotLevel.getState().setLevel('Hard')
    expect(
      JSON.parse(localStorage.getItem('matinee.whot.v1') ?? '{}').state,
    ).toMatchObject({ wins: 1, streak: 1, best: 1 })
    expect(
      JSON.parse(localStorage.getItem('matinee.whot.level') ?? '{}').state
        .level,
    ).toBe('Hard')
  })
})
