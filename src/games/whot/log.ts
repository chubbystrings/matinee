import { cardName } from './engine'
import type { LogEntry } from './engine'

export const ACTOR_LABEL = { you: 'You', cpu: 'CPU', sys: 'Table' } as const

/**
 * Hidden information: the cards you draw are always named, the CPU's only once the game is over.
 * The engine records `drawn` for every entry; this is the single place that decides what may be shown.
 */
export const canRevealDrawn = (
  entry: Pick<LogEntry, 'who'>,
  gameOver: boolean,
) => entry.who === 'you' || gameOver

/** The engine's text plus the names of drawn cards when they may be shown: "Drew 2 (Pick two). Circle 4, Star 7." */
export function displayText(entry: LogEntry, gameOver: boolean): string {
  if (!entry.drawn?.length || !canRevealDrawn(entry, gameOver))
    return entry.text
  return `${entry.text} ${entry.drawn.map(cardName).join(', ')}.`
}
