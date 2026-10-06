import type { CardShape } from './engine'

/** Shape colours are identical in dark and light. */
export const SHAPE_COLOR: Record<CardShape, string> = {
  circle: '#FF7A5C',
  triangle: '#3FD0E0',
  cross: '#A98BFF',
  square: '#C8F031',
  star: '#FFC23D',
  whot: '#FF6FB5',
}

export const SHAPE_CLIP: Record<CardShape, string> = {
  circle: 'circle(48% at 50% 50%)',
  triangle: 'polygon(50% 4%,98% 92%,2% 92%)',
  cross:
    'polygon(34% 0,66% 0,66% 34%,100% 34%,100% 66%,66% 66%,66% 100%,34% 100%,34% 66%,0 66%,0 34%,34% 34%)',
  square: 'inset(8%)',
  star: 'polygon(50% 0%,61% 35%,98% 35%,68% 57%,79% 91%,50% 70%,21% 91%,32% 57%,2% 35%,39% 35%)',
  whot: 'none',
}

/** Card back: the marquee-bulb dot pattern (the market uses wider spacing). */
export const CARD_BACK_BG =
  'radial-gradient(circle, rgba(255,194,61,.5) 0 1px, transparent 1.6px) 0 0/6px 6px, var(--mt-cardback)'
export const MARKET_BACK_BG =
  'radial-gradient(circle, rgba(255,194,61,.5) 0 1.3px, transparent 2px) 0 0/9px 9px, var(--mt-cardback)'
