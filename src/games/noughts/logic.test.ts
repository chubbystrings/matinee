import { describe, expect, it } from 'vitest'
import {
  addResult,
  bestMove,
  cpuMove,
  emptyBoard,
  getOutcome,
  LINES,
  statusText,
  tallyLabel
  
  
} from './logic'
import type {Board, Cell} from './logic';

const b = (s: string): Cell[] => [...s].map((c) => (c === '.' ? '' : (c as Cell)))

describe('getOutcome', () => {
  it('is null on an empty or in-progress board', () => {
    expect(getOutcome(emptyBoard())).toBeNull()
    expect(getOutcome(b('XO.......'))).toBeNull()
  })
  it('detects every winning line for both marks', () => {
    for (const line of LINES) {
      for (const m of ['X', 'O'] as const) {
        const board = emptyBoard()
        for (const i of line) board[i] = m
        expect(getOutcome(board)).toEqual({ winner: m, line })
      }
    }
  })
  it('detects a draw', () => {
    expect(getOutcome(b('XOXXOOOXX'))).toEqual({ winner: 'D', line: [] })
  })
})

describe('cpuMove', () => {
  it('takes the winning move and blocks', () => {
    expect(bestMove(b('OO.XX....'))).toBe(2)
    expect(cpuMove(b('XX.O.....'), 'Perfect')).toBe(2)
  })
  it('Perfect ignores rng', () => {
    expect(cpuMove(b('XX.O.....'), 'Perfect', () => 0)).toBe(2)
  })
  it('Casual plays a random free cell when rng < 0.35', () => {
    const seq = [0.1, 0.99]
    let i = 0
    const rng = () => seq[i++]
    // free cells of 'XX.O.....' = [2,4,5,6,7,8]; 0.99 -> last
    expect(cpuMove(b('XX.O.....'), 'Casual', rng)).toBe(8)
  })
  it('Casual plays minimax when rng >= 0.35', () => {
    expect(cpuMove(b('XX.O.....'), 'Casual', () => 0.9)).toBe(2)
  })
  it('returns -1 on a full board', () => {
    expect(cpuMove(b('XOXXOOOXX'), 'Perfect')).toBe(-1)
  })
  it('Perfect CPU never loses against every possible player line', () => {
    let losses = 0
    let games = 0
    const play = (board: Board, playerTurn: boolean) => {
      const out = getOutcome(board)
      if (out) {
        games++
        if (out.winner === 'X') losses++
        return
      }
      if (playerTurn) {
        board.forEach((v, i) => {
          if (v) return
          const next = [...board]
          next[i] = 'X'
          play(next, false)
        })
      } else {
        const next = [...board]
        next[cpuMove(board, 'Perfect')] = 'O'
        play(next, true)
      }
    }
    play(emptyBoard(), true)
    expect(games).toBeGreaterThan(100)
    expect(losses).toBe(0)
  })
})

describe('tally + status', () => {
  it('adds results', () => {
    let t = { w: 0, l: 0, d: 0 }
    t = addResult(t, 'X')
    t = addResult(t, 'X')
    t = addResult(t, 'O')
    expect(tallyLabel(t)).toBe('2–1–0')
    expect(tallyLabel(addResult(t, 'D'))).toBe('2–1–1')
  })
  it('status copy', () => {
    expect(statusText('X', null)).toBe('Your move')
    expect(statusText('O', null)).toBe('CPU is thinking…')
    expect(statusText('X', 'X')).toBe('You win')
    expect(statusText('X', 'O')).toBe('CPU wins')
    expect(statusText('X', 'D')).toBe('Draw')
  })
})
