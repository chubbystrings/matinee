import { describe, expect, it } from 'vitest'
import { HELP, HELP_KEYS, HELP_SPECIALS } from './help'
import { GAMES } from './registry'
import { SPECIAL_CATALOGUE, SPECIAL_NUMBERS } from './whot/rules'
import { LEVEL_COPY } from './whot/levels'

describe('how to play content', () => {
  it('has a goal, rules, controls and tips for every game', () => {
    for (const g of GAMES) {
      const h = HELP[g.id]
      expect(h.goal.length, g.id).toBeGreaterThan(10)
      expect(h.rules.length, g.id).toBeGreaterThanOrEqual(5)
      expect(h.controls.length, g.id).toBeGreaterThan(0)
      expect(h.tips.length, g.id).toBeGreaterThan(0)
      for (const [keys, action] of h.controls) {
        expect(keys.length).toBeGreaterThan(0)
        expect(action).not.toBe('')
      }
    }
  })

  it('only lists games that exist', () => {
    expect(Object.keys(HELP).sort()).toEqual(GAMES.map((g) => g.id).sort())
  })

  it('every Controls tab ends with Restart, ? and Esc', () => {
    expect(HELP_KEYS).toEqual([
      [['↻'], 'Restart'],
      [['?'], 'Open or close this sheet'],
      [['Esc'], 'Close this sheet, then back to the lobby'],
    ])
  })

  it('Whot special cards match the rules catalogue, then WHOT', () => {
    expect(HELP_SPECIALS.map((s) => s.n)).toEqual([...SPECIAL_NUMBERS, 20])
    for (const s of HELP_SPECIALS.filter((x) => x.n !== 20))
      expect(s.t).toBe(
        SPECIAL_CATALOGUE[s.n as keyof typeof SPECIAL_CATALOGUE].name,
      )
  })

  it('describes all three Whot levels', () => {
    expect(Object.keys(LEVEL_COPY)).toEqual(['Easy', 'Hard', 'Expert'])
  })

  it('keeps the reference copy verbatim (spot checks)', () => {
    expect(HELP.snake.goal).toBe(
      'Eat as many dots as you can without crashing.',
    )
    expect(HELP.merge.rules[4]).toBe(
      "Every merge adds the new tile's value to your score.",
    )
    expect(HELP.noughts.goal).toBe(
      "Get three X's in a row before the CPU gets three O's.",
    )
    expect(HELP.whot.tips[2]).toBe(
      'On Expert, check shape and number before you tap. A wrong card costs you a draw and your turn.',
    )
  })
})
