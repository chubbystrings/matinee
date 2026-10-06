import type { Card, CardShape } from './engine'
import { SHAPE_CLIP } from './shapes'

type Variant = 'hand' | 'pile' | 'cpu'

// Sizes are in cqw: the parent sets `container-type: inline-size`, so a card scales with its width.
const VARIANTS: Record<
  Variant,
  {
    number: string
    shape: string
    whot: string
    mirror: boolean
    shapeTop: string
  }
> = {
  hand: {
    number: '22cqw',
    shape: '50cqw',
    whot: '19cqw',
    mirror: true,
    shapeTop: '0',
  },
  pile: {
    number: '22cqw',
    shape: '52cqw',
    whot: '19cqw',
    mirror: true,
    shapeTop: '0',
  },
  cpu: {
    number: '24cqw',
    shape: '46cqw',
    whot: '17cqw',
    mirror: false,
    shapeTop: '16cqw',
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
        className={`${NUMBER_CLASS} left-[8cqw] top-[6cqw]`}
        style={{ fontSize: v.number }}
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
            WHOT
          </span>
        ) : (
          <ShapeMark shape={card.s} size={v.shape} />
        )}
      </span>
      {v.mirror ? (
        <span
          className={`${NUMBER_CLASS} bottom-[6cqw] right-[8cqw] rotate-180`}
          style={{ fontSize: v.number }}
        >
          {card.n}
        </span>
      ) : null}
    </>
  )
}
