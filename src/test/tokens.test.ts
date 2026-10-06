import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('tokens', () => {
  it('defines dark and light themes', () => {
    const css = readFileSync('src/styles/tokens.css', 'utf8')
    expect(css).toContain('--mt-bg: #0E0D12')
    expect(css).toContain('[data-theme=light]')
  })
})
