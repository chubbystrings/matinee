import type { GameMeta } from './types'

export function isBetter(mode: GameMeta['bestMode'], next: number, prev: number | undefined) {
  if (prev === undefined) return true
  return mode === 'higher' ? next > prev : next < prev
}

export function formatBest(meta: Pick<GameMeta, 'bestUnit'>, value: number | undefined) {
  return value === undefined ? '—' : `${value}${meta.bestUnit ?? ''}`
}
