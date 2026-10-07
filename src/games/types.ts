import type { GAME_IDS } from './ids'

export type GameId = (typeof GAME_IDS)[number]
export type Genre = 'Arcade' | 'Puzzle' | 'Classic' | 'Reflex'

export type GameMeta = {
  id: GameId
  no: string
  title: string
  genre: Genre
  /** poster accent (hex) */
  color: string
  /** poster watermark + size in cqw */
  glyph: string
  glyphSize: string
  time: string
  players: string
  controls: string
  tagline: string
  /** One-line hint shown on the game loader. */
  tip: string
  synopsis: string
  bestMode: 'higher' | 'lower'
  /** e.g. ' ms', ' moves', ' wins' */
  bestUnit?: string
  /** The stage scrolls vertically (tall layouts); other games lock touch scrolling. */
  scrollable?: boolean
}

export type StatValue = { label: string; value: string | number }
export type GameStats = { primary: StatValue; secondary: StatValue }

export type Settings = {
  heroAutoRotate: boolean
  snakeSpeed: 'Chill' | 'Normal' | 'Fast'
  cpuLevel: 'Casual' | 'Perfect'
}

/**
 * Restart is handled by the shell remounting the game via `key`, so there is
 * no `restartSignal` prop (deviation from the handoff contract).
 */
export type GameProps = {
  onStats: (stats: GameStats) => void
  /** Reports a finished round. The store compares with best using bestMode; returns true on a new best. */
  onResult: (score: number) => boolean
  settings: Pick<Settings, 'snakeSpeed' | 'cpuLevel'>
}
