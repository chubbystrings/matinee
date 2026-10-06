export const GRID = 20
export const START_BODY: readonly Point[] = [
  { x: 8, y: 10 },
  { x: 7, y: 10 },
  { x: 6, y: 10 },
]
export const START_DIR: Point = { x: 1, y: 0 }
export const SPEED_FLOOR = 55
export const SPEED_STEP = 3

export type Point = { x: number; y: number }
export type SnakeSpeed = 'Chill' | 'Normal' | 'Fast'

const BASE_SPEED: Record<SnakeSpeed, number> = { Chill: 150, Normal: 115, Fast: 80 }

/** Tick interval in ms after `eaten` foods: -3 ms per food, floored at 55. */
export function tickSpeed(setting: SnakeSpeed, eaten: number): number {
  return Math.max(SPEED_FLOOR, BASE_SPEED[setting] - SPEED_STEP * eaten)
}

export function isReverse(dir: Point, next: Point): boolean {
  return dir.x === -next.x && dir.y === -next.y
}

/** Random free cell. `rng` returns [0, 1). Returns null when the board is full. */
export function placeFood(body: readonly Point[], rng: () => number = Math.random, grid = GRID): Point | null {
  const taken = new Set(body.map((p) => p.y * grid + p.x))
  const free: number[] = []
  for (let i = 0; i < grid * grid; i++) if (!taken.has(i)) free.push(i)
  if (free.length === 0) return null
  const i = free[Math.min(free.length - 1, Math.floor(rng() * free.length))]
  return { x: i % grid, y: Math.floor(i / grid) }
}

export type StepResult =
  | { dead: true }
  | { dead: false; body: Point[]; ate: boolean }

/** Advance one tick. Does not mutate `body`. Food relocation is the caller's job when `ate`. */
export function step(body: readonly Point[], dir: Point, food: Point | null, grid = GRID): StepResult {
  const head = { x: body[0].x + dir.x, y: body[0].y + dir.y }
  const hitWall = head.x < 0 || head.y < 0 || head.x >= grid || head.y >= grid
  // The tail cell is vacated this tick, so it is not a collision.
  const hitSelf = body.slice(0, -1).some((b) => b.x === head.x && b.y === head.y)
  if (hitWall || hitSelf) return { dead: true }
  const ate = food !== null && head.x === food.x && head.y === food.y
  const next = [head, ...(ate ? body : body.slice(0, -1))]
  return { dead: false, body: next, ate }
}
