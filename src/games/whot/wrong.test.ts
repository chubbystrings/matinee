import { describe, expect, it } from 'vitest'
import { drawFromMarket, playCard, playWrongCard } from './engine'
import { real, seeded, table } from './testUtil'

const rng = seeded(1)

const base = () =>
  table({
    hand: [real('square', 7), real('star', 4), real('circle', 7)],
    cpu: [real('cross', 3), real('cross', 5)],
    pile: [real('circle', 3)],
    turn: 'you',
  })

describe('playWrongCard (Expert)', () => {
  it('keeps the card, draws one, passes the turn and flags the card', () => {
    const s = base()
    const wrong = s.hand[0]
    const after = playWrongCard(s, wrong.id)
    expect(after.hand).toHaveLength(4)
    expect(after.hand.map((c) => c.id)).toContain(wrong.id)
    expect(after.deck).toHaveLength(s.deck.length - 1)
    expect(after.pile).toBe(s.pile)
    expect(after.turn).toBe('cpu')
    expect(after.bad).toBe(wrong.id)
    expect(after.known).toEqual([wrong.id])
    expect(after.msg).toBe(
      "Square 7 doesn't match. It goes back to your hand, you draw 1 and the CPU plays.",
    )
  })

  it('logs the attempt (with the card) and the wrong-card draw', () => {
    const after = playWrongCard(base(), base().hand[0].id)
    const [tried, drew] = after.log
    expect(tried).toMatchObject({
      who: 'you',
      text: 'Tried Square 7 on Circle 3. Not a match: card returned.',
    })
    expect(tried.card?.s).toBe('square')
    expect(drew.text).toBe('Drew 1 (wrong card).')
    expect(drew.drawn).toHaveLength(1)
  })

  it('names the called shape in the log when one is asked for', () => {
    const s = { ...base(), req: 'star' as const }
    // Circle 7 matches the number of nothing here but is not a star: wrong under the request
    const after = playWrongCard(s, s.hand[2].id)
    expect(after.log[0].text).toBe(
      'Tried Circle 7 on Circle 3 (asked Star). Not a match: card returned.',
    )
  })

  it('a non-WHOT card that is not the called shape is wrong even if it matches the number', () => {
    const s = { ...base(), req: 'star' as const, pile: [real('circle', 7, [])] }
    expect(playWrongCard(s, s.hand[2].id).bad).toBe(s.hand[2].id)
  })

  it('ignores legal cards, WHOT, unknown ids and the wrong turn', () => {
    const s = base()
    expect(playWrongCard(s, s.hand[2].id)).toBe(s) // Circle 7 on Circle 3 is legal
    expect(playWrongCard(s, 9999)).toBe(s)
    expect(playWrongCard({ ...s, turn: 'cpu' }, s.hand[0].id)).toEqual({
      ...s,
      turn: 'cpu',
    })
    expect(playWrongCard({ ...s, picking: true }, s.hand[0].id).bad).toBeNull()
  })

  it('the market running out ends the game on the count', () => {
    const s = { ...base(), deck: [real('star', 1)] }
    const after = playWrongCard(s, s.hand[0].id)
    expect(after.deck).toHaveLength(0)
    expect(after.over?.reason).toBe('count')
  })

  it('the flag clears on the next transition', () => {
    const wrong = playWrongCard(base(), base().hand[0].id)
    const cpuMoved = playCard(wrong, 'cpu', wrong.cpu[0].id, 'Expert', rng)
    expect(cpuMoved.bad).toBeNull()
    const drew = drawFromMarket(wrong, 'cpu')
    expect(drew.bad).toBeNull()
  })
})

describe('known and voids', () => {
  it('a wrong card adds 1 to every void entry, and reveals the card', () => {
    const s = { ...base(), voids: { circle: 0, whot: 0, star: 2 } }
    const after = playWrongCard(s, s.hand[0].id)
    expect(after.voids).toEqual({ circle: 1, whot: 1, star: 3 })
  })

  it('a voluntary draw zeroes the top shape (or the called one) and WHOT, then the drawn card adds 1', () => {
    const s = base()
    const after = drawFromMarket(s, 'you')
    expect(after.voids).toEqual({ circle: 1, whot: 1 })
    const asked = drawFromMarket({ ...base(), req: 'star' }, 'you')
    expect(asked.voids).toEqual({ star: 1, whot: 1 })
  })

  it('every card you draw from a special adds 1 to every entry', () => {
    const s = {
      ...base(),
      voids: { circle: 0 },
      pile: [real('square', 13)],
      turn: 'cpu' as const,
      cpu: [real('square', 2), real('cross', 3)],
    }
    const after = playCard(s, 'cpu', s.cpu[0].id, 'Expert', rng) // Pick two: you draw 2
    expect(after.voids).toEqual({ circle: 2 })
  })

  it('playing a card of a void shape takes 1 off (min 0) and drops it from known', () => {
    const s = base()
    const circle7 = s.hand[2]
    const withKnown = {
      ...s,
      voids: { circle: 2, star: 0 },
      known: [circle7.id, s.hand[1].id],
    }
    const after = playCard(withKnown, 'you', circle7.id, 'Expert', rng)
    expect(after.voids).toEqual({ circle: 1, star: 0 })
    expect(after.known).toEqual([s.hand[1].id])
    const floored = playCard(
      { ...s, voids: { circle: 0 } },
      'you',
      circle7.id,
      'Expert',
      rng,
    )
    expect(floored.voids).toEqual({ circle: 0 })
  })

  it('the CPU drawing or playing never changes what it may know about you', () => {
    const s = {
      ...base(),
      turn: 'cpu' as const,
      voids: { circle: 1 },
      known: [5],
    }
    const after = playCard(s, 'cpu', s.cpu[0].id, 'Expert', rng)
    expect(after.voids).toEqual({ circle: 1 })
    expect(after.known).toEqual([5])
  })
})
