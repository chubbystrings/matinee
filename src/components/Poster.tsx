import type { GameMeta } from '#/games/types'

type Variant = 'grid' | 'hero' | 'sheet'

const RADIUS: Record<Variant, string> = { grid: 'rounded-poster', hero: 'rounded-poster-lg', sheet: 'rounded-poster' }

function titleSize(title: string, variant: Variant) {
  const long = title.length > 7
  if (variant === 'grid') return long ? '10cqw' : '13cqw'
  return long ? '9.4cqw' : '12cqw'
}

/** Typographic poster. Every size is in cqw so it scales with the card. */
export function Poster({ game, variant = 'grid' }: { game: GameMeta; variant?: Variant }) {
  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden text-on-accent [container-type:inline-size] ${RADIUS[variant]} ${variant === 'hero' ? 'shadow-poster-lg' : 'shadow-poster'}`}
      style={{ backgroundColor: game.color }}
    >
      <div
        aria-hidden
        className="absolute inset-0 grid place-items-center overflow-hidden whitespace-nowrap pb-[18%] font-display font-extrabold leading-[.8]"
        style={{ fontSize: game.glyphSize, color: 'rgba(18,17,23,.2)' }}
      >
        {game.glyph}
      </div>
      <div className="absolute inset-x-[7cqw] top-[6cqw] flex justify-between font-mono text-[5.4cqw] uppercase tracking-[.12em]">
        <span>No. {game.no}</span>
        <span>{game.genre}</span>
      </div>
      <div className="absolute inset-x-[7cqw] bottom-[7cqw]">
        <div
          className="font-display font-extrabold uppercase leading-[.92]"
          style={{ fontSize: titleSize(game.title, variant) }}
        >
          {game.title}
        </div>
        <div className="mt-[4cqw] flex justify-between border-t border-[rgba(18,17,23,.35)] pt-[3.5cqw] font-mono text-[5.4cqw] uppercase tracking-[.08em]">
          <span>{game.players}</span>
          <span>{game.time}</span>
        </div>
      </div>
    </div>
  )
}
