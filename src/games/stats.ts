import { formatBest } from './best'
import type { GameMeta, GameStats } from './types'

/** Stat pills shown before a game has reported anything (and after restart). */
export function defaultStats(
  game: GameMeta,
  best: number | undefined,
  whot: { wins: number; streak: number } = { wins: 0, streak: 0 },
): GameStats {
  const bestLabel = 'Best'
  const bestValue = best === undefined ? '—' : formatBest(game, best)
  switch (game.id) {
    case 'snake':
    case 'merge':
      return { primary: { label: 'Score', value: 0 }, secondary: { label: bestLabel, value: best ?? 0 } }
    case 'recall':
      return { primary: { label: 'Moves', value: 0 }, secondary: { label: bestLabel, value: bestValue } }
    case 'noughts':
      return { primary: { label: 'W–L–D', value: '0–0–0' }, secondary: { label: bestLabel, value: bestValue } }
    case 'quickdraw':
      return { primary: { label: 'Last', value: '—' }, secondary: { label: bestLabel, value: bestValue } }
    case 'whot':
      return { primary: { label: 'Wins', value: whot.wins }, secondary: { label: 'Streak', value: whot.streak } }
    case 'popup':
      return { primary: { label: 'Hits', value: 0 }, secondary: { label: 'Time', value: '30s' } }
  }
}
