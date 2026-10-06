import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { isBetter } from '#/games/best'
import { GAME_BY_ID } from '#/games/registry'
import type { GameId, Settings } from '#/games/types'

export const DEFAULT_SETTINGS: Settings = {
  heroAutoRotate: true,
  snakeSpeed: 'Normal',
  cpuLevel: 'Casual',
}

type ScoresState = {
  best: Partial<Record<GameId, number>>
  settings: Settings
  recordBest: (id: GameId, value: number) => boolean
  setSettings: (patch: Partial<Settings>) => void
}

export const useScores = create<ScoresState>()(
  persist(
    (set, get) => ({
      best: {},
      settings: DEFAULT_SETTINGS,
      /** Returns true when `value` is a new best. */
      recordBest: (id, value) => {
        const meta = GAME_BY_ID.get(id)
        if (!meta || !isBetter(meta.bestMode, value, get().best[id])) return false
        set((s) => ({ best: { ...s.best, [id]: value } }))
        return true
      },
      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
    }),
    {
      name: 'matinee.best.v1',
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ best: s.best, settings: s.settings }),
    },
  ),
)
