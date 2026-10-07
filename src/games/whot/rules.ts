/**
 * Whot house rules as data.
 *
 * Every special card is described once in SPECIAL_CATALOGUE. A `Rules` value says which of them
 * are active. The engine only ever asks `specialEffect(rules, number)`, so adding a rule screen later is:
 * build a `Rules` from the user's choices, store it, and pass it to `newGame`. No engine change.
 *
 * WHOT (20) is not in the catalogue: it is the wild card and is always active.
 */

export const SPECIAL_NUMBERS = [1, 2, 5, 8, 14] as const
export type SpecialNumber = (typeof SPECIAL_NUMBERS)[number]

export type SpecialEffect = {
  readonly name: string
  /** Cards the opponent draws (0 = none). */
  readonly draw: number
  /** The player who played it moves again. */
  readonly playAgain: boolean
  /** Extra weight the Hard CPU gives it, on top of the flat +30 for any active special. */
  readonly cpuBonus: number
}

export const SPECIAL_CATALOGUE: Readonly<Record<SpecialNumber, SpecialEffect>> =
  {
    1: { name: 'Hold on', draw: 0, playAgain: true, cpuBonus: 0 },
    2: { name: 'Pick two', draw: 2, playAgain: true, cpuBonus: 6 },
    5: { name: 'Pick three', draw: 3, playAgain: true, cpuBonus: 8 },
    8: { name: 'Suspension', draw: 0, playAgain: true, cpuBonus: 0 },
    14: { name: 'General market', draw: 1, playAgain: true, cpuBonus: 4 },
  }

/** Plain JSON on purpose: it can be stored in localStorage as-is. */
export type Rules = {
  readonly specials: Readonly<Record<SpecialNumber, boolean>>
}

/** Agreed house rules: a 5 is a plain card. */
export const DEFAULT_RULES: Rules = {
  specials: { 1: true, 2: true, 5: false, 8: true, 14: true },
}

/**
 * Builds a complete `Rules` from untrusted or partial input (for example stored settings).
 * Unknown keys and non-boolean values are ignored, so old or tampered data falls back to the defaults.
 */
export function resolveRules(
  input?: { specials?: Partial<Record<number, unknown>> } | null,
): Rules {
  const specials = { ...DEFAULT_RULES.specials }
  for (const n of SPECIAL_NUMBERS) {
    const value = input?.specials?.[n]
    if (typeof value === 'boolean') specials[n] = value
  }
  return { specials }
}

/** The effect of playing card number `n` under `rules`, or null when it is a plain card. */
export function specialEffect(rules: Rules, n: number): SpecialEffect | null {
  const special = SPECIAL_NUMBERS.find((s) => s === n)
  return special !== undefined && rules.specials[special]
    ? SPECIAL_CATALOGUE[special]
    : null
}

/** What the table legend shows: the active specials, then WHOT. */
export function legendEntries(
  rules: Rules,
): Array<{ n: number; name: string }> {
  return [
    ...SPECIAL_NUMBERS.filter((n) => rules.specials[n]).map((n) => ({
      n,
      name: SPECIAL_CATALOGUE[n].name,
    })),
    { n: 20, name: 'WHOT' },
  ]
}
