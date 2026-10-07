import { SHAPE_CLIP } from './shapes'
import type { Card, CardShape } from './engine'

type Variant = 'hand' | 'pile' | 'cpu' | 'log'

type VariantSpec = {
  number: string
  /** left inset of the corner number */
  left: string
  shape: string
  /** extra top padding that pushes the centre mark below the corner number */
  shapeTop: string
  whot: string
  /** what a WHOT card shows in the centre */
  whotText: string
  /** repeat the number, rotated, in the bottom-right corner */
  mirror: boolean
}

// Sizes are in cqw: the parent sets `container-type: inline-size`, so a card scales with its width.
const VARIANTS: Record<Variant, VariantSpec> = {
  hand: {
    number: '22cqw',
    left: '8cqw',
    shape: '50cqw',
    shapeTop: '0',
    whot: '19cqw',
    whotText: 'WHOT',
    mirror: true,
  },
  pile: {
    number: '22cqw',
    left: '8cqw',
    shape: '52cqw',
    shapeTop: '0',
    whot: '19cqw',
    whotText: 'WHOT',
    mirror: true,
  },
  cpu: {
    number: '24cqw',
    left: '8cqw',
    shape: '46cqw',
    shapeTop: '16cqw',
    whot: '17cqw',
    whotText: 'WHOT',
    mirror: false,
  },
  // The play log's 24px thumbnail: too small for a mirrored number or the word WHOT.
  log: {
    number: '34cqw',
    left: '10cqw',
    shape: '46cqw',
    shapeTop: '22cqw',
    whot: '40cqw',
    whotText: 'W',
    mirror: false,
  },
}

const NUMBER_CLASS =
  'absolute font-display font-extrabold leading-none tracking-[-.04em]'

/** Ink shape drawn with clip-path. */
export function ShapeMark({ shape, size }: { shape: CardShape; size: string }) {
  return (
    <span
      aria-hidden
      className="block bg-on-accent"
      style={{ width: size, height: size, clipPath: SHAPE_CLIP[shape] }}
    />
  )
}

/** Face of a card. Render inside an element that has a background and `container-type: inline-size`. */
export function CardFace({ card, variant }: { card: Card; variant: Variant }) {
  const v = VARIANTS[variant]
  const isWhot = card.s === 'whot'
  return (
    <>
      <span
        className={`${NUMBER_CLASS} top-[6cqw]`}
        style={{ fontSize: v.number, left: v.left }}
      >
        {card.n}
      </span>
      <span
        className="absolute inset-0 flex items-center justify-center"
        style={{ paddingTop: v.shapeTop }}
      >
        {isWhot ? (
          <span
            className="font-display font-extrabold"
            style={{ fontSize: v.whot }}
          >
            {v.whotText}
          </span>
        ) : (
          <ShapeMark shape={card.s} size={v.shape} />
        )}
      </span>
      {v.mirror ? (
        <span
          className={`${NUMBER_CLASS} right-[8cqw] bottom-[6cqw] rotate-180`}
          style={{ fontSize: v.number }}
        >
          {card.n}
        </span>
      ) : null}
    </>
  )
}
