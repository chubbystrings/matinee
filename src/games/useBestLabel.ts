import { useScores } from '#/store/scores'
import { useWhotStats, formatWhotBest } from '#/store/whot'
import { formatBest } from './best'
import type { GameMeta } from './types'

/** "Your best" for the detail sheet. Whot keeps wins and streaks in its own store. */
export function useBestLabel(game: GameMeta): string {
  const best = useScores((s) => s.best[game.id])
  const whotWins = useWhotStats((s) => s.wins)
  const whotBestStreak = useWhotStats((s) => s.best)
  return game.id === 'whot'
    ? formatWhotBest({ wins: whotWins, best: whotBestStreak })
    : formatBest(game, best)
}
