import { describe, expect, it } from 'vitest'
import { swipeDirection } from './useSwipe'

describe('swipeDirection', () => {
  it('ignores short moves', () => expect(swipeDirection(10, 5)).toBeNull())
  it('dominant axis wins', () => {
    expect(swipeDirection(40, 10)).toBe('right')
    expect(swipeDirection(-40, 10)).toBe('left')
    expect(swipeDirection(5, -50)).toBe('up')
    expect(swipeDirection(5, 50)).toBe('down')
  })
})
