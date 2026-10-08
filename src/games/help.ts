import type { CardShape } from './whot/engine'
import type { GameId } from './types'

/** Keys are shown as caps on the Controls tab; the right-hand text is the action. */
export type HelpControl = readonly [keys: ReadonlyArray<string>, action: string]

export type GameHelp = {
  goal: string
  rules: ReadonlyArray<string>
  controls: ReadonlyArray<HelpControl>
  /** Extra tips: the game's loader tip always comes first. */
  tips: ReadonlyArray<string>
}

export const HELP: Record<GameId, GameHelp> = {
  snake: {
    goal: 'Eat as many dots as you can without crashing.',
    rules: [
      'The serpent waits at the start. Press any direction to set it moving.',
      'Steer onto the coral dot to eat it. Each dot scores 1 and makes you one segment longer.',
      'Every bite makes the serpent a little faster.',
      'You can turn left or right, but not straight back into yourself.',
      'Hitting a wall or your own body ends the run. Your best score is saved.',
    ],
    controls: [
      [['↑', '↓', '←', '→'], 'Steer'],
      [['W', 'A', 'S', 'D'], 'Steer'],
      [['Swipe'], 'Steer on a touch screen'],
      [['D-pad'], 'On-screen buttons under the board'],
    ],
    tips: [
      'Turn a beat early. The serpent moves one square per step, so plan corners ahead.',
      'Leave yourself a way out before you follow a dot into a corner.',
    ],
  },
  merge: {
    goal: 'Combine matching tiles until you build a 2048 tile.',
    rules: [
      'Each move slides every tile as far as it can go in that direction.',
      'Two tiles with the same number that collide merge into one tile showing their sum.',
      'A tile can only merge once per move.',
      'After every move, a new 2 (sometimes a 4) appears in an empty square.',
      "Every merge adds the new tile's value to your score.",
      'The game ends when the board is full and no merges are left. Reach 2048 and you can keep going.',
    ],
    controls: [
      [['↑', '↓', '←', '→'], 'Slide all tiles'],
      [['W', 'A', 'S', 'D'], 'Slide all tiles'],
      [['Swipe'], 'Slide on a touch screen'],
    ],
    tips: [
      'Stick to two directions. Use a third only when you have to.',
      'Fill the row next to your corner tile so it never has to move.',
    ],
  },
  recall: {
    goal: 'Find all eight pairs in as few moves as you can.',
    rules: [
      'Sixteen face-down cards hide eight pairs of symbols.',
      'Flip two cards. That counts as one move.',
      'If the symbols match, both cards stay face up.',
      "If they don't, both flip back after a moment.",
      'The game ends when every pair is found. Your best is your lowest move count.',
    ],
    controls: [[['Tap', 'Click'], 'Flip a card']],
    tips: [
      'Match by symbol, not colour. Some symbols share a colour.',
      'Flip an unknown card first. Only go for a pair once you have seen its partner.',
    ],
  },
  noughts: {
    goal: "Get three X's in a row before the CPU gets three O's.",
    rules: [
      'You play X and always move first.',
      'Take turns placing a mark in an empty square.',
      'Three in a row across, down or diagonally wins.',
      'If the board fills with no line, the round is a draw.',
      'Press Next round to play again. Your win–loss–draw tally carries over.',
    ],
    controls: [
      [['Tap', 'Click'], 'Place an X'],
      [['Next round'], 'Start the next round'],
    ],
    tips: [
      'If the CPU takes the centre, take a corner.',
      'Set up two lines at once. The CPU can only block one.',
    ],
  },
  quickdraw: {
    goal: 'Tap the moment the panel turns lime.',
    rules: [
      'Tap the panel to arm a round.',
      'Wait. The panel turns lime after a random delay of 1 to 4 seconds.',
      'Tap as soon as it turns lime. Your reaction time is shown in milliseconds.',
      'Tap before lime and the round is void.',
      'Your last five times are listed under the panel. Your best is your fastest.',
    ],
    controls: [
      [['Tap', 'Click'], 'Arm the round, then react'],
      [['Space', 'Enter'], 'Same as tapping'],
    ],
    tips: [
      'Rest your finger on the key or screen so the tap is as short as possible.',
    ],
  },
  popup: {
    goal: 'Hit as many targets as you can in 30 seconds.',
    rules: [
      'Press Start and the 30-second timer begins.',
      'One target pops up at a time, in one of nine holes.',
      'Hit it before it moves to another hole. Each hit scores 1.',
      'Misses cost nothing.',
      'The more you hit, the faster the targets move. Your best is your highest score.',
    ],
    controls: [
      [['Start'], 'Begin the 30-second round'],
      [['Tap', 'Click'], 'Hit a target'],
    ],
    tips: ['Misses are free, so tap fast rather than carefully.'],
  },
  whot: {
    goal: 'Be the first to empty your hand. If the market runs out first, the lowest hand total wins.',
    rules: [
      'You and the CPU are dealt 4 cards each. One more card starts the pile, and a random player goes first.',
      "On your turn, play a card that matches the top card's shape or number.",
      "If you can't, or would rather not, tap the market to draw one card. That ends your turn.",
      'WHOT matches anything. After you play it, call the shape the next card must be.',
      'A special card as the starter affects whoever goes first.',
      'When the market runs out, both hands are totalled and the lower total wins. WHOT counts 20.',
    ],
    controls: [
      [['Tap a card'], 'Play it'],
      [['Tap market'], 'Draw one card and end your turn'],
      [['Tap a shape'], 'Call a shape after WHOT'],
      [['Log'], 'See every move this game'],
    ],
    tips: [
      'Save Pick Two and Pick Three for when the CPU is down to its last cards.',
      'Before you call a shape, count which one you hold the most of.',
      'On Expert, check shape and number before you tap. A wrong card costs you a draw and your turn.',
    ],
  },
}

/** Every game's Controls tab ends with these. */
export const HELP_KEYS: ReadonlyArray<HelpControl> = [
  [['↻'], 'Restart'],
  [['?'], 'Open or close this sheet'],
  [['Esc'], 'Close this sheet, then back to the lobby'],
]

export type HelpSpecial = {
  n: number
  s: CardShape
  t: string
  d: string
}

export const HELP_SPECIALS: ReadonlyArray<HelpSpecial> = [
  { n: 1, s: 'circle', t: 'Hold on', d: 'Play again straight away.' },
  {
    n: 2,
    s: 'triangle',
    t: 'Pick two',
    d: 'The other player draws 2. You play again.',
  },
  {
    n: 5,
    s: 'cross',
    t: 'Pick three',
    d: 'The other player draws 3. You play again.',
  },
  {
    n: 8,
    s: 'star',
    t: 'Suspension',
    d: 'The other player misses their turn. You play again.',
  },
  {
    n: 14,
    s: 'square',
    t: 'General market',
    d: 'The other player draws 1. You play again.',
  },
  {
    n: 20,
    s: 'whot',
    t: 'WHOT',
    d: 'Matches any card. Call the shape the next card must be.',
  },
]
