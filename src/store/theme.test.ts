import { beforeEach, describe, expect, it } from 'vitest'
import { getTheme, setTheme, toggleTheme } from './theme'

beforeEach(() => {
  delete document.documentElement.dataset.theme
  localStorage.clear()
})

describe('theme', () => {
  it('defaults to dark', () => {
    expect(getTheme()).toBe('dark')
  })
  it('toggles and persists', () => {
    toggleTheme()
    expect(getTheme()).toBe('light')
    expect(localStorage.getItem('matinee.theme')).toBe('light')
    setTheme('dark')
    expect(document.documentElement.dataset.theme).toBe('dark')
  })
})
