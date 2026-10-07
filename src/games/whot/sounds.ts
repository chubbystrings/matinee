import type { SoundName } from '#/lib/sound'
import type { WhotState } from './engine'
import { specialEffect } from './rules'

const WHOT_NUMBER = 20

/**
 * Which sounds one state transition makes, in play order. Diffed at the commit point so the rules
 * engine stays silent. Game over wins: only the result sound, nothing else from that commit.
 */
export function whotSounds(a: WhotState, b: WhotState): Array<SoundName> {
  if (b.over && !a.over)
    return [
      b.over.result === 'win'
        ? 'win'
        : b.over.result === 'loss'
          ? 'lose'
          : 'tie',
    ]
  const q: Array<SoundName> = []
  const top = b.pile[b.pile.length - 1]
  if (
    b.pile.length > a.pile.length &&
    (top.n === WHOT_NUMBER || specialEffect(b.rules, top.n))
  )
    q.push('special')
  if (b.hand.length > a.hand.length || b.cpu.length > a.cpu.length)
    q.push('draw')
  if (
    (b.hand.length === 1 && a.hand.length !== 1) ||
    (b.cpu.length === 1 && a.cpu.length !== 1)
  )
    q.push('last')
  if (b.deck.length < a.deck.length && b.deck.length <= 5) q.push('low')
  return q
}
