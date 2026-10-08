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

describe('expert wins', () => {
  it('count only on a win played on Expert, and are also ordinary wins', () => {
    let s = applyResult(EMPTY_STATS, 'win', true)
    expect(s).toMatchObject({ wins: 1, streak: 1, expertWins: 1 })
    s = applyResult(s, 'win')
    expect(s).toMatchObject({ wins: 2, streak: 2, expertWins: 1 })
    s = applyResult(s, 'loss', true)
    s = applyResult(s, 'draw', true)
    expect(s.expertWins).toBe(1)
  })
  it('wins, losses and streaks are shared across levels', () => {
    let s = applyResult(EMPTY_STATS, 'win', true)
    s = applyResult(s, 'loss')
    expect(s).toMatchObject({ wins: 1, losses: 1, streak: 0, best: 1 })
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

  it('stores expertWins in matinee.whot.v1 and keeps it across a reload', async () => {
    useWhotStats.getState().record('win', true)
    expect(
      JSON.parse(localStorage.getItem('matinee.whot.v1') ?? '{}').state,
    ).toMatchObject({ wins: 1, expertWins: 1 })
    const saved = localStorage.getItem('matinee.whot.v1') ?? ''
    useWhotStats.setState(EMPTY_STATS) // a fresh page: memory is empty, storage is not
    localStorage.setItem('matinee.whot.v1', saved)
    await useWhotStats.persist.rehydrate()
    expect(useWhotStats.getState().expertWins).toBe(1)
  })
  it('older saved stats without expertWins load with 0', async () => {
    localStorage.setItem(
      'matinee.whot.v1',
      JSON.stringify({
        state: { wins: 3, losses: 1, draws: 0, streak: 2, best: 2 },
        version: 1,
      }),
    )
    await useWhotStats.persist.rehydrate()
    expect(useWhotStats.getState()).toMatchObject({ wins: 3, expertWins: 0 })
  })
  it.each(['Hard', 'Expert'] as const)('accepts %s on load', async (level) => {
    localStorage.setItem(
      'matinee.whot.level',
      JSON.stringify({ state: { level }, version: 1 }),
    )
    await useWhotLevel.persist.rehydrate()
    expect(useWhotLevel.getState().level).toBe(level)
  })
  it('falls back to Easy for an unknown saved level', async () => {
    localStorage.setItem(
      'matinee.whot.level',
      JSON.stringify({ state: { level: 'Nightmare' }, version: 1 }),
    )
    await useWhotLevel.persist.rehydrate()
    expect(useWhotLevel.getState().level).toBe('Easy')
  })
})
