import { Link } from '@tanstack/react-router'
import { Poster } from '#/components/Poster'
import { preloadGame } from '#/games/registry'
import type { GameMeta } from '#/games/types'

export function PosterCard({ game }: { game: GameMeta }) {
  return (
    <Link
      to="/"
      search={(prev) => ({ ...prev, game: game.id })}
      resetScroll={false}
      onPointerEnter={() => preloadGame(game.id)}
      onFocus={() => preloadGame(game.id)}
      aria-label={`${game.title} — details`}
      data-game={game.id}
      className="flex animate-in flex-col gap-3 transition-transform duration-[250ms] hover:-translate-y-1.5"
    >
      <Poster game={game} variant="grid" />
      <p className="text-sm leading-[1.45] text-muted">{game.tagline}</p>
    </Link>
  )
}
