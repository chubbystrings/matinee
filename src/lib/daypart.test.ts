import { describe, expect, it } from 'vitest'
import { daypartForHour, featureLabel } from './daypart'

describe('daypartForHour', () => {
  it('maps boundaries', () => {
    expect([4, 5, 11, 12, 16, 17, 20, 21, 0, 23].map(daypartForHour)).toEqual([
      'night', 'morning', 'morning', 'afternoon', 'afternoon', 'evening', 'evening', 'night', 'night', 'night',
    ])
  })
  it('labels', () => {
    expect(featureLabel('night')).toBe('Tonight’s feature')
    expect(featureLabel('morning')).toBe('This morning’s feature')
  })
})
