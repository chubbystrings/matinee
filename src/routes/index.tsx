import { createFileRoute } from '@tanstack/react-router'
import { Footer } from '#/components/Footer'
import { GenreChips } from '#/components/GenreChips'
import { GameDetailSheet } from '#/components/GameDetailSheet'
import { Header } from '#/components/Header'
import { Hero } from '#/components/Hero'
import { PosterCard } from '#/components/PosterCard'
import { validateLobbySearch } from '#/lib/lobbySearch'
import { GAMES, GAME_BY_ID, GENRES } from '#/games/registry'
import type { GenreFilter } from '#/games/registry'

export const Route = createFileRoute('/')({
  validateSearch: validateLobbySearch,
  component: Lobby,
})

// Static catalog: counts never change, so compute once at module load.
const COUNTS = Object.fromEntries(
  GENRES.map((g) => [g, g === 'All' ? GAMES.length : GAMES.filter((x) => x.genre === g).length]),
) as Record<GenreFilter, number>

function Lobby() {
  const { genre, game } = Route.useSearch()
  const active: GenreFilter = genre ?? 'All'
  const sheetGame = game ? GAME_BY_ID.get(game) : undefined
  const visible = active === 'All' ? GAMES : GAMES.filter((g) => g.genre === active)

  return (
    <>
      <Header />
      <Hero paused={game !== undefined} />
      <main className="mx-auto max-w-[1240px] px-[clamp(16px,4vw,40px)] pb-[72px] pt-[clamp(36px,6vw,64px)]">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-[18px]">
          <div>
            <div className="font-mono text-xs uppercase tracking-[.1em] text-muted">
              {visible.length} {visible.length === 1 ? 'feature' : 'features'}
            </div>
            <h2 className="font-display text-[clamp(26px,3.4vw,38px)] font-semibold">Now showing</h2>
          </div>
          <GenreChips active={active} counts={COUNTS} />
        </div>
        <div
          data-testid="grid"
          className="grid gap-[clamp(14px,2.4vw,28px)] [grid-template-columns:repeat(auto-fill,minmax(150px,1fr))]"
        >
          {visible.map((g) => (
            <PosterCard key={g.id} game={g} />
          ))}
        </div>
      </main>
      <Footer />
      {sheetGame ? <GameDetailSheet key={sheetGame.id} game={sheetGame} /> : null}
    </>
  )
}
