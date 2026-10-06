import { describe, expect, it } from 'vitest'
import { phaseView, pushTry, rating, resultCopy, waitDelay } from './logic'

describe('quickdraw logic', () => {
  it('rating boundaries', () => {
    expect(rating(199)).toBe('Lightning.')
    expect(rating(200)).toBe('Sharp.')
    expect(rating(259)).toBe('Sharp.')
    expect(rating(260)).toBe('Solid.')
    expect(rating(339)).toBe('Solid.')
    expect(rating(340)).toBe('Warming up.')
  })
  it('wait delay spans 1.2–3.8 s', () => {
    expect(waitDelay(() => 0)).toBe(1200)
    expect(waitDelay(() => 1)).toBe(3800)
  })
  it('result copy with new best prefix', () => {
    expect(resultCopy(243, true)).toBe('New best. Sharp. Tap to go again.')
    expect(resultCopy(243, false)).toBe('Sharp. Tap to go again.')
  })
  it('keeps the last 5 tries, newest first', () => {
    expect(pushTry([5, 4, 3, 2, 1], 6)).toEqual([6, 5, 4, 3, 2])
  })
  it('phase views', () => {
    expect(phaseView('go', 0, false).big).toBe('Tap!')
    expect(phaseView('early', 0, false).bg).toBe('#FF7A5C')
    expect(phaseView('result', 243, false).big).toBe('243 ms')
  })
})
