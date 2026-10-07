import { lazy } from 'react'
import type { ComponentType } from 'react'
import type { GameId, GameMeta, GameProps } from './types'

export const GAMES: ReadonlyArray<GameMeta> = [
  { id: 'snake', no: '01', title: 'Serpent', genre: 'Arcade', color: '#C8F031', glyph: 'S', glyphSize: '120cqw', time: '2–5 min', players: '1 Player', controls: 'Arrows · Swipe · D-pad',
    tip: 'Hug the edges early. The middle gets crowded as you grow.',
    tagline: 'Eat, grow, and keep clear of your own tail.',
    synopsis: 'A serpent, a dark grid and an appetite that only grows. Steer with the arrow keys or swipe, eat the coral dots, and avoid the walls and your own tail. Every bite makes you longer and a little faster.',
    bestMode: 'higher' },
  { id: 'merge', no: '02', title: 'Merge', genre: 'Puzzle', color: '#FF7A5C', glyph: '2048', glyphSize: '30cqw', time: '5–10 min', players: '1 Player', controls: 'Arrows · Swipe',
    tip: 'Keep your biggest tile in one corner and build toward it.',
    tagline: 'Slide tiles, combine numbers, reach 2048.',
    synopsis: 'Slide every tile on a 4×4 board at once. Two matching tiles merge into their sum. Keep the board open long enough to build a 2048 tile.',
    bestMode: 'higher' },
  { id: 'recall', no: '03', title: 'Recall', genre: 'Puzzle', color: '#3FD0E0', glyph: '◆', glyphSize: '100cqw', time: '2 min', players: '1 Player', controls: 'Tap · Click',
    tip: 'Flip the corners first. They are easier to remember.',
    tagline: 'Sixteen cards, eight pairs, one memory.',
    synopsis: 'Flip two cards at a time and remember where every symbol sits. Clear all eight pairs in as few moves as you can.',
    bestMode: 'lower', bestUnit: ' moves' },
  { id: 'noughts', no: '04', title: 'Noughts', genre: 'Classic', color: '#A98BFF', glyph: 'X', glyphSize: '120cqw', time: '1 min', players: 'You vs CPU', controls: 'Tap · Click',
    tip: 'Take the centre on your first move when you can.',
    tagline: 'Three in a row against a CPU that never blinks.',
    synopsis: 'The classic grid game. You play X and always move first. Line up three before the CPU does, then go again and build your tally.',
    bestMode: 'higher', bestUnit: ' wins' },
  { id: 'quickdraw', no: '05', title: 'Quickdraw', genre: 'Reflex', color: '#FFC23D', glyph: '!', glyphSize: '130cqw', time: '30 sec', players: '1 Player', controls: 'Tap · Space',
    tip: 'Tapping before lime voids the round. Wait for the colour, not the rhythm.',
    tagline: 'Wait for lime. Then tap faster than anyone.',
    synopsis: 'Wait for the panel to turn lime, then tap as fast as you can. Tap early and the round is void. Your reaction is measured in milliseconds.',
    bestMode: 'lower', bestUnit: ' ms' },
  { id: 'popup', no: '06', title: 'Pop-Up', genre: 'Reflex', color: '#FF6FB5', glyph: '●', glyphSize: '100cqw', time: '30 sec', players: '1 Player', controls: 'Tap · Click',
    tip: 'Targets speed up as you score. Keep your eyes on the centre hole.',
    tagline: 'Thirty seconds. Nine holes. Hit everything.',
    synopsis: 'Targets pop out of nine holes. Hit as many as you can in thirty seconds. The better you do, the faster they come.',
    bestMode: 'higher', bestUnit: ' hits' },
  { id: 'whot', no: '07', title: 'Whot', genre: 'Classic', color: '#FFC23D', glyph: 'W', glyphSize: '110cqw', time: '5–10 min', players: 'You vs CPU', controls: 'Tap a card · Tap market to draw',
    tip: 'WHOT counts 20 at the count. Play it before the market runs out.',
    tagline: 'Match shape or number. Empty your hand first.',
    synopsis: 'The Nigerian card game. Match the top card by shape or number, use Hold On, Pick Two and WHOT to control the table, and empty your hand before the CPU does. If the market runs out, the lowest hand total wins.',
    // Wins and streaks live in the Whot store (matinee.whot.v1), not the shared best-score store.
    bestMode: 'higher', bestUnit: ' wins', scrollable: true },
]

export const GAME_BY_ID: ReadonlyMap<GameId, GameMeta> = new Map(GAMES.map((g) => [g.id, g]))

export const GENRES = ['All', 'Arcade', 'Puzzle', 'Classic', 'Reflex'] as const
export type GenreFilter = (typeof GENRES)[number]

export function isGameId(id: string): id is GameId {
  return GAME_BY_ID.has(id as GameId)
}

type Loader = () => Promise<{ default: ComponentType<GameProps> }>

// Each game is its own chunk so the lobby bundle stays small.
const LOADERS: Record<GameId, Loader> = {
  snake: () => import('./serpent/Serpent'),
  merge: () => import('./merge/Merge'),
  recall: () => import('./recall/Recall'),
  noughts: () => import('./noughts/Noughts'),
  quickdraw: () => import('./quickdraw/Quickdraw'),
  popup: () => import('./popup/PopUp'),
  whot: () => import('./whot/Whot'),
}

export const GAME_COMPONENTS = Object.fromEntries(
  (Object.keys(LOADERS) as Array<GameId>).map((id) => [id, lazy(LOADERS[id])]),
) as Record<GameId, React.LazyExoticComponent<ComponentType<GameProps>>>

/** Warm the chunk on hover/focus/intent. */
export function preloadGame(id: GameId) {
  void LOADERS[id]()
}
