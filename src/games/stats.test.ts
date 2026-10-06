import { describe, expect, it } from 'vitest'
import { GAMES } from './registry'
import { defaultStats } from './stats'

describe('defaultStats', () => {
  it('matches the handoff stat table', () => {
    const labels = Object.fromEntries(
      GAMES.map((g) => {
        const s = defaultStats(g, undefined)
        return [g.id, [s.primary.label, s.secondary.label]]
      }),
    )
    expect(labels).toEqual({
      snake: ['Score', 'Best'],
      merge: ['Score', 'Best'],
      recall: ['Moves', 'Best'],
      noughts: ['W–L–D', 'Best'],
      quickdraw: ['Last', 'Best'],
      popup: ['Hits', 'Time'],
      whot: ['Wins', 'Streak'],
    })
  })
  it('whot shows wins and streak from the whot store values', () => {
    const w = GAMES.find((g) => g.id === 'whot')!
    const s = defaultStats(w, undefined, { wins: 4, streak: 2 })
    expect(s.primary).toEqual({ label: 'Wins', value: 4 })
    expect(s.secondary).toEqual({ label: 'Streak', value: 2 })
  })
  it('formats best with unit', () => {
    const q = GAMES.find((g) => g.id === 'quickdraw')!
    expect(defaultStats(q, 243).secondary.value).toBe('243 ms')
  })
})
