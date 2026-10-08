import type { GameMeta } from '#/games/types'
import { useWhotStats } from '#/store/whot'

type Variant = 'grid' | 'hero' | 'sheet'

const RADIUS: Record<Variant, string> = {
  grid: 'rounded-poster',
  hero: 'rounded-poster-lg',
  sheet: 'rounded-poster',
}

function titleSize(title: string, variant: Variant) {
  const long = title.length > 7
  if (variant === 'grid') return long ? '10cqw' : '13cqw'
  return long ? '9.4cqw' : '12cqw'
}

/** Typographic poster. Every size is in cqw so it scales with the card. */
export function Poster({
  game,
  variant = 'grid',
}: {
  game: GameMeta
  variant?: Variant
}) {
  // Whot only: a badge once you have won on Expert (persists with the stats).
  const expertWins = useWhotStats((s) => s.expertWins)
  const expertBadge = game.id === 'whot' && expertWins > 0
  return (
    <div
      className={`relative aspect-[2/3] w-full overflow-hidden text-on-accent [container-type:inline-size] ${RADIUS[variant]} ${variant === 'hero' ? 'shadow-poster-lg' : 'shadow-poster'}`}
      style={{ backgroundColor: game.color }}
    >
      {/* Decorative watermark: drawn via CSS content so it is not text in the accessibility tree. */}
      <div
        aria-hidden
        data-glyph={game.glyph}
        className="absolute inset-0 grid place-items-center overflow-hidden whitespace-nowrap pb-[18%] font-display font-extrabold leading-[.8] after:content-[attr(data-glyph)]"
        style={{ fontSize: game.glyphSize, color: 'rgba(18,17,23,.2)' }}
      />
      {expertBadge ? (
        <div
          data-testid="poster-expert-badge"
          className="absolute top-[15cqw] right-[7cqw] rounded-pill bg-[#121117] px-[3.4cqw] py-[1.6cqw] font-mono text-[5cqw] uppercase tracking-[.1em] text-[#C8F031]"
        >
          Expert
        </div>
      ) : null}
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
