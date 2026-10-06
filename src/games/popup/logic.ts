export type Rng = () => number

export const HOLES = 9
export const ROUND_SECONDS = 30
export const FIRST_SPAWN_MS = 500
export const HIT_DELAY_MS = 160

/** Time a target stays before the next one appears. */
export function spawnInterval(score: number): number {
  return Math.max(420, 950 - score * 18)
}

/** Random hole in [0, count) that differs from `prev` (-1 for none). */
export function nextHole(prev: number, rng: Rng = Math.random, count = HOLES): number {
  if (prev < 0 || prev >= count) return Math.floor(rng() * count)
  const r = Math.floor(rng() * (count - 1))
  return r >= prev ? r + 1 : r
}
