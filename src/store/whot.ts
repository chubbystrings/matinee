import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Level, Result } from '#/games/whot/engine'

export type WhotStats = {
  wins: number
  losses: number
  draws: number
  streak: number
  best: number
  /** Wins on the Expert level (also counted in `wins`). */
  expertWins: number
}

export const EMPTY_STATS: WhotStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  best: 0,
  expertWins: 0,
}

/**
 * Win: +1 win and streak, best = max (and +1 expertWins on Expert). Loss: streak resets. Draw: streak is kept.
 * Stats are shared across levels.
 */
export function applyResult(
  stats: WhotStats,
  result: Result,
  expert = false,
): WhotStats {
  if (result === 'win') {
    const streak = stats.streak + 1
    return {
      ...stats,
      wins: stats.wins + 1,
      streak,
      best: Math.max(stats.best, streak),
      expertWins: stats.expertWins + (expert ? 1 : 0),
    }
  }
  if (result === 'loss')
    return { ...stats, losses: stats.losses + 1, streak: 0 }
  return { ...stats, draws: stats.draws + 1 }
}

/** Detail sheet "Your best". */
export const formatWhotBest = (stats: Pick<WhotStats, 'wins' | 'best'>) =>
  stats.wins ? `${stats.wins} wins · best streak ${stats.best}` : '—'

type StatsStore = WhotStats & {
  record: (result: Result, expert?: boolean) => void
}

// Shared across difficulties. Restarting mid-game never calls `record`.
export const useWhotStats = create<StatsStore>()(
  persist(
    (set) => ({
      ...EMPTY_STATS,
      record: (result, expert) => set((s) => applyResult(s, result, expert)),
    }),
    {
      name: 'matinee.whot.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ wins, losses, draws, streak, best, expertWins }) => ({
        wins,
        losses,
        draws,
        streak,
        best,
        expertWins,
      }),
    },
  ),
)

type LevelStore = { level: Level; setLevel: (level: Level) => void }

export const LEVELS: ReadonlyArray<Level> = ['Easy', 'Hard', 'Expert']
const isLevel = (v: unknown): v is Level => LEVELS.some((l) => l === v)

export const useWhotLevel = create<LevelStore>()(
  persist((set) => ({ level: 'Easy', setLevel: (level) => set({ level }) }), {
    name: 'matinee.whot.level',
    version: 1,
    storage: createJSONStorage(() => localStorage),
    partialize: ({ level }) => ({ level }),
    // Accept 'Hard' and 'Expert' on load; anything else falls back to Easy.
    merge: (persisted, current) => {
      const level = (persisted as { level?: unknown } | null)?.level
      return { ...current, level: isLevel(level) ? level : current.level }
    },
  }),
)
