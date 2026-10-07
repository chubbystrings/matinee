import { describe, expect, it } from 'vitest'
import { ACTOR_LABEL, canRevealDrawn, displayText } from './log'
import type { Card, LogEntry } from './engine'

const card = (id: number, s: Card['s'], n: number): Card => ({ id, s, n })
const drew = (
  who: LogEntry['who'],
  drawn: Array<Card>,
  text = `Drew ${drawn.length} (Pick two).`,
): LogEntry => ({
  n: 1,
  who,
  text,
  drawn,
})

describe('hidden information', () => {
  const cards = [card(1, 'circle', 4), card(2, 'star', 7)]

  it('names the cards you drew, always', () => {
    expect(displayText(drew('you', cards), false)).toBe(
      'Drew 2 (Pick two). Circle 4, Star 7.',
    )
    expect(canRevealDrawn({ who: 'you' }, false)).toBe(true)
  })

  it('hides the CPU draws during the game', () => {
    expect(displayText(drew('cpu', cards), false)).toBe('Drew 2 (Pick two).')
    expect(
      displayText(
        drew('cpu', [card(3, 'cross', 2)], 'Drew 1 from the market.'),
        false,
      ),
    ).toBe('Drew 1 from the market.')
  })

  it('reveals the CPU draws once the game is over', () => {
    expect(displayText(drew('cpu', cards), true)).toBe(
      'Drew 2 (Pick two). Circle 4, Star 7.',
    )
  })

  it('leaves entries without drawn cards untouched', () => {
    const play: LogEntry = {
      n: 2,
      who: 'cpu',
      text: 'Played Circle 7 on Circle 3.',
      card: card(4, 'circle', 7),
    }
    expect(displayText(play, false)).toBe(play.text)
    expect(displayText({ n: 3, who: 'sys', text: 'Market empty.' }, true)).toBe(
      'Market empty.',
    )
  })

  it('names WHOT plainly', () => {
    expect(
      displayText(
        drew('you', [card(5, 'whot', 20)], 'Drew 1 from the market.'),
        false,
      ),
    ).toBe('Drew 1 from the market. WHOT.')
  })
})

describe('actor labels', () => {
  it('maps the engine actors to display labels', () => {
    expect(ACTOR_LABEL).toEqual({ you: 'You', cpu: 'CPU', sys: 'Table' })
  })
})
