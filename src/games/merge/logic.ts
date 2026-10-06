import type { Dir } from '#/hooks/useKeyDirection'

export const SIZE = 4
export type Grid = readonly number[]
export type Rng = () => number

export type MoveResult = { grid: number[]; gained: number; moved: boolean; reached2048: boolean }

/** Slide a line toward index 0; each tile merges at most once. */
export function slideRow(row: readonly number[]): { row: number[]; gained: number; made2048: boolean } {
  const tiles = row.filter((v) => v)
  const out: number[] = []
  let gained = 0
  let made2048 = false
  for (let k = 0; k < tiles.length; k++) {
    if (tiles[k] === tiles[k + 1]) {
      const merged = tiles[k] * 2
      out.push(merged)
      gained += merged
      if (merged === 2048) made2048 = true
      k++
    } else {
      out.push(tiles[k])
    }
  }
  while (out.length < SIZE) out.push(0)
  return { row: out, gained, made2048 }
}

function lineIndices(dir: Dir, i: number): number[] {
  return [0, 1, 2, 3].map((k) =>
    dir === 'left' ? i * 4 + k : dir === 'right' ? i * 4 + (3 - k) : dir === 'up' ? k * 4 + i : (3 - k) * 4 + i,
  )
}

export function move(grid: Grid, dir: Dir): MoveResult {
  const next = grid.slice()
  let moved = false
  let gained = 0
  let reached2048 = false
  for (let i = 0; i < SIZE; i++) {
    const idx = lineIndices(dir, i)
    const { row, gained: g, made2048 } = slideRow(idx.map((j) => grid[j]))
    gained += g
    if (made2048) reached2048 = true
    idx.forEach((j, k) => {
      if (next[j] !== row[k]) moved = true
      next[j] = row[k]
    })
  }
  return { grid: next, gained, moved, reached2048 }
}

export function canMove(grid: Grid): boolean {
  for (let i = 0; i < 16; i++) {
    if (!grid[i]) return true
    if (i % 4 < 3 && grid[i] === grid[i + 1]) return true
    if (i < 12 && grid[i] === grid[i + 4]) return true
  }
  return false
}

/** Returns a new grid with a 2 (90%) or 4 (10%) in a random empty cell. */
export function addTile(grid: Grid, rng: Rng = Math.random): number[] {
  const next = grid.slice()
  const empty: number[] = []
  next.forEach((v, i) => {
    if (!v) empty.push(i)
  })
  if (empty.length) next[empty[Math.floor(rng() * empty.length)]] = rng() < 0.9 ? 2 : 4
  return next
}

export function freshGrid(rng: Rng = Math.random): number[] {
  return addTile(addTile(Array<number>(16).fill(0), rng), rng)
}

const ACCENT: Record<number, string> = {
  8: '#A98BFF', 16: '#3FD0E0', 32: '#FF6FB5', 64: '#FF7A5C',
  128: '#FFC23D', 256: '#FFC23D', 512: '#C8F031', 1024: '#C8F031',
}

export function tileStyle(v: number): { bg: string; fg: string; fs: string; glow: string } {
  const base = v === 0 ? 'var(--mt-raised)' : v === 2 ? 'var(--mt-tile2)' : v === 4 ? 'var(--mt-tile4)' : (ACCENT[v] ?? '#F4F2F7')
  const fg = v <= 4 ? 'var(--mt-text)' : '#121117'
  const len = String(v).length
  return {
    bg: base,
    fg,
    fs: len <= 2 ? '9cqw' : len === 3 ? '7.4cqw' : '5.6cqw',
    glow: v >= 128 ? `0 0 24px ${base}66` : 'none',
  }
}
