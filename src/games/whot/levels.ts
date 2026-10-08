import type { Level } from './engine'

/** What each level does. Shown on the level picker (with the level name in front) and in How to play. */
export const LEVEL_COPY: Record<Level, string> = {
  Easy: 'CPU plays any legal card.',
  Hard: 'CPU leads with special cards and its longest suit.',
  Expert:
    'CPU counts cards and simulates your hand. No card hints, and a wrong card costs you a draw and your turn.',
}
