import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import type { Level, Result } from '#/games/whot/engine'

export type WhotStats = {
  wins: number
  losses: number
  draws: number
  streak: number
  best: number
}

export const EMPTY_STATS: WhotStats = {
  wins: 0,
  losses: 0,
  draws: 0,
  streak: 0,
  best: 0,
}

/** Win: +1 win and streak, best = max. Loss: streak resets. Draw: streak is kept. */
export function applyResult(stats: WhotStats, result: Result): WhotStats {
  if (result === 'win') {
    const streak = stats.streak + 1
    return {
      ...stats,
      wins: stats.wins + 1,
      streak,
      best: Math.max(stats.best, streak),
    }
  }
  if (result === 'loss')
    return { ...stats, losses: stats.losses + 1, streak: 0 }
  return { ...stats, draws: stats.draws + 1 }
}

/** Detail sheet "Your best". */
export const formatWhotBest = (stats: Pick<WhotStats, 'wins' | 'best'>) =>
  stats.wins ? `${stats.wins} wins · best streak ${stats.best}` : '—'

type StatsStore = WhotStats & { record: (result: Result) => void }

// Shared across difficulties. Restarting mid-game never calls `record`.
export const useWhotStats = create<StatsStore>()(
  persist(
    (set) => ({
      ...EMPTY_STATS,
      record: (result) => set((s) => applyResult(s, result)),
    }),
    {
      name: 'matinee.whot.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: ({ wins, losses, draws, streak, best }) => ({
        wins,
        losses,
        draws,
        streak,
        best,
      }),
    },
  ),
)

type LevelStore = { level: Level; setLevel: (level: Level) => void }

export const useWhotLevel = create<LevelStore>()(
  persist((set) => ({ level: 'Easy', setLevel: (level) => set({ level }) }), {
    name: 'matinee.whot.level',
    version: 1,
    storage: createJSONStorage(() => localStorage),
    partialize: ({ level }) => ({ level }),
  }),
)
