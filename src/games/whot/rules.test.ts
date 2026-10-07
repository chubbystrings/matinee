import { describe, expect, it } from 'vitest'
import {
  DEFAULT_RULES,
  SPECIAL_CATALOGUE,
  SPECIAL_NUMBERS,
  legendEntries,
  resolveRules,
  specialEffect,
} from './rules'

describe('DEFAULT_RULES', () => {
  it('is the agreed house ruleset: everything on except 5', () => {
    expect(DEFAULT_RULES.specials).toEqual({
      1: true,
      2: true,
      5: false,
      8: true,
      14: true,
    })
  })
  it('is plain JSON, so it can be stored as-is', () => {
    expect(JSON.parse(JSON.stringify(DEFAULT_RULES))).toEqual(DEFAULT_RULES)
  })
})

describe('specialEffect', () => {
  it('returns the catalogue entry for an enabled special', () => {
    expect(specialEffect(DEFAULT_RULES, 2)).toEqual({
      name: 'Pick two',
      draw: 2,
      playAgain: true,
      cpuBonus: 6,
    })
    expect(specialEffect(DEFAULT_RULES, 14)?.draw).toBe(1)
  })
  it('returns null for a disabled special and for plain cards', () => {
    expect(specialEffect(DEFAULT_RULES, 5)).toBeNull()
    expect(specialEffect(DEFAULT_RULES, 3)).toBeNull()
    expect(specialEffect(DEFAULT_RULES, 20)).toBeNull()
  })
  it('keeps 5 in the catalogue so it can be switched back on', () => {
    expect(SPECIAL_CATALOGUE[5]).toMatchObject({
      name: 'Pick three',
      draw: 3,
      playAgain: true,
    })
    expect(
      specialEffect({ specials: { ...DEFAULT_RULES.specials, 5: true } }, 5)
        ?.draw,
    ).toBe(3)
  })
})

describe('resolveRules', () => {
  it('fills everything from the defaults when given nothing', () => {
    expect(resolveRules()).toEqual(DEFAULT_RULES)
    expect(resolveRules(null)).toEqual(DEFAULT_RULES)
    expect(resolveRules({})).toEqual(DEFAULT_RULES)
  })
  it('applies valid overrides and keeps the rest', () => {
    expect(resolveRules({ specials: { 5: true, 8: false } }).specials).toEqual({
      1: true,
      2: true,
      5: true,
      8: false,
      14: true,
    })
  })
  it('ignores unknown keys and non-boolean values (stale or tampered storage)', () => {
    const r = resolveRules({
      specials: { 2: 'yes', 7: true, 99: false, 14: 0 },
    })
    expect(r).toEqual(DEFAULT_RULES)
    expect(Object.keys(r.specials).map(Number)).toEqual([...SPECIAL_NUMBERS])
  })
})

describe('legendEntries', () => {
  it('lists active specials in order, then WHOT', () => {
    expect(legendEntries(DEFAULT_RULES)).toEqual([
      { n: 1, name: 'Hold on' },
      { n: 2, name: 'Pick two' },
      { n: 8, name: 'Suspension' },
      { n: 14, name: 'General market' },
      { n: 20, name: 'WHOT' },
    ])
  })
  it('includes 5 when it is enabled', () => {
    expect(
      legendEntries(resolveRules({ specials: { 5: true } })).map((l) => l.n),
    ).toEqual([1, 2, 5, 8, 14, 20])
  })
})
