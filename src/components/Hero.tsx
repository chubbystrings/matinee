import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { Poster } from '#/components/Poster'
import { GAMES, preloadGame } from '#/games/registry'
import { useDaypart } from '#/hooks/useDaypart'
import { useInterval } from '#/hooks/useInterval'
import { usePageVisible } from '#/hooks/usePageVisible'
import { featureLabel } from '#/lib/daypart'
import { useScores } from '#/store/scores'

const BULBS = (
  <div
    aria-hidden
    className="h-2.5 opacity-55"
    style={{
      backgroundImage:
        'radial-gradient(circle, #FFC23D 0 2px, transparent 3px)',
      backgroundSize: '18px 10px',
    }}
  />
)

const META_PILL =
  'rounded-pill border border-ink-600 px-3 py-1.5 font-mono text-xs uppercase'

export function Hero({ paused }: { paused: boolean }) {
  const [featIdx, setFeatIdx] = useState(0)
  const autoRotate = useScores((s) => s.settings.heroAutoRotate)
  const visible = usePageVisible()
  const daypart = useDaypart()

  useInterval(
    () => setFeatIdx((i) => (i + 1) % GAMES.length),
    autoRotate && !paused && visible ? 7000 : null,
  )

  const game = GAMES[featIdx]
  const next = GAMES[(featIdx + 1) % GAMES.length]
  const longTitle = game.title.length > 7

  return (
    <section
      className="relative overflow-hidden border-b border-ink-hair"
      style={{ '--accent': game.color } as React.CSSProperties}
    >
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background: `radial-gradient(55% 75% at 78% 50%, ${game.color}26 0%, transparent 70%)`,
        }}
      />
      <div className="relative">{BULBS}</div>
      <div className="relative mx-auto flex max-w-[1240px] flex-wrap items-center gap-[clamp(36px,6vw,72px)] px-[clamp(16px,4vw,40px)] py-[clamp(36px,7vw,84px)]">
        <div className="flex flex-[1_1_360px] flex-col gap-[22px]">
          <div className="flex items-center gap-2.5 font-mono text-xs uppercase tracking-[.14em] text-muted">
            <span className="size-2 rounded-full bg-lime shadow-[0_0_10px_#C8F031]" />
            {featureLabel(daypart)} · No. {game.no}
          </div>
          <h1
            key={game.id}
            data-testid="hero-title"
            className={`animate-in font-display font-extrabold uppercase leading-[.9] tracking-[-.02em] text-(--accent) light:text-on-accent ${
              longTitle
                ? 'text-[clamp(34px,5.6vw,76px)]'
                : 'text-[clamp(40px,7.4vw,96px)]'
            }`}
          >
            {game.title}
          </h1>
          <p className="max-w-[46ch] text-[clamp(17px,1.5vw,19px)] leading-[1.55] text-text-2 [text-wrap:pretty]">
            {game.synopsis}
          </p>
          <div className="flex flex-wrap gap-2">
            <span className={META_PILL}>{game.genre}</span>
            <span className={META_PILL}>{game.time}</span>
            <span className={META_PILL}>{game.players}</span>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/play/$gameId"
              params={{ gameId: game.id }}
              onPointerEnter={() => preloadGame(game.id)}
              className="inline-flex h-[52px] items-center justify-center gap-2.5 rounded-pill bg-lime px-[26px] font-display text-[13px] font-semibold uppercase tracking-[.06em] text-on-accent hover:bg-lime-hover hover:shadow-cta"
            >
              <span
                aria-hidden
                className="border-y-[6px] border-l-[10px] border-y-transparent border-l-current"
              />
              Play now
            </Link>
            <Link
              to="/"
              search={(prev) => ({ ...prev, game: game.id })}
              resetScroll={false}
              className="inline-flex h-[52px] items-center justify-center rounded-pill border border-ink-500 px-[26px] font-display text-[13px] font-semibold uppercase tracking-[.06em] hover:border-paper"
            >
              Details
            </Link>
          </div>
          <div className="-ml-2 flex" role="group" aria-label="Choose feature">
            {GAMES.map((g, i) => (
              <button
                key={g.id}
                type="button"
                aria-label={`Show ${g.title}`}
                aria-pressed={i === featIdx}
                onClick={() => setFeatIdx(i)}
                // 24px-tall hit area around the 8px dot (WCAG 2.2 target size); the dot itself is the span.
                className="group flex h-6 cursor-pointer items-center px-2"
              >
                <span
                  className={`block h-2 rounded-lg transition-[width,background-color] duration-300 ${
                    i === featIdx
                      ? 'w-7 bg-paper'
                      : 'w-2 bg-ink-500 group-hover:bg-muted'
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
        <div className="relative w-[min(330px,74vw)] flex-[0_1_330px]">
          <div
            aria-hidden
            className="absolute inset-0 aspect-[2/3] translate-x-[14%] translate-y-[3%] rotate-[7deg] rounded-poster-lg opacity-45"
            style={{ backgroundColor: next.color }}
          />
          <Link
            key={game.id}
            to="/"
            search={(prev) => ({ ...prev, game: game.id })}
            resetScroll={false}
            aria-label={`${game.title} — details`}
            className="relative block -rotate-3 animate-in"
          >
            <Poster game={game} variant="hero" />
          </Link>
        </div>
      </div>
    </section>
  )
}
