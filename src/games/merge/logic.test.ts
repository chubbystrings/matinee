import { describe, expect, it } from 'vitest'
import { addTile, canMove, freshGrid, move, slideRow, tileStyle } from './logic'

const z = () => Array<number>(16).fill(0)

describe('slideRow', () => {
  it('merges each tile once', () => {
    expect(slideRow([2, 2, 2, 2])).toEqual({ row: [4, 4, 0, 0], gained: 8, made2048: false })
    expect(slideRow([2, 2, 4, 0])).toEqual({ row: [4, 4, 0, 0], gained: 4, made2048: false })
    expect(slideRow([4, 2, 2, 0]).row).toEqual([4, 4, 0, 0])
    expect(slideRow([2, 2, 2, 0]).row).toEqual([4, 2, 0, 0])
  })
  it('slides gaps and leaves non-matching', () => {
    expect(slideRow([0, 2, 0, 4]).row).toEqual([2, 4, 0, 0])
    expect(slideRow([2, 4, 2, 4])).toEqual({ row: [2, 4, 2, 4], gained: 0, made2048: false })
  })
})

describe('move', () => {
  const g = z()
  g[0] = 2; g[3] = 2; g[12] = 4
  it('left', () => {
    const r = move(g, 'left')
    expect(r.grid.slice(0, 4)).toEqual([4, 0, 0, 0])
    expect(r.grid[12]).toBe(4)
    expect(r.gained).toBe(4)
    expect(r.moved).toBe(true)
  })
  it('right', () => {
    const r = move(g, 'right')
    expect(r.grid.slice(0, 4)).toEqual([0, 0, 0, 4])
    expect(r.grid[15]).toBe(4)
  })
  it('up', () => {
    const r = move(g, 'up')
    expect(r.grid[0]).toBe(2)
    expect(r.grid[3]).toBe(2)
    expect(r.grid[4]).toBe(4)
    expect(r.grid[12]).toBe(0)
  })
  it('down', () => {
    const r = move(g, 'down')
    expect(r.grid[12]).toBe(4)
    expect(r.grid[15]).toBe(2)
    expect(r.grid[8]).toBe(2)
    expect(r.grid[0]).toBe(0)
  })
  it('merges vertically', () => {
    const v = z()
    v[0] = 2; v[4] = 2; v[8] = 2; v[12] = 2
    const r = move(v, 'up')
    expect([r.grid[0], r.grid[4], r.grid[8], r.grid[12]]).toEqual([4, 4, 0, 0])
  })
  it('reports not moved and does not mutate', () => {
    const h = z()
    h[0] = 2
    const copy = h.slice()
    const r = move(h, 'left')
    expect(r.moved).toBe(false)
    expect(r.gained).toBe(0)
    expect(h).toEqual(copy)
  })
  it('detects 2048 creation', () => {
    const w = z()
    w[0] = 1024; w[1] = 1024
    expect(move(w, 'left').reached2048).toBe(true)
    const s = z()
    s[0] = 2048
    expect(move(s, 'right').reached2048).toBe(false)
  })
})

describe('canMove', () => {
  const full = [2, 4, 2, 4, 4, 2, 4, 2, 2, 4, 2, 4, 4, 2, 4, 2]
  it('false on a dead board', () => expect(canMove(full)).toBe(false))
  it('true with empty cell', () => expect(canMove(full.map((v, i) => (i === 5 ? 0 : v)))).toBe(true))
  it('true with horizontal pair', () => expect(canMove(full.map((v, i) => (i === 1 ? 2 : v)))).toBe(true))
  it('true with vertical pair', () => expect(canMove(full.map((v, i) => (i === 12 ? 2 : v)))).toBe(true))
  it('does not wrap rows', () => {
    const w = full.slice(); w[3] = 7; w[4] = 7
    expect(canMove(w)).toBe(false)
  })
})

describe('addTile', () => {
  it('spawns 2 below 0.9 and 4 at/above', () => {
    const seq = (a: number, b: number) => { const q = [a, b]; return () => q.shift() ?? 0 }
    expect(addTile(z(), seq(0, 0.89))[0]).toBe(2)
    expect(addTile(z(), seq(0, 0.9))[0]).toBe(4)
  })
  it('picks only empty cells', () => {
    const g = Array<number>(16).fill(2); g[7] = 0
    expect(addTile(g, () => 0.5)[7]).toBe(2)
    expect(addTile(g, () => 0.5).filter((v) => v === 2)).toHaveLength(16)
  })
  it('no-op on full board and does not mutate', () => {
    const g = Array<number>(16).fill(2)
    expect(addTile(g)).toEqual(g)
  })
  it('freshGrid has two tiles', () => {
    expect(freshGrid().filter(Boolean)).toHaveLength(2)
  })
})

describe('tileStyle', () => {
  it('sizes and glow', () => {
    expect(tileStyle(64).fs).toBe('9cqw')
    expect(tileStyle(128).fs).toBe('7.4cqw')
    expect(tileStyle(2048).fs).toBe('5.6cqw')
    expect(tileStyle(64).glow).toBe('none')
    expect(tileStyle(128).glow).toBe('0 0 24px #FFC23D66')
    expect(tileStyle(4096).bg).toBe('#F4F2F7')
    expect(tileStyle(2).bg).toBe('var(--mt-tile2)')
  })
})
