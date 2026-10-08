import { Link } from '@tanstack/react-router'
import { IconButton } from '#/components/Button'
import { StatPill } from '#/components/StatPill'
import type { GameMeta, GameStats } from '#/games/types'
import { useHelp } from '#/store/help'

export function PlayTopBar({
  game,
  stats,
  onRestart,
}: {
  game: GameMeta
  stats: GameStats
  onRestart: () => void
}) {
  return (
    <div className="flex items-center gap-1.5 border-b border-ink-hair sm:gap-2.5 px-[clamp(12px,3vw,28px)] py-2.5">
      <Link
        to="/"
        className="inline-flex h-10 shrink-0 items-center rounded-pill border border-ink-500 px-3 text-sm font-medium sm:px-4 hover:border-paper"
      >
        ← Lobby
      </Link>
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-2.5">
        <span
          aria-hidden
          className="size-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: game.color, boxShadow: `0 0 12px ${game.color}` }}
        />
        <h1 className="truncate font-display text-[15px] font-semibold uppercase">{game.title}</h1>
      </div>
      <StatPill label={stats.primary.label} value={stats.primary.value} />
      <StatPill label={stats.secondary.label} value={stats.secondary.value} accent={game.color} />
      <IconButton
        aria-label="How to play"
        title="How to play (?)"
        onClick={() => useHelp.getState().open(game.id)}
        className="font-display text-base font-semibold"
      >
        ?
      </IconButton>
      <IconButton aria-label="Restart" onClick={onRestart}>
        ↻
      </IconButton>
    </div>
  )
}
